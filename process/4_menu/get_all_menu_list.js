require("module-alias/register");

const pool = require("@root/utils/db");
const { runGeneralMenuScraper } = require("./get_menu_list");
const { runHappyDormScraper } = require("./get_menu_list(happy_dorm)");

async function runAllScrapers() {
    console.log("🎯 호서대학교 전체 메뉴 데이터 수집 시작");
    console.log("=".repeat(60));

    try {
        // 1. 호서대학교 일반 사이트들 (천안, 아산, 당진)
        await runGeneralMenuScraper();

        console.log("=".repeat(60));

        // 2. 행복기숙사
        await runHappyDormScraper();

        console.log("=".repeat(60));
        console.log("🎉 전체 데이터 수집 완료!");

    } catch (err) {
        console.error("❌ 전체 처리 중 오류:", err.message);
    } finally {
        pool.end();
    }
}

// 메인 실행
if (require.main === module) {
    runAllScrapers();
}

module.exports = { runAllScrapers };