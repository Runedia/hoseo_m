const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

/**
 * 호서대학교 크롤링 공통 유틸리티
 */

const OUTPUT_DIR = path.join(process.cwd(), "assets", "static");

/**
 * 웹페이지 크롤링 공통 함수
 * @param {string} url - 크롤링할 URL
 * @param {string} description - 설명 (로그용)
 * @returns {Promise<string>} HTML 콘텐츠
 */
async function crawlWebPage(url, description = "페이지") {
  console.log(`🔄 ${description} 크롤링 시작...`);
  console.log(`📍 대상 URL: ${url}`);

  const response = await axios.get(url, {
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

  const $ = cheerio.load(response.data);

  // 대상 요소 추출: #body > .sub-step
  const bodyElement = $("#body");
  if (bodyElement.length === 0) {
    throw new Error("❌ #body 요소를 찾을 수 없습니다.");
  }

  const subStepElement = bodyElement.find(".sub-step");
  if (subStepElement.length === 0) {
    throw new Error("❌ .sub-step 요소를 찾을 수 없습니다.");
  }

  console.log(`📊 .sub-step 요소 발견: ${subStepElement.length}개`);

  const content = subStepElement.html();

  if (!content || content.trim() === "") {
    throw new Error(`❌ ${description} 내용이 비어있습니다.`);
  }

  return content;
}

/**
 * HTML 파일 생성 및 저장
 * @param {string} content - HTML 콘텐츠
 * @param {string} title - 페이지 제목
 * @param {string} outputPath - 출력 파일 경로
 */
function saveHtmlFile(content, title, outputPath) {
  // assets 디렉토리 생성
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log("📁 assets 디렉토리 생성 완료");
  }

  const fullHtml = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>호서대학교 ${title}</title>
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
        ${content}
    </div>
</body>
</html>`;

  fs.writeFileSync(outputPath, fullHtml, "utf-8");
  console.log(`💾 HTML 파일 저장 완료: ${outputPath}`);
}

/**
 * JSON 파일 저장
 * @param {Object} data - 저장할 데이터
 * @param {string} outputPath - 출력 파일 경로
 * @param {string} fileName - 파일명 (로그용)
 */
function saveJsonFile(data, outputPath, fileName) {
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`💾 ${fileName}.json 파일 저장 완료: ${outputPath}`);
}

/**
 * 에러 정보 저장
 * @param {Error} error - 에러 객체
 * @param {string} type - 타입
 * @param {Object} config - 설정 객체
 * @param {string} url - URL
 * @param {string} outputDir - 출력 디렉토리
 */
function saveErrorInfo(error, type, config, url, outputDir = OUTPUT_DIR) {
  const errorData = {
    type: type,
    config: config,
    error: true,
    message: error.message,
    url: url,
    timestamp: new Date().toISOString(),
    stack: error.stack,
  };

  const errorFile = path.join(outputDir, `${config.fileName}_error.json`);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(errorFile, JSON.stringify(errorData, null, 2), "utf-8");
  console.log(`💾 에러 정보 저장: ${errorFile}`);
}

/**
 * 공통 크롤링 프로세스 실행
 * @param {Object} config - 설정 객체
 * @param {string} type - 타입
 * @param {Function} parseFunction - 파싱 함수
 * @param {Array} excludeItems - 제외할 항목들 (선택적)
 * @returns {Promise<Object>} 크롤링 결과
 */
async function executeCrawlingProcess(config, type, parseFunction, excludeItems = null) {
  const TARGET_URL = config.url;
  const OUTPUT_FILE = path.join(OUTPUT_DIR, `${config.fileName}.html`);
  const JSON_FILE = path.join(OUTPUT_DIR, `${config.fileName}.json`);

  try {
    // 1. 웹페이지 크롤링
    const content = await crawlWebPage(TARGET_URL, config.description);

    // 2. HTML 파일 저장
    saveHtmlFile(content, config.name, OUTPUT_FILE);

    // 3. 구조화된 JSON 데이터 생성 및 저장
    console.log("🔄 HTML을 구조화된 JSON으로 파싱 중...");
    const structuredData = excludeItems ? parseFunction(content, type, excludeItems) : parseFunction(content, type);

    saveJsonFile(structuredData, JSON_FILE, config.fileName);

    console.log(`✅ ${config.description} 크롤링 완료!`);
    console.log(`📄 콘텐츠 길이: ${content.length}자`);
    console.log(`🔍 구조화된 섹션 개수: ${Object.keys(structuredData).length}개`);

    return {
      type: type,
      config: config,
      success: true,
      htmlFile: OUTPUT_FILE,
      jsonFile: JSON_FILE,
      content: content,
      structuredData: structuredData,
      stats: {
        hasContent: true,
        contentLength: content.length,
        structuredSections: Object.keys(structuredData).length,
      },
    };
  } catch (error) {
    console.error(`❌ ${config.description} 크롤링 실패:`, error.message);
    saveErrorInfo(error, type, config, TARGET_URL);
    throw error;
  }
}

/**
 * 다중 타입 처리
 * @param {Array|string} types - 처리할 타입들
 * @param {Object} configs - 설정 객체들
 * @param {Function} singleProcessor - 단일 타입 처리 함수
 * @returns {Promise<Array|Object>} 처리 결과
 */
async function processMultipleTypes(types, configs, singleProcessor) {
  // 배열로 전달된 경우 여러 개 처리
  if (Array.isArray(types)) {
    console.log(`🔄 여러 항목 크롤링 시작: ${types.join(", ")}`);
    const results = [];

    for (const type of types) {
      try {
        const result = await singleProcessor(type);
        results.push(result);
      } catch (error) {
        console.error(`❌ ${type} 크롤링 실패:`, error.message);
        results.push({
          type: type,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  // 단일 타입 처리
  return await singleProcessor(types);
}

/**
 * 설정 유효성 검사
 * @param {string} type - 타입
 * @param {Object} configs - 설정 객체들
 * @param {string} entityName - 엔티티명 (로그용)
 * @returns {Object} 검증된 설정
 */
function validateConfig(type, configs, entityName = "항목") {
  const config = configs[type];
  if (!config) {
    throw new Error(
      `❌ 지원하지 않는 ${entityName} 타입: ${type}. 사용 가능한 타입: ${Object.keys(configs).join(", ")}`
    );
  }
  return config;
}

/**
 * 사용 가능한 타입 목록 반환
 * @param {Object} configs - 설정 객체들
 * @returns {Array} 타입 목록
 */
function getAvailableTypes(configs) {
  return Object.keys(configs).map((key) => ({
    type: key,
    name: configs[key].name,
    description: configs[key].description,
  }));
}

/**
 * 새로운 설정 추가
 * @param {string} type - 타입
 * @param {Object} config - 설정 객체
 * @param {Object} configs - 설정 객체들
 * @param {string} entityName - 엔티티명
 */
function addConfig(type, config, configs, entityName = "항목") {
  const requiredFields = ["name", "url", "fileName", "description"];

  for (const field of requiredFields) {
    if (!config[field]) {
      throw new Error(`❌ 필수 설정 필드가 누락되었습니다: ${field}`);
    }
  }

  configs[type] = config;
  console.log(`✅ 새로운 ${entityName} 설정 추가: ${type} (${config.name})`);
}

module.exports = {
  OUTPUT_DIR,
  crawlWebPage,
  saveHtmlFile,
  saveJsonFile,
  saveErrorInfo,
  executeCrawlingProcess,
  processMultipleTypes,
  validateConfig,
  getAvailableTypes,
  addConfig,
};
