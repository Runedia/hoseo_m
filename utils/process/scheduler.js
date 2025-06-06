const cron = require("node-cron");
const { exec } = require("child_process");
const path = require("path");

// 실행할 스크립트들 (순서대로)
const scripts = [
  path.join(process.cwd(), "process", "1_notice", "get_notice_list.js"),
  path.join(process.cwd(), "process", "4_menu", "get_menu_list.js"),
  path.join(process.cwd(), "process", "4_menu", "get_menu_list(happy_dorm).js"),
];

// 순차 실행 함수
const runScriptsSequentially = async () => {
  console.log("[스케줄러] 스크립트 실행 시작:", new Date().toLocaleString());

  for (let i = 0; i < scripts.length; i++) {
    try {
      await executeScript(scripts[i], i + 1);
    } catch (error) {
      console.error(`[스케줄러] 스크립트 ${i + 1} 실행 실패:`, error);
      // 한 스크립트가 실패해도 다음 스크립트는 계속 실행
    }
  }

  console.log("[스케줄러] 모든 스크립트 실행 완료:", new Date().toLocaleString());
};

// 개별 스크립트 실행 함수
const executeScript = (scriptPath, index) => {
  return new Promise((resolve, reject) => {
    const command = `node "${scriptPath}"`;
    console.log(`[스케줄러] 스크립트 ${index} 실행 중: ${command}`);

    exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[스케줄러] 스크립트 ${index} 에러:`, error);
        reject(error);
      } else {
        console.log(`[스케줄러] 스크립트 ${index} 완료`);
        if (stdout) console.log(`[스케줄러] 스크립트 ${index} 출력:`, stdout);
        if (stderr) console.warn(`[스케줄러] 스크립트 ${index} 경고:`, stderr);
        resolve();
      }
    });
  });
};

// 스케줄러 시작 함수
const startScheduler = () => {
  // 매시간 0분에 실행 (예: 1:00, 2:00, 3:00...)
  cron.schedule("0 * * * *", runScriptsSequentially);
  console.log("[스케줄러] 1시간마다 스크립트 실행 스케줄이 설정되었습니다.");
  console.log("[스케줄러] 다음 실행 시간: 매시간 정각");
};

module.exports = { startScheduler, runScriptsSequentially };
