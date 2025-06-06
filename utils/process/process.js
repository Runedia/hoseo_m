require("module-alias/register");

const { crawlHoseoEduPage } = require("@root/utils/process/crawler");
const { parseToStructuredJSON } = require("@root/utils/process/parser");
const { saveHtmlFile, saveJsonFile, saveErrorInfo } = require("@root/utils/process/file");
const path = require("path");

/**
 * 크롤링 프로세스 공통 유틸리티
 */

const OUTPUT_DIR = path.join(process.cwd(), "assets", "static");

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
    const content = await crawlHoseoEduPage(TARGET_URL, config.description);

    // 2. HTML 파일 저장
    saveHtmlFile(content, config.name, OUTPUT_FILE);

    // 3. 구조화된 JSON 데이터 생성 및 저장
    console.log("🔄 HTML을 구조화된 JSON으로 파싱 중...");
    const structuredData = excludeItems ? parseFunction(content, type, excludeItems) : parseFunction(content, type);

    saveJsonFile(structuredData, JSON_FILE, { logName: config.fileName });

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
    saveErrorInfo(error, type, config, TARGET_URL, OUTPUT_DIR);
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
 * 호서대학교 학사 정보 크롤링 프로세스
 * @param {string} type - 타입
 * @param {Object} configs - 설정 객체들
 * @param {Array} excludeItems - 제외할 항목들 (선택적)
 * @returns {Promise<Object>} 크롤링 결과
 */
async function crawlHoseoEduGuide(type, configs, excludeItems = []) {
  const config = validateConfig(type, configs, "학사정보");

  return await executeCrawlingProcess(config, type, parseToStructuredJSON, excludeItems);
}

/**
 * 크롤링 결과 통계 생성
 * @param {Array} results - 크롤링 결과 배열
 * @returns {Object} 통계 정보
 */
function generateCrawlingStats(results) {
  const stats = {
    total: results.length,
    success: 0,
    failed: 0,
    totalContent: 0,
    totalSections: 0,
    details: [],
  };

  results.forEach((result) => {
    if (result.success) {
      stats.success++;
      if (result.stats) {
        stats.totalContent += result.stats.contentLength || 0;
        stats.totalSections += result.stats.structuredSections || 0;
      }
      stats.details.push({
        type: result.type,
        status: "success",
        contentLength: result.stats?.contentLength || 0,
        sections: result.stats?.structuredSections || 0,
      });
    } else {
      stats.failed++;
      stats.details.push({
        type: result.type,
        status: "failed",
        error: result.error,
      });
    }
  });

  return stats;
}

/**
 * 크롤링 결과 요약 출력
 * @param {Array} results - 크롤링 결과 배열
 * @param {string} category - 카테고리명
 */
function printCrawlingSummary(results, category = "크롤링") {
  const stats = generateCrawlingStats(results);

  console.log(`\n=== ${category} 완료 요약 ===`);
  console.log(`총 처리: ${stats.total}개`);
  console.log(`성공: ${stats.success}개`);
  console.log(`실패: ${stats.failed}개`);

  if (stats.success > 0) {
    console.log(`총 콘텐츠 길이: ${stats.totalContent.toLocaleString()}자`);
    console.log(`총 구조화된 섹션: ${stats.totalSections}개`);
  }

  // 실패한 항목 상세 출력
  if (stats.failed > 0) {
    console.log(`\n❌ 실패한 항목:`);
    stats.details
      .filter((d) => d.status === "failed")
      .forEach((detail) => {
        console.log(`  - ${detail.type}: ${detail.error}`);
      });
  }
}

/**
 * 크롤링 재시도 래퍼
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

module.exports = {
  OUTPUT_DIR,
  validateConfig,
  getAvailableTypes,
  addConfig,
  executeCrawlingProcess,
  processMultipleTypes,
  crawlHoseoEduGuide,
  generateCrawlingStats,
  printCrawlingSummary,
  crawlWithRetry,
};
