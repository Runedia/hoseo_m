require("module-alias/register");

const path = require("path");
const { processAllShuttleSchedules } = require("@root/utils/shuttle");

/**
 * 모든 셔틀 시간표 통합 처리
 *
 * 월금, 토요일, 일요일(공휴일) 시간표를 모두 처리합니다.
 */
async function processAllSchedules() {
  const shuttleDir = __dirname;
  const outputDir = path.join(process.cwd(), "assets");

  console.log("🚌 호서대학교 셔틀버스 시간표 전체 처리 시작");

  try {
    const results = await processAllShuttleSchedules(shuttleDir, outputDir);

    // 결과 요약 출력
    console.log("\n📊 처리 결과 요약:");
    for (const [scheduleType, result] of Object.entries(results)) {
      if (result.error) {
        console.log(`❌ ${scheduleType}: ${result.error}`);
      } else {
        console.log(`✅ ${scheduleType}: ${result.dataCount}개 시간표 처리 완료`);
      }
    }

    return results;
  } catch (error) {
    console.error("❌ 전체 셔틀 시간표 처리 실패:", error.message);
    throw error;
  }
}

// 실행
if (require.main === module) {
  (async () => {
    try {
      await processAllSchedules();
      console.log("🎉 모든 셔틀 시간표 처리 완료!");
    } catch (err) {
      console.error("❌ 처리 중 오류:", err.message);
      process.exit(1);
    }
  })();
}

module.exports = {
  processAllSchedules,
};
