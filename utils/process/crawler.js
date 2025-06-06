require("module-alias/register");

const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

/**
 * 웹 크롤링 공통 유틸리티
 */

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.8,en-US;q=0.5,en;q=0.3",
  "Accept-Encoding": "gzip, deflate",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
};

/**
 * 웹페이지 크롤링 공통 함수
 * @param {string} url - 크롤링할 URL
 * @param {Object} options - 옵션
 * @param {string} options.description - 설명 (로그용)
 * @param {Object} options.headers - 커스텀 헤더
 * @param {number} options.timeout - 타임아웃 (ms)
 * @param {string} options.selector - 대상 셀렉터
 * @returns {Promise<string>} HTML 콘텐츠
 */
async function crawlWebPage(url, options = {}) {
  const { description = "페이지", headers = DEFAULT_HEADERS, timeout = 30000, selector = null } = options;

  console.log(`🔄 ${description} 크롤링 시작...`);
  console.log(`📍 대상 URL: ${url}`);

  try {
    const response = await axios.get(url, {
      headers,
      timeout,
    });

    console.log(`✅ 페이지 로드 완료 (상태: ${response.status})`);

    if (selector) {
      const $ = cheerio.load(response.data);
      const selectedElement = $(selector);

      if (selectedElement.length === 0) {
        throw new Error(`❌ 셀렉터 '${selector}' 요소를 찾을 수 없습니다.`);
      }

      console.log(`📊 '${selector}' 요소 발견: ${selectedElement.length}개`);
      const content = selectedElement.html();

      if (!content || content.trim() === "") {
        throw new Error(`❌ ${description} 내용이 비어있습니다.`);
      }

      return content;
    }

    return response.data;
  } catch (error) {
    console.error(`❌ ${description} 크롤링 실패:`, error.message);
    throw error;
  }
}

/**
 * 호서대학교 학사 페이지 크롤링 (sub-step 전용)
 * @param {string} url - 크롤링할 URL
 * @param {string} description - 설명 (로그용)
 * @returns {Promise<string>} HTML 콘텐츠
 */
async function crawlHoseoEduPage(url, description = "학사 페이지") {
  console.log(`🔄 ${description} 크롤링 시작...`);
  console.log(`📍 대상 URL: ${url}`);

  const response = await axios.get(url, {
    headers: DEFAULT_HEADERS,
    timeout: 30000,
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
 * 호서대학교 공지사항 크롤링
 * @param {string} url - 크롤링할 URL
 * @param {string} description - 설명 (로그용)
 * @returns {Promise<Object>} 크롤링 결과
 */
async function crawlHoseoNotice(url, description = "공지사항") {
  console.log(`🔄 ${description} 크롤링 시작...`);
  console.log(`📍 대상 URL: ${url}`);

  const response = await axios.get(url, {
    headers: DEFAULT_HEADERS,
    timeout: 30000,
  });

  console.log(`✅ 페이지 로드 완료 (상태: ${response.status})`);

  const $ = cheerio.load(response.data);

  // 본문 영역 추출
  let boardContent = $("#board_item_list");
  if (!boardContent.length || !boardContent.html() || !boardContent.text().trim()) {
    boardContent = $(".bbs-view-content");
  }

  if (!boardContent.length) {
    throw new Error("본문 영역을 찾을 수 없습니다.");
  }

  return {
    $: $,
    boardContent: boardContent,
    html: response.data,
  };
}

/**
 * 여러 URL을 병렬로 크롤링
 * @param {Array} urls - URL 배열 또는 {url, description} 객체 배열
 * @param {Object} options - 옵션
 * @returns {Promise<Array>} 크롤링 결과 배열
 */
async function crawlMultiplePages(urls, options = {}) {
  console.log(`🔄 ${urls.length}개 페이지 병렬 크롤링 시작...`);

  const promises = urls.map(async (urlInfo, index) => {
    const url = typeof urlInfo === "string" ? urlInfo : urlInfo.url;
    const description = typeof urlInfo === "string" ? `페이지 ${index + 1}` : urlInfo.description;

    try {
      const content = await crawlWebPage(url, { ...options, description });
      return { success: true, url, content, description };
    } catch (error) {
      console.error(`❌ ${description} 크롤링 실패:`, error.message);
      return { success: false, url, error: error.message, description };
    }
  });

  const results = await Promise.all(promises);

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.length - successCount;

  console.log(`✅ 병렬 크롤링 완료 - 성공: ${successCount}개, 실패: ${failCount}개`);

  return results;
}

/**
 * 크롤링 재시도 함수
 * @param {Function} crawlFunction - 크롤링 함수
 * @param {Array} args - 함수 인자
 * @param {number} maxRetries - 최대 재시도 횟수
 * @param {number} delay - 재시도 간격 (ms)
 * @returns {Promise} 크롤링 결과
 */
async function crawlWithRetry(crawlFunction, args = [], maxRetries = 3, delay = 2000) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 크롤링 시도 ${attempt}/${maxRetries}...`);
      const result = await crawlFunction(...args);
      console.log(`✅ 크롤링 성공 (${attempt}번째 시도)`);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`❌ 크롤링 실패 (${attempt}번째 시도):`, error.message);

      if (attempt < maxRetries) {
        console.log(`⏱️ ${delay}ms 후 재시도...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`크롤링 ${maxRetries}회 시도 모두 실패: ${lastError.message}`);
}

/**
 * 파일 다운로드 함수
 * @param {string} fileUrl - 파일 URL
 * @param {string} destPath - 저장 경로
 * @param {Object} options - 옵션
 * @returns {Promise<void>}
 */
async function downloadFile(fileUrl, destPath, options = {}) {
  const { headers = DEFAULT_HEADERS, timeout = 30000, createDir = true } = options;

  if (createDir) {
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const writer = fs.createWriteStream(destPath);
  const response = await axios({
    url: fileUrl,
    method: "GET",
    responseType: "stream",
    headers,
    timeout,
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

module.exports = {
  DEFAULT_HEADERS,
  crawlWebPage,
  crawlHoseoEduPage,
  crawlHoseoNotice,
  crawlMultiplePages,
  crawlWithRetry,
  downloadFile,
};
