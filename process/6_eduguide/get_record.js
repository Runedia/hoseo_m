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
 * 호서대학교 학적 통합 크롤러
 * 설정 객체를 통해 여러 학적 페이지를 처리
 */

// 학적 설정 객체
const RECORD_CONFIGS = {
  test: {
    name: "시험",
    url: "http://www.hoseo.ac.kr/Home/Contents.mbz?action=MAPP_1708230096",
    fileName: "시험",
    description: "시험",
    excludeItems: ["온라인 강의 참여율"], // 시험 관련에서 제외할 항목
  },
  grade: {
    name: "성적",
    url: "http://www.hoseo.ac.kr/Home/Contents.mbz?action=MAPP_1708230102",
    fileName: "성적",
    description: "성적",
  },
  leave: {
    name: "휴학",
    url: "http://www.hoseo.ac.kr/Home/Contents.mbz?action=MAPP_1708230100",
    fileName: "휴학",
    description: "휴학",
  },
  return: {
    name: "복학",
    url: "http://www.hoseo.ac.kr/Home/Contents.mbz?action=MAPP_1708230101",
    fileName: "복학",
    description: "복학",
  },
  graduation: {
    name: "졸업",
    url: "http://www.hoseo.ac.kr/Home/Contents.mbz?action=MAPP_1708230099",
    fileName: "졸업",
    description: "졸업",
  },
};

/**
 * 학적 HTML 크롤링 및 저장
 * @param {string|string[]} type - 학적 타입 ('test', 'grade', 'leave', 'return', 'graduation') 또는 배열
 * @returns {Promise<Object|Object[]>} 크롤링 결과
 */
async function getRecord(type = "test") {
  const result = await processMultipleTypes(type, RECORD_CONFIGS, processSingleRecord);

  // 배열 결과인 경우 요약 출력
  if (Array.isArray(result)) {
    printCrawlingSummary(result, "학적 크롤링");
  }

  return result;
}

/**
 * 단일 학적 처리
 * @param {string} type - 학적 타입
 * @returns {Promise<Object>} 크롤링 결과
 */
async function processSingleRecord(type) {
  // 설정 확인
  const config = validateConfig(type, RECORD_CONFIGS, "학적");

  // 제외할 항목들
  const excludeItems = config.excludeItems || [];

  // 공통 크롤링 프로세스 실행
  return await crawlHoseoEduGuide(type, RECORD_CONFIGS, excludeItems);
}

/**
 * 사용 가능한 학적 타입 목록 반환
 * @returns {Array} 학적 설정 정보
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
 * 학적 전용 파싱 함수 (호환성 유지)
 * @param {string} htmlContent - HTML 콘텐츠
 * @param {string} type - 학적 타입
 * @returns {Object} 파싱된 데이터
 */
function parseRecordToStructuredJSON(htmlContent, type) {
  const excludeItems = RECORD_CONFIGS[type]?.excludeItems || [];
  return parseToStructuredJSON(htmlContent, type, excludeItems);
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
    console.log("\n🚀 사용법:");
    console.log("  node get_record.js test         # 시험만");
    console.log("  node get_record.js grade        # 성적만");
    console.log("  node get_record.js leave        # 휴학만");
    console.log("  node get_record.js return       # 복학만");
    console.log("  node get_record.js graduation   # 졸업만");
    console.log("  node get_record.js all          # 모든 학적 정보");
    return;
  }

  const type = args[0];

  // 'all' 키워드로 모든 학적 처리
  const targetTypes = type === "all" ? Object.keys(RECORD_CONFIGS) : [type];

  getRecord(targetTypes)
    .then((result) => {
      if (Array.isArray(result)) {
        console.log("🎉 전체 학적 크롤링 완료!");
      } else {
        console.log("🎉 학적 크롤링 성공!");
        console.log("결과:", result.stats);
        console.log(`📊 구조화된 데이터 샘플:`, Object.keys(result.structuredData).slice(0, 3));
      }
    })
    .catch((error) => {
      console.error("💥 학적 크롤링 실패:", error.message);
      process.exit(1);
    });
}

module.exports = {
  getRecord,
  getAvailableTypes,
  addRecordConfig,
  parseRecordToStructuredJSON,
  RECORD_CONFIGS,
  OUTPUT_DIR,
};
