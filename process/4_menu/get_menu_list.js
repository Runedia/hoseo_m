require("module-alias/register");

const axios = require("axios");
const cheerio = require("cheerio");
const pool = require("@root/utils/db");

// 탭 이름과 action 매핑
const TAB_ACTIONS = {
  천안: "MAPP_2312012408",
  아산: "MAPP_2312012409",
  // 당진: "MAPP_2312012410",
};

function changeLink(chidx, action) {
  return `http://www.hoseo.ac.kr/Home/BBSView.mbz?action=${action}&schIdx=${chidx}`;
}

async function parsePage($, tabName, action) {
  const searchTable = $("#example1");
  if (!searchTable.length) {
    console.warn(`⚠️ ${tabName} - 테이블을 찾을 수 없습니다.`);
    return [];
  }

  const rows = searchTable
    .find("tbody tr")
    .map((i, row) => {
      const tds = $(row).find("td");
      const href = $(tds[1]).find("a").attr("href") || "";
      let chidx = null;

      const match = href.match(/fn_viewData\('(\d+)'\)/);
      if (match) {
        chidx = match[1];
      }

      return {
        chidx: chidx,
        title: $(tds[1]).text().trim(),
        link: chidx ? changeLink(chidx, action) : null,
        author: $(tds[2]).text().trim(),
        date: $(tds[3]).text().trim(),
      };
    })
    .get();

  return rows;
}

async function insertMenuItem(action, menuItem) {
  const sql = `
    INSERT INTO TBL_Menu (idx, type, chidx, title, link, author, create_dt)
    VALUES (null, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
    action,
    menuItem.chidx,
    menuItem.title,
    menuItem.link,
    menuItem.author,
    menuItem.date,
  ];
  await pool.execute(sql, values);
}

async function fetchMenuItems(tabName, action) {
  const url = "https://www.hoseo.ac.kr/Home/BBSList.mbz";
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/124.0.0.0 Safari/537.36",
  };

  let maxPage = 1;

  for (let page = 1; page <= maxPage; page++) {
    const params = {
      action: action,
      pageIndex: page,
    };

    try {
      const response = await axios.get(url, { params, headers });
      const html = response.data;
      const $ = cheerio.load(html);

      if (page === 1) {
        const lastPageLink = $("#searchVO .pageNavi a").last();
        const pageNumMatch = lastPageLink.attr("onclick")?.match(/\d+/);
        maxPage = pageNumMatch ? parseInt(pageNumMatch[0]) : 1;
        console.log(`📄 ${tabName} 최대 페이지 수: ${maxPage}`);
      }

      const rows = await parsePage($, tabName, action);
      const chidxList = rows.map((r) => r.chidx).filter(Boolean);
      let rowsToInsert = rows;

      if (chidxList.length > 0) {
        const placeholders = chidxList.map(() => "?").join(",");
        const [result] = await pool.query(
          `SELECT chidx FROM TBL_Menu WHERE chidx IN (${placeholders})`,
          chidxList
        );
        const existingChidxSet = new Set(result.map((r) => r.chidx));
        rowsToInsert = rows.filter(
          (r) => r.chidx && !existingChidxSet.has(r.chidx)
        );

        // 모두 중복이면 종료 (페이지 루프 break)
        if (rowsToInsert.length === 0) {
          console.log(
            `⚡️ ${tabName} - ${page} 페이지는 전부 중복. 이후 페이지 크롤링 중단`
          );
          break;
        }
      }

      let successCount = 0;
      let duplicateCount = 0;

      for (const row of rowsToInsert) {
        try {
          await insertMenuItem(action, row);
          successCount++;
        } catch (err) {
          if (err.code === "ER_DUP_ENTRY") {
            duplicateCount++;
          } else {
            console.error(
              `❌ row insert 실패 (chidx: ${row.chidx}):`,
              err.message
            );
          }
        }
      }

      console.log(`✅ ${tabName} - ${page} 페이지 저장 완료`);
      console.log(
        `   총 ${rows.length}건 | 실제 insert: ${rowsToInsert.length} | 성공: ${successCount} | 중복: ${duplicateCount}`
      );
    } catch (err) {
      console.error(`❌ ${tabName} ${page}페이지 오류:`, err.message);
    }
  }
}

// 메인 실행 함수를 export
async function runGeneralMenuScraper() {
  console.log("📚 호서대학교 일반 사이트 데이터 수집 시작");

  for (const [tabName, action] of Object.entries(TAB_ACTIONS)) {
    console.log(`🚀 ${tabName} 데이터 수집 시작`);
    await fetchMenuItems(tabName, action);
    console.log(`✅ ${tabName} 데이터 수집 완료`);
  }
  console.log("✅ 호서대학교 일반 사이트 데이터 수집 완료");
}

// 직접 실행될 때만 메인 함수 호출
if (require.main === module) {
  (async () => {
    try {
      await runGeneralMenuScraper();
      console.log("🎉 모든 탭 데이터 수집 완료");
    } catch (err) {
      console.error("❌ 전체 처리 중 오류:", err.message);
    } finally {
      pool.end();
    }
  })();
}

module.exports = { runGeneralMenuScraper };