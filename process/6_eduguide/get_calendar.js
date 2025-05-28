const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs-extra");
const path = require("path");

const BASE_URL = "http://www.hoseo.ac.kr";
const TARGET_URL = "http://www.hoseo.ac.kr/Home/Contents.mbz?action=MAPP_2405312496";
const ASSETS_DIR = path.resolve(process.cwd(), "assets");
const CSS_SAVE_DIR = path.join(ASSETS_DIR, "css");
const OUTPUT_HTML = path.join(ASSETS_DIR, "학사일정.html");

// 필요한 CSS 파일들 (버전 정보는 동적으로 감지)
const NEED_CSS_PATTERNS = [
  "/resources/css/korean/style.css",
  "/resources/css/korean/site_style.css",
  "/resources/css/korean/site_sub.css",
  "/combine/contents/korean/haksa/PAGE_2502040648.css",
];

// CSS 파일 다운로드 함수
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

// 메인 실행 함수
async function generateCalendarHTML() {
  try {
    console.log("🚀 호서대학교 학사일정 크롤링 시작...");

    // 1. HTML 가져오기
    console.log("📄 HTML 데이터 가져오는 중...");
    const { data: html } = await axios.get(TARGET_URL, {
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

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

    // 4. CSS 파일들 다운로드
    let linkTags = [];
    for (const href of cssLinks) {
      const cssPath = await downloadCss(href);
      if (cssPath) {
        // assets 경로를 사용하여 올바른 정적 파일 경로 생성
        linkTags.push(`    <link href="/assets/${cssPath}" rel="stylesheet" type="text/css" />`);
      }
    }
    
    // 5. 학사일정 본문 추출
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

    // 6. 결과 HTML 생성
    const resultHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>호서대학교 2025학년도 학사일정</title>
  <!-- 다운로드된 CSS 파일들 -->
${linkTags.join('\\n')}
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

    // 7. 파일로 저장
    await fs.writeFile(OUTPUT_HTML, resultHtml, "utf-8");

    console.log("\\n🎉 학사일정 HTML 생성 완료!");
    console.log(`📁 저장 위치: ${OUTPUT_HTML}`);
    console.log(`📁 CSS 파일들: ${CSS_SAVE_DIR}`);
    
    return OUTPUT_HTML;
  } catch (error) {
    console.error("❌ 학사일정 HTML 생성 오류:", error.message);
    console.error(error.stack);
    throw error;
  }
}

// 모듈로 export
module.exports = {
  generateCalendarHTML,
  downloadCss
};

// 직접 실행 시
if (require.main === module) {
  generateCalendarHTML().catch(console.error);
}
