require("module-alias/register");

const axios = require("axios");
const cheerio = require("cheerio");
const pool = require("@root/utils/db");

// 행복기숙사 설정
const HAPPY_DORM_CONFIG = {
  name: "행복기숙사",
  domain: "happydorm.hoseo.ac.kr",
  baseUrl: "https://happydorm.hoseo.ac.kr/board/nutrition/list",
  viewUrl: "https://happydorm.hoseo.ac.kr/board/nutrition/view",
};

function createViewLink(idx) {
  return `${HAPPY_DORM_CONFIG.viewUrl}?idx=${idx}`;
}

async function parsePage($) {
  const menuItems = [];

  // .lineList-ul li 요소들을 순회
  $(".lineList-ul li").each((index, element) => {
    const $item = $(element);

    // 번호 추출
    const num = $item.find(".num").text().trim();

    // 제목과 링크 추출
    const $titleLink = $item.find(".tit-link");
    const title = $titleLink
      .text()
      .trim()
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ");
    const href = $titleLink.attr("href") || "";

    // idx 추출 (URL에서)
    let idx = null;
    const idxMatch = href.match(/idx=(\d+)/);
    if (idxMatch) {
      idx = idxMatch[1];
    }

    // 작성자 추출
    const writerText = $item.find(".writer").text().trim();
    const author = writerText.replace("작성자 : ", "").replace(/\s+$/, "");

    // 날짜 추출
    const dateText = $item.find(".date").text().trim();
    const dateMatch = dateText.match(/(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch ? dateMatch[1] : "";

    if (idx && title && date) {
      menuItems.push({
        num: num,
        idx: idx,
        title: title,
        link: createViewLink(idx),
        author: author,
        date: date,
      });
    }
  });

  return menuItems;
}

async function insertMenuItem(menuItem) {
  const sql = `
    INSERT INTO TBL_Menu (idx, type, chidx, title, link, author, create_dt)
    VALUES (null, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
    "HAPPY_DORM_NUTRITION", // type으로 행복기숙사 구분
    menuItem.idx,
    menuItem.title,
    menuItem.link,
    menuItem.author,
    menuItem.date,
  ];
  await pool.execute(sql, values);
}

async function fetchHappyDormMenuItems() {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/124.0.0.0 Safari/537.36",
  };

  let currentPage = 1;
  let hasMorePages = true;

  console.log(`🚀 ${HAPPY_DORM_CONFIG.name} 데이터 수집 시작`);

  while (hasMorePages) {
    const url = `${HAPPY_DORM_CONFIG.baseUrl}?page=${currentPage}&perPageNum=20&contest_idx=0&sort_id=idx`;

    try {
      console.log(`📄 ${currentPage} 페이지 처리 중...`);

      const response = await axios.get(url, { headers });
      const html = response.data;
      const $ = cheerio.load(html);

      const menuItems = await parsePage($);

      if (menuItems.length === 0) {
        console.log(`⚡️ ${currentPage} 페이지에 데이터가 없습니다. 수집 종료.`);
        break;
      }

      const idxList = menuItems.map((item) => item.idx);
      let itemsToInsert = menuItems;

      // 중복 체크
      if (idxList.length > 0) {
        const placeholders = idxList.map(() => "?").join(",");
        const [result] = await pool.query(
          `SELECT chidx FROM TBL_Menu WHERE type = 'HAPPY_DORM_NUTRITION' AND chidx IN (${placeholders})`,
          idxList
        );
        const existingIdxSet = new Set(result.map((r) => r.chidx));
        itemsToInsert = menuItems.filter((item) => !existingIdxSet.has(item.idx));

        // 모두 중복이면 종료
        if (itemsToInsert.length === 0) {
          console.log(`⚡️ ${currentPage} 페이지는 전부 중복. 이후 페이지 크롤링 중단`);
          break;
        }
      }

      let successCount = 0;
      let duplicateCount = 0;

      for (const item of itemsToInsert) {
        try {
          await insertMenuItem(item);
          successCount++;
        } catch (err) {
          if (err.code === "ER_DUP_ENTRY") {
            duplicateCount++;
          } else {
            console.error(`❌ item insert 실패 (idx: ${item.idx}):`, err.message);
          }
        }
      }

      console.log(`✅ ${currentPage} 페이지 저장 완료`);
      console.log(
        `   총 ${menuItems.length}건 | 실제 insert: ${itemsToInsert.length} | 성공: ${successCount} | 중복: ${duplicateCount}`
      );

      // 다음 페이지 확인
      const nextPageExists = $(`.page-item a[href*="page=${currentPage + 1}"]`).length > 0;
      if (!nextPageExists) {
        console.log(`📄 ${currentPage} 페이지가 마지막 페이지입니다.`);
        hasMorePages = false;
      } else {
        currentPage++;
      }
    } catch (err) {
      console.error(`❌ ${currentPage} 페이지 오류:`, err.message);
      break;
    }
  }
}

// 메인 실행 함수를 export
async function runHappyDormScraper() {
  console.log(`🚀 ${HAPPY_DORM_CONFIG.name} 데이터 수집 시작`);
  await fetchHappyDormMenuItems();
  console.log("🎉 행복기숙사 데이터 수집 완료");
}

// 직접 실행될 때만 메인 함수 호출
if (require.main === module) {
  (async () => {
    try {
      await runHappyDormScraper();
    } catch (err) {
      console.error("❌ 전체 처리 중 오류:", err.message);
    } finally {
      pool.end();
    }
  })();
}

module.exports = { runHappyDormScraper };
