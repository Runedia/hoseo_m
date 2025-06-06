require("module-alias/register");

const path = require("path");
const { processShuttleSchedule } = require("@root/utils/shuttle");

// 일요일(공휴일) 시간표 처리
async function processSundaySchedule() {
  const shuttleDir = __dirname;
  const outputDir = path.join(process.cwd(), "assets");

  return await processShuttleSchedule("sunday", shuttleDir, outputDir);
}

// 실행
if (require.main === module) {
  (async () => {
    try {
      await processSundaySchedule();
      console.log("🎉 일요일(공휴일) 셔틀 시간표 처리 완료!");
    } catch (err) {
      console.error("❌ 처리 중 오류:", err.message);
      process.exit(1);
    }
  })();
}

module.exports = {
  processSundaySchedule,
};
