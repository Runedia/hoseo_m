const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs-extra");
const path = require("path");

/**
 * 호서대학교 학사일정 페이지 크롤링 및 JSON 변환
 * URL: http://www.hoseo.ac.kr/Home/Contents.mbz?action=MAPP_2405312496
 * Target: #academic_scd01
 */

const BASE_URL = "http://www.hoseo.ac.kr";
const TARGET_URL = "http://www.hoseo.ac.kr/Home/Contents.mbz?action=MAPP_2405312496";
const OUTPUT_DIR = path.join(process.cwd(), "assets", "static");
const CSS_SAVE_DIR = path.join(OUTPUT_DIR, "css");
const OUTPUT_HTML = path.join(OUTPUT_DIR, "학사일정.html");
const OUTPUT_JSON = path.join(OUTPUT_DIR, "학사일정.json");

// 필요한 CSS 파일들 (버전 정보는 동적으로 감지)
const NEED_CSS_PATTERNS = [
  "/resources/css/korean/style.css",
  "/resources/css/korean/site_style.css",
  "/resources/css/korean/site_sub.css",
  "/combine/contents/korean/haksa/PAGE_2502040648.css",
];

// 날짜 파싱 관련 변수
let currentProcessingMonth = 1;

/**
 * CSS 파일 다운로드 함수
 */
async function downloadCss(href) {
  try {
    // 절대 경로 처리
    let url = href.startsWith("http") ? href : BASE_URL + href;

    // 파일명 생성 (쿼리 파라미터 포함하여 고유하게)
    let urlObj = new URL(url);
    let pathname = urlObj.pathname;
    let queryParams = urlObj.searchParams.toString();

    // 파일명에 버전 정보 포함
    let filename = pathname.replace(/^\/+/, "").replace(/\//g, "_");
    if (queryParams) {
      filename = filename.replace(".css", `_${queryParams.replace(/[=&]/g, "_")}.css`);
    }

    let savePath = path.join(CSS_SAVE_DIR, filename);

    // 디렉토리 생성
    await fs.ensureDir(CSS_SAVE_DIR);

    console.log(`📥 CSS 다운로드 중: ${url}`);

    // 파일 다운로드
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    await fs.writeFile(savePath, res.data);
    console.log(`✅ CSS 저장 완료: ${filename}`);

    // HTML에서 쓸 상대경로 리턴
    return `css/${filename}`;
  } catch (error) {
    console.error(`❌ CSS 다운로드 실패 (${href}):`, error.message);
    return null;
  }
}

/**
 * 날짜 파싱 함수
 */
function parseDate(dateStr, year = 2025) {
  dateStr = dateStr.trim();

  if (dateStr.includes("2026")) {
    year = 2026;
    dateStr = dateStr.replace("2026.", "");
  }

  const results = [];

  if (dateStr.includes("~")) {
    const [startPart, endPart] = dateStr.split("~").map((s) => s.trim());

    const startMatch = startPart.match(/(\d+)\([^)]+\)/);
    if (startMatch) {
      const startDay = parseInt(startMatch[1]);

      let endDay, endMonth;

      const crossMonthMatch = endPart.match(/(\d+)\.\s*(\d+)\.\([^)]+\)/);
      if (crossMonthMatch) {
        endMonth = parseInt(crossMonthMatch[1]);
        endDay = parseInt(crossMonthMatch[2]);
      } else {
        const endMatch = endPart.match(/(\d+)\([^)]+\)/);
        if (endMatch) {
          endDay = parseInt(endMatch[1]);
          endMonth = null;
        }
      }

      if (endDay) {
        const currentMonth = getCurrentMonth(dateStr);
        const targetEndMonth = endMonth || currentMonth;

        if (endMonth && endMonth !== currentMonth) {
          const daysInCurrentMonth = getDaysInMonth(year, currentMonth);
          for (let day = startDay; day <= daysInCurrentMonth; day++) {
            results.push({ year, month: currentMonth, day });
          }
          for (let day = 1; day <= endDay; day++) {
            results.push({ year, month: targetEndMonth, day });
          }
        } else {
          for (let day = startDay; day <= endDay; day++) {
            results.push({ year, month: currentMonth, day });
          }
        }
      }
    }
  } else {
    const singleMatch = dateStr.match(/(\d+)\([^)]+\)/);
    if (singleMatch) {
      const day = parseInt(singleMatch[1]);
      const month = getCurrentMonth(dateStr);
      results.push({ year, month, day });
    }
  }

  return results;
}

function getCurrentMonth(dateStr) {
  return currentProcessingMonth;
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function getMonthNumber(monthText) {
  const monthMap = {
    "1월": 1,
    "2월": 2,
    "3월": 3,
    "4월": 4,
    "5월": 5,
    "6월": 6,
    "7월": 7,
    "8월": 8,
    "9월": 9,
    "10월": 10,
    "11월": 11,
    "12월": 12,
  };

  if (monthText.includes("2026")) {
    const match = monthText.match(/(\d+)월/);
    return match ? parseInt(match[1]) : 1;
  }

  return monthMap[monthText] || 1;
}

/**
 * HTML을 구조화된 JSON으로 변환 (중첩 구조)
 */
function parseCalendarToNestedStructure(htmlContent) {
  try {
    console.log("📅 학사일정 HTML 파싱 시작 (중첩 구조)...");

    const $ = cheerio.load(htmlContent);

    // 년도별 데이터 구조: { 2025: { 1: { 1: { 1: {event, dateOriginal}, 2: {...} } } } }
    const calendarData = {};

    // 각 월별 일정 파싱
    $("#academic_scd01 ul > li").each((index, element) => {
      const $li = $(element);

      // 월 정보 추출
      const monthText = $li.find(".box-month").text().trim();
      currentProcessingMonth = getMonthNumber(monthText);
      const year = monthText.includes("2026") ? 2026 : 2025;

      console.log(`📌 ${monthText} 처리 중...`);

      // 해당 월의 일정들 처리
      $li.find(".list-box").each((i, listBox) => {
        const $box = $(listBox);
        const dateText = $box.find(".list-date em").text().trim();
        const eventText = $box.find(".list-content").text().trim();

        if (dateText && eventText) {
          // 날짜 파싱
          const dates = parseDate(dateText, year);

          // 각 날짜에 대해 이벤트 추가
          dates.forEach((dateInfo) => {
            const { year: eventYear, month, day } = dateInfo;

            // 년도 초기화
            if (!calendarData[eventYear]) {
              calendarData[eventYear] = {};
            }

            // 월 초기화
            if (!calendarData[eventYear][month]) {
              calendarData[eventYear][month] = {};
            }

            // 일 초기화
            if (!calendarData[eventYear][month][day]) {
              calendarData[eventYear][month][day] = {};
            }

            // 해당 날짜의 이벤트 개수 확인 후 인덱스 할당
            const existingEvents = Object.keys(calendarData[eventYear][month][day]);
            const eventIndex = existingEvents.length + 1;

            // 이벤트 추가
            calendarData[eventYear][month][day][eventIndex] = {
              dateOriginal: dateText,
              event: eventText,
            };
          });

          console.log(`  ✅ ${dateText} → ${eventText} (${dates.length}개 날짜)`);
        }
      });
    });

    // 통계 정보 계산
    let totalEvents = 0;
    let totalDays = 0;

    Object.keys(calendarData).forEach((year) => {
      Object.keys(calendarData[year]).forEach((month) => {
        Object.keys(calendarData[year][month]).forEach((day) => {
          totalDays++;
          totalEvents += Object.keys(calendarData[year][month][day]).length;
        });
      });
    });

    console.log(`📊 총 이벤트 수: ${totalEvents}개`);
    console.log(`📅 총 날짜 수: ${totalDays}개`);

    return calendarData;
  } catch (error) {
    console.error("❌ JSON 파싱 오류:", error.message);
    throw error;
  }
}

/**
 * 학사일정 크롤링 및 JSON 변환 (통합 함수)
 */
async function getCalendar() {
  try {
    console.log("🚀 호서대학교 학사일정 크롤링 시작...");
    console.log(`📍 대상 URL: ${TARGET_URL}`);

    // 1. HTML 가져오기
    console.log("📄 HTML 데이터 가져오는 중...");
    const { data: html } = await axios.get(TARGET_URL, {
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.8,en-US;q=0.5,en;q=0.3",
        "Accept-Encoding": "gzip, deflate",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
    });

    console.log(`✅ 페이지 로드 완료 (상태: 200)`);

    // 2. cheerio로 파싱
    const $ = cheerio.load(html);

    // 3. 페이지에서 실제 사용되는 CSS 파일들 찾기
    let cssLinks = [];
    $('link[rel="stylesheet"]').each((i, elem) => {
      const href = $(elem).attr("href");
      if (href) {
        // 필요한 CSS 패턴과 매칭되는지 확인
        const matchesPattern = NEED_CSS_PATTERNS.some((pattern) => href.includes(pattern.replace(".css", "")));

        if (matchesPattern) {
          cssLinks.push(href);
        }
      }
    });

    console.log(`🎨 발견된 CSS 파일 ${cssLinks.length}개:`, cssLinks);

    // 4. assets 디렉토리 생성
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      console.log("📁 assets 디렉토리 생성 완료");
    }

    // 5. CSS 파일들 다운로드
    let linkTags = [];
    for (const href of cssLinks) {
      const cssPath = await downloadCss(href);
      if (cssPath) {
        // assets 경로를 사용하여 올바른 정적 파일 경로 생성
        linkTags.push(`    <link href="/assets/static/${cssPath}" rel="stylesheet" type="text/css" />`);
      }
    }

    // 6. 학사일정 본문 추출
    console.log("📅 학사일정 본문 추출 중...");

    // 학사일정 제목과 내용을 포함한 전체 섹션 추출
    let calendarContent = "";

    // 방법 1: .sub-step 클래스를 가진 div 찾기
    const subStep = $(".sub-step");
    if (subStep.length > 0) {
      calendarContent = $.html(subStep);
      console.log("✅ .sub-step 영역에서 학사일정 추출 완료");
    } else {
      // 방법 2: academic_scd01 ID를 가진 div 찾기
      const academicDiv = $("#academic_scd01");
      if (academicDiv.length > 0) {
        calendarContent = `
          <div class="sub-step">
            <h3>2025학년도 학사일정</h3>
            ${$.html(academicDiv)}
          </div>
        `;
        console.log("✅ #academic_scd01 영역에서 학사일정 추출 완료");
      } else {
        // 방법 3: 전체 본문에서 학사일정 관련 내용 찾기
        const bodyContent = $("#body");
        if (bodyContent.length > 0) {
          calendarContent = $.html(bodyContent);
          console.log("✅ #body 영역에서 전체 내용 추출 완료");
        } else {
          throw new Error("학사일정 내용을 찾을 수 없습니다.");
        }
      }
    }

    if (!calendarContent || calendarContent.trim() === "") {
      throw new Error("❌ 학사일정 내용이 비어있습니다.");
    }

    // 7. 결과 HTML 생성
    const resultHtml = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>호서대학교 2025학년도 학사일정</title>
  <!-- 다운로드된 CSS 파일들 -->
${linkTags.join("\n")}
  <style>
      /* 추가 스타일링 */
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
      .header p {
          color: #666;
          margin: 10px 0 0 0;
          font-size: 1.1em;
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
    <div class="container">
      <!-- 학사일정 본문 -->
      ${calendarContent}
    </div>
</body>
</html>`;

    // 8. HTML 파일 저장
    await fs.writeFile(OUTPUT_HTML, resultHtml, "utf-8");
    console.log(`💾 HTML 파일 저장 완료: ${OUTPUT_HTML}`);

    // 9. 구조화된 JSON 데이터 생성 및 저장
    console.log("🔄 HTML을 구조화된 JSON으로 파싱 중...");
    const structuredData = parseCalendarToNestedStructure(calendarContent);

    await fs.writeFile(OUTPUT_JSON, JSON.stringify(structuredData, null, 2), "utf-8");
    console.log(`💾 학사일정.json 파일 저장 완료: ${OUTPUT_JSON}`);

    console.log("\n🎉 학사일정 크롤링 및 JSON 변환 완료!");
    console.log(`📁 HTML 저장 위치: ${OUTPUT_HTML}`);
    console.log(`📁 JSON 저장 위치: ${OUTPUT_JSON}`);
    console.log(`📁 CSS 파일들: ${CSS_SAVE_DIR}`);

    // 통계 정보 계산
    let totalEvents = 0;
    let totalDays = 0;

    Object.keys(structuredData).forEach((year) => {
      Object.keys(structuredData[year]).forEach((month) => {
        Object.keys(structuredData[year][month]).forEach((day) => {
          totalDays++;
          totalEvents += Object.keys(structuredData[year][month][day]).length;
        });
      });
    });

    return {
      success: true,
      htmlFile: OUTPUT_HTML,
      jsonFile: OUTPUT_JSON,
      cssDir: CSS_SAVE_DIR,
      content: calendarContent,
      structuredData: structuredData,
      stats: {
        hasContent: true,
        contentLength: calendarContent.length,
        totalEvents: totalEvents,
        totalDays: totalDays,
        structuredSections: Object.keys(structuredData).length,
      },
    };
  } catch (error) {
    console.error("❌ 학사일정 크롤링 실패:", error.message);

    // 에러 정보 저장
    const errorData = {
      error: true,
      message: error.message,
      url: TARGET_URL,
      timestamp: new Date().toISOString(),
      stack: error.stack,
    };

    const errorFile = path.join(OUTPUT_DIR, "학사일정_error.json");
    await fs.writeFile(errorFile, JSON.stringify(errorData, null, 2), "utf-8");
    console.log(`💾 에러 정보 저장: ${errorFile}`);

    throw error;
  }
}

// 직접 실행 시
if (require.main === module) {
  getCalendar()
    .then((result) => {
      console.log("🎉 크롤링 성공!");
      console.log("결과:", result.stats);

      // 샘플 데이터 출력
      console.log("\n📋 샘플 데이터 구조:");
      const sampleYear = Object.keys(result.structuredData)[0];
      if (sampleYear) {
        const sampleMonth = Object.keys(result.structuredData[sampleYear])[0];
        if (sampleMonth) {
          const sampleDay = Object.keys(result.structuredData[sampleYear][sampleMonth])[0];
          if (sampleDay) {
            console.log(
              `${sampleYear}년 ${sampleMonth}월 ${sampleDay}일:`,
              JSON.stringify(result.structuredData[sampleYear][sampleMonth][sampleDay], null, 2)
            );
          }
        }
      }
    })
    .catch((error) => {
      console.error("💥 크롤링 실패:", error.message);
      process.exit(1);
    });
}

module.exports = {
  getCalendar,
  downloadCss,
  parseCalendarToNestedStructure,
  parseDate,
  TARGET_URL,
  OUTPUT_HTML,
  OUTPUT_JSON,
};
