const path = require("path");
const {
  executeCrawlingProcess,
  processMultipleTypes,
  validateConfig,
  getAvailableTypes: getAvailableTypesUtil,
  addConfig,
  OUTPUT_DIR,
} = require("./utils/crawler");
const { parseToStructuredJSON, parseBasicData } = require("./utils/parser");

/**
 * 호서대학교 학적 통합 크롤러
 * 설정 객체를 통해 여러 학적 페이지를 처리
 */

// 학적 설정 객체
const RECORD_CONFIGS = {
  test: {
    name: "시험",
    url: "http://www.hoseo.ac.kr/Home/Contents.mbz?action=MAPP_1708230107",
    fileName: "시험",
    description: "시험",
  },
  evaluation: {
    name: "평가",
    url: "http://www.hoseo.ac.kr/Home/Contents.mbz?action=MAPP_1708230108",
    fileName: "평가",
    description: "평가",
    excludeItems: ["평균 성적산출"], // 제외할 항목들
  },
  warning: {
    name: "학사경고",
    url: "http://www.hoseo.ac.kr/Home/Contents.mbz?action=MAPP_1708230109",
    fileName: "학사경고",
    description: "학사경고",
  },
  change_major: {
    name: "전공변경",
    url: "http://www.hoseo.ac.kr/Home/Contents.mbz?action=MAPP_1708230110",
    fileName: "전공변경",
    description: "전공변경",
  },
};

/**
 * 학적 HTML 크롤링 및 저장
 * @param {string|string[]} type - 학적 타입 ('test', 'evaluation', 'warning', 'change_major') 또는 배열
 * @returns {Promise<Object|Object[]>} 크롤링 결과
 */
async function getRecord(type = "test") {
  return await processMultipleTypes(type, RECORD_CONFIGS, processSingleRecord);
}

/**
 * 단일 학적 처리
 * @param {string} type - 학적 타입
 * @returns {Promise<Object>} 크롤링 결과
 */
async function processSingleRecord(type) {
  // 설정 확인
  const config = validateConfig(type, RECORD_CONFIGS, "학적");

  // 공통 크롤링 프로세스 실행
  return await executeCrawlingProcess(config, type, parseRecordToStructuredJSON);
}

/**
 * 학적 전용 파싱 함수 (공통 파서 래핑)
 * @param {string} htmlContent - HTML 콘텐츠
 * @param {string} type - 학적 타입
 * @returns {Object} 파싱된 데이터
 */
function parseRecordToStructuredJSON(htmlContent, type) {
  return parseToStructuredJSON(htmlContent, type, RECORD_CONFIGS);
}

/**
 * 사용 가능한 학적 타입 목록 반환
 * @returns {Object} 학적 설정 정보
 */
function getAvailableTypes() {
  return getAvailableTypesUtil(RECORD_CONFIGS);
}

/**
 * 새로운 학적 설정 추가 (동적 추가용)
 * @param {string} type - 학적 타입
 * @param {Object} config - 설정 객체
 */
function addRecordConfig(type, config) {
  addConfig(type, config, RECORD_CONFIGS, "학적");
}

/**
 * 기존 파싱 함수 (호환성 유지)
 */
function parseRecordData(htmlContent) {
  return parseBasicData(htmlContent);
}

// 직접 실행 시
if (require.main === module) {
  // 사용 예시
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("📋 사용 가능한 학적 타입:");
    getAvailableTypes().forEach((item) => {
      console.log(`  - ${item.type}: ${item.description}`);
    });
    return;
  }

  const type = args[0];

  // 'all' 키워드로 모든 학적 처리
  const targetTypes = type === "all" ? Object.keys(RECORD_CONFIGS) : [type];

  getRecord(targetTypes)
    .then((result) => {
      if (Array.isArray(result)) {
        console.log("🎉 전체 크롤링 완료!");
        result.forEach((item, index) => {
          if (item.success) {
            console.log(`${index + 1}. ${item.config.description}: ✅`);
            console.log(`   섹션 수: ${item.stats.structuredSections}개`);
          } else {
            console.log(`${index + 1}. ${item.type}: ❌ ${item.error}`);
          }
        });
      } else {
        console.log("🎉 크롤링 성공!");
        console.log("결과:", result.stats);
        console.log(`📊 구조화된 데이터 샘플:`, Object.keys(result.structuredData).slice(0, 3));
      }
    })
    .catch((error) => {
      console.error("💥 크롤링 실패:", error.message);
      process.exit(1);
    });
}

module.exports = {
  getRecord,
  getAvailableTypes,
  addRecordConfig,
  parseRecordData,
  parseRecordToStructuredJSON,
  RECORD_CONFIGS,
  OUTPUT_DIR,
};
