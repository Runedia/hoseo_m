const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

// 시간 형식 체크: 12:34 또는 09:26(KTX캠퍼스09:26) 등
function isTimeFormat(text) {
  return /^\d{1,2}:\d{2}(\([^)]+\))?$/.test(text.trim());
}

const htmlPath = path.join(__dirname, "토요일.html");
const html = fs.readFileSync(htmlPath, "utf-8");
const $ = cheerio.load(html);

// summary가 "토요일 및 국ㆍ공휴일 운행 시간표"를 포함하는 table 선택
const table = $('table[summary*="토요일 및 국ㆍ공휴일 운행 시간표"]');
const rows = table.find("tr").slice(2); // 앞 2줄은 헤더

const asanToCheonan = {}; // 아산캠퍼스 → 천안캠퍼스
const cheonanToAsan = {}; // 천안캠퍼스 → 아산캠퍼스

rows.each((i, row) => {
  const cells = $(row).find("td");
  if (!cells.length) return;

  const count = $(cells[0]).text().trim();

  // 아산 → 천안 (첫 번째 7개 칼럼)
  let idx = 1;
  asanToCheonan[count] = {};
  for (let j = 1; j <= 7; j++) {
    if (j < cells.length) {
      const cell = cells[j];
      const colspan = parseInt($(cell).attr("colspan") || "1");
      let value = $(cell).text().replace(/\s+/g, "").trim();

      for (let k = 0; k < colspan; k++) {
        asanToCheonan[count][`pos${idx}`] = isTimeFormat(value) ? value : "";
        idx++;
      }
    } else {
      asanToCheonan[count][`pos${idx}`] = "";
      idx++;
    }
  }

  // 천안 → 아산 (다음 7개 칼럼)
  idx = 1;
  cheonanToAsan[count] = {};
  for (let j = 8; j <= 14; j++) {
    if (j < cells.length) {
      const cell = cells[j];
      const colspan = parseInt($(cell).attr("colspan") || "1");
      let value = $(cell).text().replace(/\s+/g, "").trim();

      for (let k = 0; k < colspan; k++) {
        cheonanToAsan[count][`pos${idx}`] = isTimeFormat(value) ? value : "";
        idx++;
      }
    } else {
      cheonanToAsan[count][`pos${idx}`] = "";
      idx++;
    }
  }
});

// 아산 → 천안 JSON 파일로 저장
fs.writeFileSync(
  "assets/셔틀(아캠_천캠_토요일).json",
  JSON.stringify(asanToCheonan, null, 2),
  "utf-8"
);

// 천안 → 아산 JSON 파일로 저장
fs.writeFileSync(
  "assets/셔틀(천캠_아캠_토요일).json",
  JSON.stringify(cheonanToAsan, null, 2),
  "utf-8"
);

console.log(
  '완료! "셔틀(아캠_천캠_토요일).json"와 "셔틀(천캠_아캠_토요일).json" 파일이 생성되었습니다.'
);
