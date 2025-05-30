require("module-alias/register");

const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs-extra");
const path = require("path");

// 호서대학교 학부(과) 홈페이지 URL
const DEPARTMENT_URL = "http://www.hoseo.ac.kr/Home/Contents.mbz?action=MAPP_2210212173";

/**
 * 링크에서 action 파라미터와 홈페이지 URL 추출
 */
function extractLinkInfo(href) {
  if (!href) return { action: null, homepageUrl: null, detailLink: null };

  // 학과소개 페이지 링크 (action 파라미터 포함)
  const actionMatch = href.match(/action=([^&]+)/);
  const action = actionMatch ? actionMatch[1] : null;

  // 홈페이지 직접 링크인지 확인
  const isDirectHomepage = href.startsWith("http://") || href.startsWith("https://");
  const homepageUrl = isDirectHomepage ? href : null;

  // 상세 링크 생성
  let detailLink = null;
  if (action) {
    detailLink = `http://www.hoseo.ac.kr/Home/Major.mbz?action=${action}`;
  } else if (homepageUrl) {
    detailLink = homepageUrl;
  }

  return { action, homepageUrl, detailLink };
}

/**
 * HTML에서 학과 정보 파싱
 */
function parseDepartmentInfo($) {
  const departments = [];

  // 각 대학별 박스를 찾아서 처리
  $(".dept-m-box").each((index, deptBox) => {
    const $deptBox = $(deptBox);

    // 대학명 추출
    const collegeTitle = $deptBox.find(".d-h3-tit01 a").text().trim();

    if (!collegeTitle) {
      console.log(`⚠️ ${index + 1}번째 박스에서 대학명을 찾을 수 없습니다.`);
      // 대체 선택자 시도
      const altTitle = $deptBox.find("h3 a").text().trim() || $deptBox.find("h3").text().trim();
      if (altTitle) {
        console.log(`   대체 선택자로 발견된 제목: ${altTitle}`);
      }
      return;
    }

    console.log(`🏫 대학 처리 중: ${collegeTitle}`);

    // 해당 대학의 학과/학부 목록 처리
    $deptBox.find(".mian-list-box > li").each((i, listItem) => {
      const $listItem = $(listItem);

      // 메인 학과/학부 정보
      const mainDept = $listItem.find("> div > p > a").first();
      const mainDeptName = mainDept.text().trim();
      const mainDeptHref = mainDept.attr("href");

      // 디버깅: 첫 번째 아이템에 대한 상세 정보
      if (i === 0) {
        console.log(`   첫 번째 학과 디버깅:`);
        console.log(`     학과명: '${mainDeptName}'`);
        console.log(`     링크: '${mainDeptHref}'`);
        console.log(`     전체 텍스트: '${$listItem.text().trim().substring(0, 100)}'`);
      }

      if (mainDeptName && mainDeptHref) {
        const { action, homepageUrl, detailLink } = extractLinkInfo(mainDeptHref);

        const deptInfo = {
          college: collegeTitle,
          department: mainDeptName,
          type: mainDeptName.includes("학부") ? "학부" : "학과",
          action: action,
          homepageUrl: homepageUrl,
          detailLink: detailLink,
          parentDepartment: null,
          isTrack: false,
        };

        // 홈페이지 링크 찾기
        const homepageLink = $listItem.find(".b-home").attr("href");
        if (homepageLink && homepageLink.startsWith("http")) {
          deptInfo.homepageUrl = homepageLink;
          if (!deptInfo.detailLink) {
            deptInfo.detailLink = homepageLink;
          }
        }

        departments.push(deptInfo);
        console.log(`  📚 학과/학부: ${mainDeptName}`);
      }

      // 하위 트랙 정보 처리 (학부 내 트랙들)
      $listItem.find("ul > li").each((j, trackItem) => {
        const $trackItem = $(trackItem);
        const trackLink = $trackItem.find("p > a").first();
        const trackName = trackLink.text().trim();
        const trackHref = trackLink.attr("href");

        if (trackName && trackHref) {
          const { action, homepageUrl, detailLink } = extractLinkInfo(trackHref);

          departments.push({
            college: collegeTitle,
            department: trackName,
            type: "트랙",
            action: action,
            homepageUrl: homepageUrl,
            detailLink: detailLink,
            parentDepartment: mainDeptName,
            isTrack: true,
          });

          console.log(`    🔹 트랙: ${trackName}`);
        }
      });
    });
  });

  return departments;
}

/**
 * JSON 파일로 저장
 */
async function saveDepartmentJson(departments) {
  const assetsPath = path.join(process.cwd(), "assets", "static");
  await fs.ensureDir(assetsPath);

  const jsonPath = path.join(assetsPath, "departments.json");

  // 대학별로 그룹화
  const groupedDepartments = {};
  departments.forEach((dept) => {
    if (!groupedDepartments[dept.college]) {
      groupedDepartments[dept.college] = {
        name: dept.college,
        departments: [],
        tracks: [],
      };
    }

    const deptInfo = {
      name: dept.department,
      type: dept.type,
      action: dept.action,
      homepageUrl: dept.homepageUrl,
      detailLink: dept.detailLink,
      parentDepartment: dept.parentDepartment,
    };

    if (dept.isTrack) {
      groupedDepartments[dept.college].tracks.push(deptInfo);
    } else {
      groupedDepartments[dept.college].departments.push(deptInfo);
    }
  });

  const jsonData = {
    timestamp: new Date().toISOString(),
    source: "호서대학교 학부(과) 홈페이지",
    sourceUrl: DEPARTMENT_URL,
    colleges: groupedDepartments,
  };

  await fs.writeJson(jsonPath, jsonData, { spaces: 2 });
  console.log(`📄 JSON 파일 저장 완료: ${jsonPath}`);
  return jsonPath;
}

/**
 * 간단한 구조의 JSON도 함께 저장 (API 응답용)
 */
async function saveSimpleDepartmentJson(departments) {
  const assetsPath = path.join(process.cwd(), "assets", "static");
  await fs.ensureDir(assetsPath);

  const jsonPath = path.join(assetsPath, "departments_simple.json");

  // 간단한 구조로 변환
  const simpleData = departments.map((dept) => ({
    college: dept.college,
    name: dept.department,
    type: dept.type,
    homepageUrl: dept.homepageUrl,
    detailLink: dept.detailLink,
    parentDepartment: dept.parentDepartment,
    isTrack: dept.isTrack,
  }));

  await fs.writeJson(jsonPath, simpleData, { spaces: 2 });
  console.log(`📄 간단 JSON 파일 저장 완료: ${jsonPath}`);
  return jsonPath;
}

/**
 * 학과 정보 크롤링 메인 함수
 */
async function extractDepartmentList() {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.8,en-US;q=0.5,en;q=0.3",
    "Accept-Encoding": "gzip, deflate",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
  };

  try {
    console.log("🚀 호서대학교 학과 정보 크롤링 시작");
    console.log(`📡 URL: ${DEPARTMENT_URL}`);

    // 웹페이지에서 HTML 가져오기
    const response = await axios.get(DEPARTMENT_URL, { headers });
    const htmlContent = response.data;
    const $ = cheerio.load(htmlContent);

    console.log("📄 HTML 페이지 로드 완료");

    // HTML 구조 확인을 위한 디버깅 정보
    const deptBoxes = $(".dept-m-box").length;
    console.log(`🔍 발견된 대학 박스 수: ${deptBoxes}개`);

    if (deptBoxes === 0) {
      console.log("⚠️ .dept-m-box 클래스를 찾을 수 없습니다. HTML 구조를 확인합니다.");

      // 대체 선택자들 시도
      const alternativeSelectors = [".dept-main-wrap", ".mian-list-box", ".d-h3-tit01", "h3", ".dept-m-title-box"];

      alternativeSelectors.forEach((selector) => {
        const count = $(selector).length;
        console.log(`   ${selector}: ${count}개`);
      });

      console.log("\nHTML 샘플:");
      console.log($.html().substring(0, 1500));
    }

    // 학과 정보 파싱
    const departments = parseDepartmentInfo($);

    if (departments.length === 0) {
      console.log("⚠️ 학과 정보를 찾을 수 없습니다.");
      return null;
    }

    console.log(`📋 총 ${departments.length}개의 학과/트랙 정보를 발견했습니다.`);

    // 대학별 통계 출력
    const collegeStats = {};
    const trackStats = {};

    departments.forEach((dept) => {
      if (dept.isTrack) {
        trackStats[dept.college] = (trackStats[dept.college] || 0) + 1;
      } else {
        collegeStats[dept.college] = (collegeStats[dept.college] || 0) + 1;
      }
    });

    console.log("📊 대학별 학과/학부 수:");
    Object.entries(collegeStats).forEach(([college, count]) => {
      const tracks = trackStats[college] || 0;
      console.log(`   ${college}: ${count}개 학과/학부, ${tracks}개 트랙`);
    });

    // JSON 파일로 저장
    const jsonPath = await saveDepartmentJson(departments);
    const simpleJsonPath = await saveSimpleDepartmentJson(departments);

    console.log("📊 크롤링 완료:");
    console.log(`   총 대학: ${Object.keys(collegeStats).length}개`);
    console.log(`   총 학과/학부: ${Object.values(collegeStats).reduce((a, b) => a + b, 0)}개`);
    console.log(`   총 트랙: ${Object.values(trackStats).reduce((a, b) => a + b, 0)}개`);
    console.log(`   전체: ${departments.length}개`);
    console.log(`   상세 JSON: ${jsonPath}`);
    console.log(`   간단 JSON: ${simpleJsonPath}`);

    return departments;
  } catch (err) {
    console.error("❌ 학과 정보 크롤링 중 오류 발생:", err.message);
    if (err.response) {
      console.error(`   HTTP 상태: ${err.response.status}`);
      console.error(`   응답 헤더:`, err.response.headers);
    }
    throw err;
  }
}

// 직접 실행될 때만 메인 함수 호출
if (require.main === module) {
  (async () => {
    try {
      const departments = await extractDepartmentList();
      if (departments && departments.length > 0) {
        console.log("🎉 학과 정보 크롤링 완료");

        // 샘플 데이터 출력
        console.log("\n📝 샘플 데이터:");
        departments.slice(0, 10).forEach((dept, i) => {
          const prefix = dept.isTrack ? "    🔹" : "  📚";
          console.log(`${i + 1}. ${prefix} ${dept.college} > ${dept.department} (${dept.type})`);
          if (dept.homepageUrl) {
            console.log(`     🏠 홈페이지: ${dept.homepageUrl}`);
          }
          if (dept.detailLink) {
            console.log(`     🔗 상세링크: ${dept.detailLink}`);
          }
        });
      }
    } catch (err) {
      console.error("❌ 전체 처리 중 오류:", err.message);
    }
  })();
}

module.exports = { extractDepartmentList };
