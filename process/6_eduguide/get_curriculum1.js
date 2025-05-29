const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

/**
 * 호서대학교 교육과정 페이지 크롤링
 * URL: http://www.hoseo.ac.kr/Home/Contents.mbz?action=MAPP_1708290175
 * Target: #body > .sub-step
 */

const TARGET_URL = "http://www.hoseo.ac.kr/Home/Contents.mbz?action=MAPP_1708290175";
const OUTPUT_DIR = path.join(process.cwd(), "assets", "static");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "교육과정.html");
const JSON_FILE = path.join(OUTPUT_DIR, "교육과정.json");

/**
 * 교육과정 HTML 크롤링 및 저장
 */
async function getCurriculum() {
  try {
    console.log("🔄 교육과정 크롤링 시작...");
    console.log(`📍 대상 URL: ${TARGET_URL}`);

    // 1. 웹페이지 요청
    const response = await axios.get(TARGET_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.8,en-US;q=0.5,en;q=0.3",
        "Accept-Encoding": "gzip, deflate",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      timeout: 30000, // 30초 타임아웃
    });

    console.log(`✅ 페이지 로드 완료 (상태: ${response.status})`);

    // 2. HTML 파싱
    const $ = cheerio.load(response.data);

    // 3. 대상 요소 추출: #body > .sub-step
    const bodyElement = $("#body");
    if (bodyElement.length === 0) {
      throw new Error("❌ #body 요소를 찾을 수 없습니다.");
    }

    const subStepElement = bodyElement.find(".sub-step");
    if (subStepElement.length === 0) {
      throw new Error("❌ .sub-step 요소를 찾을 수 없습니다.");
    }

    console.log(`📊 .sub-step 요소 발견: ${subStepElement.length}개`);

    // 4. 크롤링된 내용 추출
    const curriculumContent = subStepElement.html();

    if (!curriculumContent || curriculumContent.trim() === "") {
      throw new Error("❌ 교육과정 내용이 비어있습니다.");
    }

    // 5. assets 디렉토리 생성
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      console.log("📁 assets 디렉토리 생성 완료");
    }

    // 6. 완전한 HTML 문서 생성
    const fullHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>호서대학교 교육과정</title>
  <style>
    body {
      font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #0066cc;
    }
    .header h1 {
      color: #0066cc;
      margin: 0;
      font-size: 2.2em;
    }
    .generated-info {
      text-align: right;
      color: #999;
      font-size: 0.9em;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
    <div class="sub-step">
        ${curriculumContent}
    </div>
</body>
</html>`;

    // 7. HTML 파일 저장
    fs.writeFileSync(OUTPUT_FILE, fullHtml, "utf-8");
    console.log(`💾 HTML 파일 저장 완료: ${OUTPUT_FILE}`);

    // 8. 구조화된 JSON 데이터 생성 및 저장
    console.log("🔄 HTML을 구조화된 JSON으로 파싱 중...");
    const structuredData = parseCurriculumToStructuredJSON(curriculumContent);

    fs.writeFileSync(JSON_FILE, JSON.stringify(structuredData, null, 2), "utf-8");
    console.log(`💾 교육과정.json 파일 저장 완료: ${JSON_FILE}`);

    console.log("✅ 교육과정 크롤링 완료!");
    console.log(`📄 콘텐츠 길이: ${curriculumContent.length}자`);
    console.log(`🔍 구조화된 섹션 개수: ${Object.keys(structuredData).length}개`);

    return {
      success: true,
      htmlFile: OUTPUT_FILE,
      jsonFile: JSON_FILE,
      content: curriculumContent,
      structuredData: structuredData,
      stats: {
        hasContent: true,
        contentLength: curriculumContent.length,
        structuredSections: Object.keys(structuredData).length,
      },
    };
  } catch (error) {
    console.error("❌ 교육과정 크롤링 실패:", error.message);

    // 에러 정보 저장
    const errorData = {
      error: true,
      message: error.message,
      url: TARGET_URL,
      timestamp: new Date().toISOString(),
      stack: error.stack,
    };

    const errorFile = path.join(OUTPUT_DIR, "교육과정_error.json");
    fs.writeFileSync(errorFile, JSON.stringify(errorData, null, 2), "utf-8");
    console.log(`💾 에러 정보 저장: ${errorFile}`);

    throw error;
  }
}

/**
 * 텍스트에서 앞의 번호를 제거하는 함수
 */
function removeNumberPrefix(text) {
  if (!text) return text;
  
  // 다양한 번호 패턴 제거
  return text
    .replace(/^\d+\.\s*/, '')  // "1. " 형태 제거
    .replace(/^\d+\s+/, '')   // "1 " 형태 제거 
    .replace(/^\d+/, '')      // 맨 앞 숫자만 있는 경우
    .trim();                  // 앞뒤 공백 제거
}

/**
 * 중첩된 리스트를 재귀적으로 파싱하는 함수
 */
function parseNestedList($elem, $) {
  const children = {};
  let childIndex = 1;
  
  $elem.children('li').each((liIndex, liElem) => {
    const $li = $(liElem);
    
    // li의 직속 텍스트만 추출 (하위 ul/ol 제외)
    const directText = $li.clone().children('ul, ol').remove().end().text().trim();
    
    // 번호 제거 및 텍스트 정리
    const cleanText = removeNumberPrefix(directText);
    
    // 하위 ul/ol 요소가 있는지 확인
    const nestedList = $li.children('ul, ol');
    
    if (nestedList.length > 0) {
      // 중첩된 리스트가 있는 경우
      const nestedChildren = parseNestedList(nestedList, $);
      children[childIndex] = {
        text: cleanText,
        children: nestedChildren
      };
    } else {
      // 중첩된 리스트가 없는 경우
      children[childIndex] = cleanText;
    }
    
    childIndex++;
  });
  
  return children;
}

/**
 * HTML을 구조화된 JSON으로 변환 (중첩 리스트 지원)
 * 요청하신 형식: { "1": { "text": "제목", "children": { "1": "내용1", "2": "내용2" } } }
 */
function parseCurriculumToStructuredJSON(htmlContent) {
  const $ = cheerio.load(`<div class="sub-step">${htmlContent}</div>`);
  const result = {};
  let currentIndex = 1;

  // 헤딩 요소들을 찾아서 주요 섹션으로 분류
  const headings = [];
  $(".sub-step")
    .find("h1, h2, h3, h4, h5, h6")
    .each((i, elem) => {
      const $elem = $(elem);
      const level = parseInt(elem.tagName.charAt(1)); // h1->1, h2->2 등
      const text = $elem.text().trim();

      if (text) {
        headings.push({
          element: $elem,
          level: level,
          text: text,
          index: i,
        });
      }
    });

  console.log(`📋 발견된 헤딩: ${headings.length}개`);

  // 헤딩이 있는 경우: 헤딩별로 섹션 구성
  if (headings.length > 0) {
    headings.forEach((heading, index) => {
      const section = {
        text: heading.text,
        children: {},
      };

      let childIndex = 1;
      let currentElem = heading.element.next();

      // 다음 헤딩까지의 모든 내용을 children으로 수집
      while (currentElem.length > 0) {
        const tagName = currentElem[0].tagName.toLowerCase();

        // 같은 레벨 이상의 헤딩을 만나면 중단
        if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tagName)) {
          const elemLevel = parseInt(tagName.charAt(1));
          if (elemLevel <= heading.level) {
            break;
          }
        }

        const text = currentElem.text().trim();
        if (text) {
          // 중첩 리스트 처리 (개선된 버전)
          if (tagName === "ul" || tagName === "ol") {
            const nestedChildren = parseNestedList(currentElem, $);
            Object.keys(nestedChildren).forEach(key => {
              section.children[childIndex] = nestedChildren[key];
              childIndex++;
            });
          }
          // 테이블 처리
          else if (tagName === "table") {
            currentElem.find("tr").each((trIndex, trElem) => {
              const $tr = $(trElem);
              const cells = [];
              $tr.find("td, th").each((cellIndex, cellElem) => {
                const cellText = $(cellElem).text().trim();
                if (cellText) cells.push(cellText);
              });
              if (cells.length > 0) {
                section.children[childIndex] = cells.join(" | ");
                childIndex++;
              }
            });
          }
          // 일반 텍스트 (번호 제거 및 trim 처리)
          else {
            const cleanText = removeNumberPrefix(text);
            if (cleanText) {  // 빈 문자열이 아닌 경우만 추가
              section.children[childIndex] = cleanText;
              childIndex++;
            }
          }
        }

        currentElem = currentElem.next();
      }

      result[currentIndex] = section;
      currentIndex++;
    });
  }
  // 헤딩이 없는 경우: 모든 요소를 순차적으로 처리
  else {
    console.log("📝 헤딩이 없어 순차적 파싱 진행");

    $(".sub-step")
      .contents()
      .each((i, elem) => {
        if (elem.nodeType === 3) {
          // 텍스트 노드
          const text = $(elem).text().trim();
          if (text) {
            const cleanText = removeNumberPrefix(text);
            if (cleanText) {
              result[currentIndex] = {
                text: cleanText,
                children: {},
              };
              currentIndex++;
            }
          }
        } else if (elem.nodeType === 1) {
          // 요소 노드
          const $elem = $(elem);
          const tagName = elem.tagName.toLowerCase();
          const text = $elem.text().trim();

          if (text) {
            if (tagName === "ul" || tagName === "ol") {
              const section = {
                text: `목록 (${tagName.toUpperCase()})`,
                children: {},
              };
              
              // 개선된 중첩 리스트 파싱 사용
              const nestedChildren = parseNestedList($elem, $);
              section.children = nestedChildren;

              result[currentIndex] = section;
              currentIndex++;
            } else if (tagName === "table") {
              const section = {
                text: "표",
                children: {},
              };
              let childIndex = 1;

              $elem.find("tr").each((trIndex, trElem) => {
                const $tr = $(trElem);
                const cells = [];
                $tr.find("td, th").each((cellIndex, cellElem) => {
                  const cellText = $(cellElem).text().trim();
                  if (cellText) cells.push(cellText);
                });
                if (cells.length > 0) {
                  section.children[childIndex] = cells.join(" | ");
                  childIndex++;
                }
              });

              result[currentIndex] = section;
              currentIndex++;
            } else {
              const cleanText = removeNumberPrefix(text);
              if (cleanText) {
                result[currentIndex] = {
                  text: cleanText,
                  children: {},
                };
                currentIndex++;
              }
            }
          }
        }
      });
  }

  console.log(`✅ 구조화 완료: ${Object.keys(result).length}개 섹션`);
  return result;
}

/**
 * 기존 파싱 함수 (호환성 유지)
 */
function parseCurriculumData(htmlContent) {
  const $ = cheerio.load(htmlContent);

  const sections = [];
  $(".sub-step")
    .find("h1, h2, h3, h4, h5, h6")
    .each((i, elem) => {
      sections.push({
        level: elem.tagName.toLowerCase(),
        text: $(elem).text().trim(),
        html: $(elem).html(),
      });
    });

  return {
    sections,
    totalSections: sections.length,
  };
}

// 직접 실행 시
if (require.main === module) {
  getCurriculum()
    .then((result) => {
      console.log("🎉 크롤링 성공!");
      console.log("결과:", result.stats);
      console.log(`📊 구조화된 데이터 샘플:`, Object.keys(result.structuredData).slice(0, 3));
    })
    .catch((error) => {
      console.error("💥 크롤링 실패:", error.message);
      process.exit(1);
    });
}

module.exports = {
  getCurriculum,
  parseCurriculumData,
  parseCurriculumToStructuredJSON,
  TARGET_URL,
  OUTPUT_FILE,
  JSON_FILE,
};
