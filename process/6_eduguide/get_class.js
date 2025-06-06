require("module-alias/register");

const {
  processMultipleTypes,
  validateConfig,
  getAvailableTypes: getAvailableTypesUtil,
  addConfig,
  crawlHoseoEduGuide,
  printCrawlingSummary,
  OUTPUT_DIR,
} = require("@root/utils/process/process");
const { parseToStructuredJSON } = require("@root/utils/process/parser");

/**
 * 호서대학교 수업 통합 크롤러
 * 설정 객체를 통해 여러 수업 페이지를 처리
 */

// 수업 설정 객체
const CLASS_CONFIGS = {
  regist: {
    name: "수강신청",
    url: "http://www.hoseo.ac.kr/Home/Contents.mbz?action=MAPP_1708230095",
    fileName: "수강신청",
    description: "수강신청",
  },
  season: {
    name: "계절학기",
    url: "http://www.hoseo.ac.kr/Home/Contents.mbz?action=MAPP_1708230098",
    fileName: "계절학기",
    description: "계절학기",
  },
  attendance: {
    name: "학생출결사항점검",
    url: "http://www.hoseo.ac.kr/Home/Contents.mbz?action=MAPP_1708230097",
    fileName: "학생출결사항점검",
    description: "학생출결사항점검",
  },
};

/**
 * 수업 HTML 크롤링 및 저장
 * @param {string|string[]} type - 수업 타입 ('regist', 'season', 'attendance') 또는 배열
 * @returns {Promise<Object|Object[]>} 크롤링 결과
 */
async function getClass(type = "regist") {
  const result = await processMultipleTypes(type, CLASS_CONFIGS, processSingleClass);

  // 배열 결과인 경우 요약 출력
  if (Array.isArray(result)) {
    printCrawlingSummary(result, "수업 크롤링");
  }

  return result;
}

/**
 * 단일 수업 처리
 * @param {string} type - 수업 타입
 * @returns {Promise<Object>} 크롤링 결과
 */
async function processSingleClass(type) {
  // 설정 확인
  const config = validateConfig(type, CLASS_CONFIGS, "수업");

  // 제외할 항목들 (필요시 설정)
  const excludeItems = config.excludeItems || [];

  // 공통 크롤링 프로세스 실행
  return await crawlHoseoEduGuide(type, CLASS_CONFIGS, excludeItems);
}

/**
 * 사용 가능한 수업 타입 목록 반환
 * @returns {Array} 수업 설정 정보
 */
function getAvailableTypes() {
  return getAvailableTypesUtil(CLASS_CONFIGS);
}

/**
 * 새로운 수업 설정 추가 (동적 추가용)
 * @param {string} type - 수업 타입
 * @param {Object} config - 설정 객체
 */
function addClassConfig(type, config) {
  addConfig(type, config, CLASS_CONFIGS, "수업");
}

/**
 * 수업 전용 파싱 함수 (호환성 유지)
 * @param {string} htmlContent - HTML 콘텐츠
 * @param {string} type - 수업 타입
 * @returns {Object} 파싱된 데이터
 */
function parseClassToStructuredJSON(htmlContent, type) {
  const excludeItems = CLASS_CONFIGS[type]?.excludeItems || [];
  return parseToStructuredJSON(htmlContent, type, excludeItems);
}

// 직접 실행 시
if (require.main === module) {
  // 사용 예시
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("📋 사용 가능한 수업 타입:");
    getAvailableTypes().forEach((item) => {
      console.log(`  - ${item.type}: ${item.description}`);
    });
    console.log("\n🚀 사용법:");
    console.log("  node get_class.js regist        # 수강신청만");
    console.log("  node get_class.js season        # 계절학기만");
    console.log("  node get_class.js attendance    # 출결사항점검만");
    console.log("  node get_class.js all           # 모든 수업 정보");
    return;
  }

  const type = args[0];

  // 'all' 키워드로 모든 수업 처리
  const targetTypes = type === "all" ? Object.keys(CLASS_CONFIGS) : [type];

  getClass(targetTypes)
    .then((result) => {
      if (Array.isArray(result)) {
        console.log("🎉 전체 수업 크롤링 완료!");
      } else {
        console.log("🎉 수업 크롤링 성공!");
        console.log("결과:", result.stats);
        console.log(`📊 구조화된 데이터 샘플:`, Object.keys(result.structuredData).slice(0, 3));
      }
    })
    .catch((error) => {
      console.error("💥 수업 크롤링 실패:", error.message);
      process.exit(1);
    });
}

module.exports = {
  getClass,
  getAvailableTypes,
  addClassConfig,
  parseClassToStructuredJSON,
  CLASS_CONFIGS,
  OUTPUT_DIR,
};
