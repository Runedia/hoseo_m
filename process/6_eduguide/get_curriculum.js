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
 * 호서대학교 교육과정 통합 크롤러
 * 설정 객체를 통해 여러 교육과정 페이지를 처리
 */

// 교육과정 설정 객체
const CURRICULUM_CONFIGS = {
  basic: {
    name: "교육과정",
    url: "http://www.hoseo.ac.kr/Home/Contents.mbz?action=MAPP_1708290175",
    fileName: "교육과정",
    description: "기본 교육과정",
  },
  minor: {
    name: "부전공",
    url: "http://www.hoseo.ac.kr/Home/Contents.mbz?action=MAPP_1708230089",
    fileName: "교육과정_부전공",
    description: "부전공 교육과정",
  },
  double: {
    name: "복수전공",
    url: "http://www.hoseo.ac.kr/Home/Contents.mbz?action=MAPP_1708230090",
    fileName: "교육과정_복수전공",
    description: "복수전공 교육과정",
  },
};

/**
 * 교육과정 HTML 크롤링 및 저장
 * @param {string|string[]} type - 교육과정 타입 ('basic', 'minor', 'double') 또는 배열
 * @returns {Promise<Object|Object[]>} 크롤링 결과
 */
async function getCurriculum(type = "basic") {
  const result = await processMultipleTypes(type, CURRICULUM_CONFIGS, processSingleCurriculum);

  // 배열 결과인 경우 요약 출력
  if (Array.isArray(result)) {
    printCrawlingSummary(result, "교육과정 크롤링");
  }

  return result;
}

/**
 * 단일 교육과정 처리
 * @param {string} type - 교육과정 타입
 * @returns {Promise<Object>} 크롤링 결과
 */
async function processSingleCurriculum(type) {
  // 설정 확인
  const config = validateConfig(type, CURRICULUM_CONFIGS, "교육과정");

  // 제외할 항목들 (필요시 설정)
  const excludeItems = config.excludeItems || [];

  // 공통 크롤링 프로세스 실행
  return await crawlHoseoEduGuide(type, CURRICULUM_CONFIGS, excludeItems);
}

/**
 * 사용 가능한 교육과정 타입 목록 반환
 * @returns {Array} 교육과정 설정 정보
 */
function getAvailableTypes() {
  return getAvailableTypesUtil(CURRICULUM_CONFIGS);
}

/**
 * 새로운 교육과정 설정 추가 (동적 추가용)
 * @param {string} type - 교육과정 타입
 * @param {Object} config - 설정 객체
 */
function addCurriculumConfig(type, config) {
  addConfig(type, config, CURRICULUM_CONFIGS, "교육과정");
}

/**
 * 교육과정 전용 파싱 함수 (호환성 유지)
 * @param {string} htmlContent - HTML 콘텐츠
 * @param {string} type - 교육과정 타입
 * @returns {Object} 파싱된 데이터
 */
function parseCurriculumToStructuredJSON(htmlContent, type) {
  const excludeItems = CURRICULUM_CONFIGS[type]?.excludeItems || [];
  return parseToStructuredJSON(htmlContent, type, excludeItems);
}

// 직접 실행 시
if (require.main === module) {
  // 사용 예시
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("📋 사용 가능한 교육과정 타입:");
    getAvailableTypes().forEach((item) => {
      console.log(`  - ${item.type}: ${item.description}`);
    });
    console.log("\n🚀 사용법:");
    console.log("  node get_curriculum.js basic        # 기본 교육과정만");
    console.log("  node get_curriculum.js minor        # 부전공만");
    console.log("  node get_curriculum.js double       # 복수전공만");
    console.log("  node get_curriculum.js all          # 모든 교육과정");
    return;
  }

  const type = args[0];

  // 'all' 키워드로 모든 교육과정 처리
  const targetTypes = type === "all" ? Object.keys(CURRICULUM_CONFIGS) : [type];

  getCurriculum(targetTypes)
    .then((result) => {
      if (Array.isArray(result)) {
        console.log("🎉 전체 교육과정 크롤링 완료!");
      } else {
        console.log("🎉 교육과정 크롤링 성공!");
        console.log("결과:", result.stats);
        console.log(`📊 구조화된 데이터 샘플:`, Object.keys(result.structuredData).slice(0, 3));
      }
    })
    .catch((error) => {
      console.error("💥 교육과정 크롤링 실패:", error.message);
      process.exit(1);
    });
}

module.exports = {
  getCurriculum,
  getAvailableTypes,
  addCurriculumConfig,
  parseCurriculumToStructuredJSON,
  CURRICULUM_CONFIGS,
  OUTPUT_DIR,
};
