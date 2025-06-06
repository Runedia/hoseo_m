require("module-alias/register");

const pool = require("@root/utils/db");
const { crawlWebPage } = require("@root/utils/process/crawler");

// 탭 이름과 schCategorycode 매핑
const TAB_CODES = {
  일반공지: "CTG_17082400011",
  융합교육: "CTG_24050300117",
  학사공지: "CTG_17082400012",
  교직_평생교육사: "CTG_23120500114",
  장학공지: "CTG_17082400013",
  사회봉사: "CTG_17082400014",
  외부공지: "CTG_20012200070",
  취업공지: "CTG_20120400086",
};

// 공지사항 설정
const NOTICE_CONFIG = {
  baseUrl: "https://www.hoseo.ac.kr/Home/BBSList.mbz",
  viewBaseUrl: "https://www.hoseo.ac.kr/Home/BBSView.mbz",
  action: "MAPP_1708240139",
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/124.0.0.0 Safari/537.36",
    Accept: "application/json, text/javascript, */*; q=0.01",
    Referer: "https://www.hoseo.ac.kr/",
    "X-Requested-With": "XMLHttpRequest",
  },
};

function changeLink(chidx) {
  return `${NOTICE_CONFIG.viewBaseUrl}?action=${NOTICE_CONFIG.action}&schIdx=${chidx}`;
}

async function parsePage($, tabName) {
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
        link: chidx ? changeLink(chidx) : null,
        author: $(tds[2]).text().trim(),
        date: $(tds[3]).text().trim(),
      };
    })
    .get();

  return rows;
}

async function insertNotice(categoryCode, notice) {
  const sql = `
    INSERT INTO TBL_Notice (idx, type, chidx, title, link, author, create_dt)
    VALUES (null, ?, ?, ?, ?, ?, ?)
  `;
  const values = [categoryCode, notice.chidx, notice.title, notice.link, notice.author, notice.date];
  await pool.execute(sql, values);
}

async function fetchAllNotices(tabName, categoryCode) {
  let maxPage = 1;

  for (let page = 1; page <= maxPage; page++) {
    const url = `${NOTICE_CONFIG.baseUrl}?action=${NOTICE_CONFIG.action}&schCategorycode=${categoryCode}&pageIndex=${page}`;

    try {
      // 공통 크롤링 함수 사용
      const html = await crawlWebPage(url, {
        description: `${tabName} 공지사항 목록 (페이지 ${page})`,
        headers: NOTICE_CONFIG.headers,
      });

      const cheerio = require("cheerio");
      const $ = cheerio.load(html);

      if (page === 1) {
        const lastPageLink = $("#searchVO .pageNavi a").last();
        const pageNumMatch = lastPageLink.attr("onclick")?.match(/\d+/);
        maxPage = pageNumMatch ? parseInt(pageNumMatch[0]) : 1;
        console.log(`📄 ${tabName} 최대 페이지 수: ${maxPage}`);
      }

      const rows = await parsePage($, tabName);
      const chidxList = rows.map((r) => r.chidx).filter(Boolean);
      let rowsToInsert = rows;

      if (chidxList.length > 0) {
        const placeholders = chidxList.map(() => "?").join(",");
        const [result] = await pool.query(`SELECT chidx FROM TBL_Notice WHERE chidx IN (${placeholders})`, chidxList);
        const existingChidxSet = new Set(result.map((r) => r.chidx));
        rowsToInsert = rows.filter((r) => r.chidx && !existingChidxSet.has(r.chidx));

        // 모두 중복이면 종료 (페이지 루프 break)
        if (rowsToInsert.length === 0) {
          console.log(`⚡️ ${tabName} - ${page} 페이지는 전부 중복. 이후 페이지 크롤링 중단`);
          break;
        }
      }

      let successCount = 0;
      let duplicateCount = 0;

      for (const row of rowsToInsert) {
        try {
          await insertNotice(categoryCode, row);
          successCount++;
        } catch (err) {
          if (err.code === "ER_DUP_ENTRY") {
            duplicateCount++;
          } else {
            console.error(`❌ row insert 실패 (chidx: ${row.chidx}):`, err.message);
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

// 메인 실행 함수
async function runNoticeListScraper() {
  console.log("🔔 호서대학교 공지사항 목록 수집 시작");

  for (const [tabName, categoryCode] of Object.entries(TAB_CODES)) {
    console.log(`🚀 ${tabName} 데이터 수집 시작`);
    await fetchAllNotices(tabName, categoryCode);
    console.log(`✅ ${tabName} 데이터 수집 완료`);
  }

  console.log("🎉 전체 공지사항 목록 수집 완료");
}

// 직접 실행될 때만 메인 함수 호출
if (require.main === module) {
  (async () => {
    try {
      await runNoticeListScraper();
    } catch (err) {
      console.error("❌ 전체 처리 중 오류:", err.message);
    } finally {
      pool.end();
    }
  })();
}

module.exports = { runNoticeListScraper };
