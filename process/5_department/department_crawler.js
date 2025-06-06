require("module-alias/register");

const path = require("path");
const { logger } = require("@root/utils/logger");
const { crawlWebPage, downloadFile } = require("@root/utils/process/crawler");
const { readFileSafe, saveJsonFile, ensureDirectoryExists, safeFilename } = require("@root/utils/process/file");

/**
 * 학과 상세 페이지 크롤러 (리팩토링 버전)
 */
class DepartmentCrawler {
  constructor() {
    this.departmentsFile = path.join(process.cwd(), "assets", "static", "departments_simple.json");
    this.outputDir = path.join(process.cwd(), "assets", "static");
    this.delay = 1000; // 요청 간 지연시간 (1초)

    logger.info("DepartmentCrawler 초기화 완료");
  }

  /**
   * departments_simple.json 파일 로드
   */
  async loadDepartments() {
    try {
      const data = await readFileSafe(this.departmentsFile);
      if (!data) {
        throw new Error("departments_simple.json 파일이 존재하지 않습니다.");
      }

      const departments = JSON.parse(data);
      logger.info(`학과 데이터 로드 완료: ${departments.length}개`);
      return departments;
    } catch (error) {
      logger.error(`departments_simple.json 로드 실패: ${error.message}`);
      return [];
    }
  }

  /**
   * 학과 상세 페이지 크롤링
   */
  async crawlDepartmentDetail(department) {
    try {
      const { name, college, detailLink } = department;

      if (!detailLink || !detailLink.includes("www.hoseo.ac.kr/Home/Major.mbz")) {
        logger.warn(`${name}: detailLink가 없거나 Major.mbz가 아님`);
        return null;
      }

      logger.info(`크롤링 시작: ${college} - ${name}`);

      // 공통 크롤링 함수 사용
      const htmlContent = await crawlWebPage(detailLink, {
        description: `${college} ${name} 학과 상세`,
        timeout: 10000,
      });

      const cheerio = require("cheerio");
      const $ = cheerio.load(htmlContent);
      const departmentInfo = await this.extractDepartmentInfo($, department);

      logger.info(`${name} 크롤링 완료`);
      return departmentInfo;
    } catch (error) {
      logger.error(`${department.name} 크롤링 실패: ${error.message}`);
      return null;
    }
  }

  /**
   * 학과 상세 정보 추출
   */
  async extractDepartmentInfo($, department) {
    const info = {
      ...department,
      crawledAt: new Date().toISOString(),
      image: "",
      englishName: "",
      description: "",
      location: "",
      contact: { phone: "", email: "", office: "" },
      introduction: "",
      faculty: [],
      career: "",
    };

    try {
      // 기본 정보 추출
      const basicInfo = await this.extractBasicInfo($, department.name);
      Object.assign(info, basicInfo);

      // 컨텐츠 정보 추출
      const contentInfo = this.extractContentInfo($);
      Object.assign(info, contentInfo);
    } catch (error) {
      logger.error(`${department.name} 정보 추출 실패: ${error.message}`);
    }

    return info;
  }

  /**
   * 기본 정보 추출 (이미지, 영문명, 설명, 연락처)
   */
  async extractBasicInfo($, departmentName) {
    const image = await this.extractImage($, departmentName);
    const contactInfo = this.extractContactInfo($);

    return {
      image,
      englishName: this.extractEnglishName($),
      description: this.extractDescription($),
      ...contactInfo,
    };
  }

  /**
   * 컨텐츠 정보 추출 (학과안내, 교수진, 진로)
   */
  extractContentInfo($) {
    return {
      introduction: this.extractIntroduction($),
      faculty: this.extractFaculty($),
      career: this.extractCareer($),
    };
  }

  /**
   * 이미지 추출 및 다운로드
   */
  async extractImage($, departmentName) {
    const selectors = [
      ".depart-visual img",
      ".dept-image img",
      ".department-image img",
      ".major-image img",
      ".content img:first",
    ];

    for (const selector of selectors) {
      const img = $(selector).first();
      if (img.length > 0) {
        const src = img.attr("src");
        if (src) {
          const imageUrl = src.startsWith("/") ? `http://www.hoseo.ac.kr${src}` : src;

          // 이미지 다운로드 및 저장 (공통 유틸리티 사용)
          const savedImagePath = await this.downloadImageSafely(imageUrl, departmentName);
          return savedImagePath || imageUrl; // 다운로드 실패시 원본 URL 반환
        }
      }
    }
    return "";
  }

  /**
   * 이미지 다운로드 (공통 유틸리티 사용)
   */
  async downloadImageSafely(imageUrl, departmentName) {
    try {
      // static/images 디렉토리 생성
      const imagesDir = path.join(this.outputDir, "images");
      await ensureDirectoryExists(imagesDir);

      // URL에서 savename 파라미터 추출
      const url = new URL(imageUrl);
      const savename = url.searchParams.get("savename");

      let fileName;
      if (savename) {
        fileName = savename;
      } else {
        // savename이 없으면 학과명으로 대체
        const safeFileName = safeFilename(departmentName, ".jpg");
        fileName = `${safeFileName}_image.jpg`;
      }

      // 파일명에 확장자가 없으면 추가
      if (!fileName.includes(".")) {
        fileName += ".jpg";
      }

      const filePath = path.join(imagesDir, fileName);

      // 공통 다운로드 함수 사용
      await downloadFile(imageUrl, filePath, {
        timeout: 15000,
        createDir: false, // 이미 디렉토리 생성함
      });

      // 상대 경로 반환
      const relativePath = path.join("images", fileName).replace(/\\/g, "/");
      logger.info(`이미지 다운로드 완료: ${relativePath}`);

      return relativePath;
    } catch (error) {
      logger.error(`이미지 다운로드 실패 (${imageUrl}): ${error.message}`);
      return null;
    }
  }

  /**
   * 영문명 추출
   */
  extractEnglishName($) {
    const selectors = [
      ".depart-visual .english-name",
      ".dept-english",
      ".english-title",
      'p:contains("Department of")',
      'h2:contains("Department of")',
      'h3:contains("Department of")',
    ];

    for (const selector of selectors) {
      const element = $(selector);
      if (element.length > 0) {
        const text = element.text().trim();
        const match = text.match(/Department of [A-Za-z\s]+/i);
        if (match) {
          return match[0].trim();
        }
      }
    }
    return "";
  }

  /**
   * 설명 추출
   */
  extractDescription($) {
    const departVisual = $(".depart-visual .depart-sub-info");
    if (departVisual.length > 0) {
      let text = departVisual.text().trim();
      text = text.replace(/\d{2,3}-\d{3,4}-\d{4}/g, ""); // 전화번호 제거
      text = text.replace(/지하\d+층|\d+호관 \d+호|지하 \d+층/gi, ""); // 호실 정보 제거
      text = this.cleanText(text);
      if (text && text.length > 20) {
        return text;
      }
    }
    return "";
  }

  /**
   * 연락처 정보 추출
   */
  extractContactInfo($) {
    const result = {
      contact: { phone: "", email: "", office: "" },
      location: "",
    };

    const infoRight = $(".depart-info-right li");
    infoRight.each((index, element) => {
      const text = $(element).text().trim();

      const phoneMatch = text.match(/(\d{2,3}-\d{3,4}-\d{4})/);
      if (phoneMatch) {
        result.contact.phone = phoneMatch[1];
      }

      const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch) {
        result.contact.email = emailMatch[1];
      }

      if (!phoneMatch && !emailMatch && text.length > 3) {
        if (text.includes("캠퍼스") || text.includes("호관") || text.includes("층")) {
          result.location = text;
        }
      }
    });

    return result;
  }

  /**
   * 학과안내 추출 (개행 처리 포함)
   */
  extractIntroduction($) {
    const selectors = [
      ".sub-depart-box-01",
      '.sub-depart-box h3:contains("학과안내") ~ *',
      'h3:contains("학과안내") ~ *',
      ".intro-content",
      ".department-guide",
    ];

    for (const selector of selectors) {
      const container = $(selector).first();
      if (container.length > 0) {
        // HTML을 가져와서 개행 처리
        let html = container.html();
        if (html) {
          // 빈 p 태그들을 개행으로 변환
          html = html.replace(/<p[^>]*>\s*(&nbsp;|\s)*\s*<\/p>/gi, "\n");

          // 일반 p 태그들을 개행으로 구분
          html = html.replace(/<\/p>\s*<p[^>]*>/gi, "\n");

          // br 태그를 개행으로 변환
          html = html.replace(/<br\s*\/?>/gi, "\n");

          // 나머지 HTML 태그 제거
          html = html.replace(/<[^>]+>/g, " ");

          // HTML 엔티티 디코딩
          html = html
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");

          let text = this.cleanTextWithNewlines(html);

          // 숫자 리스트 형태인 경우 처리
          if (text.includes("1.") && text.includes("2.")) {
            const listItems = text.match(/\d+\.[^\d]*(?=\d+\.|$)/g);
            if (listItems && listItems.length > 1) {
              text = listItems.slice(0, 5).join("\n").trim();
            }
          }

          if (text && text.length > 30) {
            return text;
          }
        }
      }
    }
    return "";
  }

  /**
   * 교수진 정보 추출
   */
  extractFaculty($) {
    const faculty = [];

    try {
      const profList = $(".prof-list li");

      profList.each((index, element) => {
        const $prof = $(element);

        const nameElement = $prof.find(".prof-name");
        if (nameElement.length === 0) return;

        const fullNameText = nameElement.text().trim();
        const koreanName = fullNameText.replace(/\([^)]*\)/g, "").trim();

        if (!koreanName || koreanName.length < 2) return;

        const profInfo = {
          name: koreanName,
          position: "교수",
          major: "",
          email: "",
          phone: "",
        };

        const infoList = $prof.find(".prof-info li");
        infoList.each((i, infoElement) => {
          const infoText = $(infoElement).text().trim();

          if (infoText.includes("@")) {
            profInfo.email = infoText;
          } else if (infoText.match(/\d{3}-\d{3,4}-\d{4}/)) {
            profInfo.phone = infoText;
          } else if (i === 0 && infoText && !infoText.includes("@") && !infoText.match(/\d{3}-\d{3,4}-\d{4}/)) {
            profInfo.major = infoText;
          }
        });

        faculty.push(profInfo);
      });

      // Fallback: HTML 파싱으로 추출
      if (faculty.length === 0) {
        const robustFaculty = this.extractFacultyFromHTML($.html());
        faculty.push(...robustFaculty);
      }
    } catch (error) {
      logger.error(`교수진 추출 실패: ${error.message}`);
    }

    return faculty;
  }

  /**
   * HTML에서 교수진 정보 추출 (Fallback)
   */
  extractFacultyFromHTML(html) {
    const faculty = [];
    const namePatterns = [
      /prof-name[^>]*>([^<]*?)([가-힣]{2,4})[^<]*?</gi,
      /교수[^>]*>([^<]*?)([가-힣]{2,4})[^<]*?</gi,
      /name[^>]*>([^<]*?)([가-힣]{2,4})[^<]*?</gi,
    ];

    for (const pattern of namePatterns) {
      let match;
      pattern.lastIndex = 0;

      while ((match = pattern.exec(html)) !== null) {
        const potentialName = match[2];

        if (potentialName && potentialName.length >= 2 && potentialName.length <= 4) {
          const exists = faculty.some((prof) => prof.name === potentialName);
          if (!exists) {
            const surroundingText = html.substring(Math.max(0, match.index - 1000), match.index + 1000);

            const profInfo = {
              name: potentialName,
              position: "교수",
              major: "",
              email: "",
              phone: "",
            };

            const emailMatch = surroundingText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
            if (emailMatch) profInfo.email = emailMatch[1];

            const phoneMatch = surroundingText.match(/(041-\d{3}-\d{4}|\d{3}-\d{3}-\d{4})/);
            if (phoneMatch) profInfo.phone = phoneMatch[1];

            const majorMatches = surroundingText.match(/([가-힣]{3,10}(학과|과|학부|전공|신학))/g);
            if (majorMatches && majorMatches.length > 0) profInfo.major = majorMatches[0];

            faculty.push(profInfo);
          }
        }
      }

      if (faculty.length > 0) break;
    }

    return faculty;
  }

  /**
   * 진로 정보 추출
   */
  extractCareer($) {
    const selectors = [
      '.sub-depart-box h3:contains("졸업 후 진로") + p',
      '.sub-depart-box h3:contains("진로") + p',
      ".career-info",
      ".employment-info",
      'h3:contains("진로") + p',
      'h3:contains("취업") + p',
    ];

    for (const selector of selectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        let combinedText = "";

        elements.each((index, element) => {
          const elementText = $(element).text().trim();
          if (elementText && elementText.length > 10) {
            combinedText += elementText + " ";
          }
        });

        const text = this.cleanText(combinedText.trim());
        if (text && text.length > 20 && text.length < 1000) {
          return text;
        }
      }
    }
    return "";
  }

  /**
   * 텍스트 정리
   */
  cleanText(text) {
    if (!text) return "";
    return text
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n/g, "\n")
      .replace(/[\t\r]/g, "")
      .trim();
  }

  /**
   * 개행을 유지하면서 텍스트 정리
   */
  cleanTextWithNewlines(text) {
    if (!text) return "";
    return text
      .replace(/[ \t]+/g, " ") // 공백과 탭을 하나의 공백으로
      .replace(/\n\s+/g, "\n") // 개행 뒤의 공백 제거
      .replace(/\s+\n/g, "\n") // 개행 앞의 공백 제거
      .replace(/\n{3,}/g, "\n\n") // 3개 이상의 연속 개행을 2개로
      .replace(/[\r]/g, "") // 캐리지 리턴 제거
      .trim();
  }

  /**
   * 지연 함수
   */
  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 모든 학과 크롤링 실행
   */
  async crawlAllDepartments() {
    console.log("[시작] 학과 상세 정보 크롤링을 시작합니다.");

    const departments = await this.loadDepartments();
    if (departments.length === 0) {
      console.log("[종료] 크롤링할 학과가 없습니다.");
      return;
    }

    const results = [];
    const targetDepartments = departments.filter(
      (dept) => dept.detailLink && dept.detailLink.includes("www.hoseo.ac.kr/Home/Major.mbz")
    );

    console.log(`[정보] 총 ${targetDepartments.length}개 학과를 크롤링합니다.`);

    for (let i = 0; i < targetDepartments.length; i++) {
      const department = targetDepartments[i];

      console.log(`\n[진행] ${i + 1}/${targetDepartments.length} - ${department.college} ${department.name}`);

      const result = await this.crawlDepartmentDetail(department);
      if (result) {
        results.push(result);
        console.log(`[성공] ${department.name} 크롤링 완료`);
      }

      if (i < targetDepartments.length - 1) {
        console.log(`[대기] ${this.delay}ms 대기 중...`);
        await this.delay(this.delay);
      }
    }

    await this.saveResults(results);
    console.log(`\n[완료] 총 ${results.length}개 학과 정보를 수집했습니다.`);
  }

  /**
   * 특정 학과만 크롤링 (테스트용)
   */
  async crawlSingleDepartment(departmentName) {
    const departments = await this.loadDepartments();
    const target = departments.find((dept) => dept.name === departmentName);

    if (!target) {
      console.log(`[에러] '${departmentName}' 학과를 찾을 수 없습니다.`);
      return;
    }

    console.log(`[테스트] ${target.name} 학과 크롤링을 시작합니다.`);
    const result = await this.crawlDepartmentDetail(target);

    if (result) {
      console.log("[결과]", JSON.stringify(result, null, 2));

      const deptFile = path.join(this.outputDir, `dept_${departmentName}.json`);
      await saveJsonFile(deptFile, result);
      console.log(`[저장] 테스트 결과가 ${deptFile}에 저장되었습니다.`);
    }
  }

  /**
   * 크롤링 결과 저장 (공통 유틸리티 사용)
   */
  async saveResults(results) {
    try {
      const outputFile = path.join(this.outputDir, "departments_detailed.json");
      await saveJsonFile(outputFile, results);
      console.log(`[저장] 크롤링 결과가 ${outputFile}에 저장되었습니다.`);

      const stats = {
        totalDepartments: results.length,
        crawledAt: new Date().toISOString(),
        colleges: [...new Set(results.map((r) => r.college))],
        departmentTypes: results.reduce((acc, r) => {
          acc[r.type] = (acc[r.type] || 0) + 1;
          return acc;
        }, {}),
      };

      const statsFile = path.join(this.outputDir, "departments_crawl_stats.json");
      await saveJsonFile(statsFile, stats);
      console.log(`[통계] 크롤링 통계가 ${statsFile}에 저장되었습니다.`);
    } catch (error) {
      console.error("[에러] 결과 저장 실패:", error.message);
    }
  }
}

// 실행 코드
if (require.main === module) {
  const crawler = new DepartmentCrawler();
  const args = process.argv.slice(2);

  if (args.length > 0) {
    const departmentName = args[0];
    crawler.crawlSingleDepartment(departmentName);
  } else {
    crawler.crawlAllDepartments();
  }
}

module.exports = DepartmentCrawler;
