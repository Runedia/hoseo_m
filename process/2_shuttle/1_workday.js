const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

// 시간 형식 체크: 12:34 또는 09:26(KTX캠퍼스09:26) 등
function isTimeFormat(text) {
  return /^\d{1,2}:\d{2}(\([^)]+\))?$/.test(text.trim());
}

const htmlPath = path.join(__dirname, "월금.html");
const html = fs.readFileSync(htmlPath, "utf-8");
const $ = cheerio.load(html);

// summary가 "학기중 운행 시간표"를 포함하는 table 선택
const table = $('table[summary*="학기중 운행 시간표"]');
const rows = table.find("tr").slice(2); // 앞 2줄은 헤더

const asanToCheonan = {}; // 아산캠퍼스 → 천안캠퍼스
const cheonanToAsan = {}; // 천안캠퍼스 → 아산캠퍼스

rows.each((i, row) => {
  const cells = $(row).find("td");
  if (!cells.length) return;

  const count = $(cells[0]).text().trim();

  // 아산 → 천안 (2~8번째 컬럼, pos1~pos7)
  asanToCheonan[count] = {};
  let asanPosIndex = 1;

  for (let j = 1; j <= 7 && j < cells.length; j++) {
    const cell = $(cells[j]);
    const colspan = parseInt(cell.attr("colspan") || "1");
    let value = cell.text().replace(/\s+/g, "").trim();

    // colspan이 1이면 정상적인 시간 데이터
    if (colspan === 1) {
      if (asanPosIndex <= 7) {
        asanToCheonan[count][`pos${asanPosIndex}`] = isTimeFormat(value) ? value : "";
        asanPosIndex++;
      }
    } else {
      // colspan이 1보다 크면 비어있는 cell로 처리
      for (let k = 0; k < colspan && asanPosIndex <= 7; k++) {
        asanToCheonan[count][`pos${asanPosIndex}`] = "";
        asanPosIndex++;
      }
    }
  }

  // 나머지 위치들을 빈 문자열로 채우기
  for (let k = asanPosIndex; k <= 7; k++) {
    asanToCheonan[count][`pos${k}`] = "";
  }

  // 천안 → 아산 (9~15번째 컬럼, pos1~pos7)
  cheonanToAsan[count] = {};
  let cheonanPosIndex = 1;

  for (let j = 8; j <= 14 && j < cells.length; j++) {
    const cell = $(cells[j]);
    const colspan = parseInt(cell.attr("colspan") || "1");
    let value = cell.text().replace(/\s+/g, "").trim();

    // colspan이 1이면 정상적인 시간 데이터
    if (colspan === 1) {
      if (cheonanPosIndex <= 7) {
        cheonanToAsan[count][`pos${cheonanPosIndex}`] = isTimeFormat(value) ? value : "";
        cheonanPosIndex++;
      }
    } else {
      // colspan이 1보다 크면 비어있는 cell로 처리
      for (let k = 0; k < colspan && cheonanPosIndex <= 7; k++) {
        cheonanToAsan[count][`pos${cheonanPosIndex}`] = "";
        cheonanPosIndex++;
      }
    }
  }

  // 나머지 위치들을 빈 문자열로 채우기
  for (let k = cheonanPosIndex; k <= 7; k++) {
    cheonanToAsan[count][`pos${k}`] = "";
  }
});

// 아산 → 천안 JSON 파일로 저장
fs.writeFileSync("assets/셔틀(아캠_천캠_월금).json", JSON.stringify(asanToCheonan, null, 2), "utf-8");

// 천안 → 아산 JSON 파일로 저장
fs.writeFileSync("assets/셔틀(천캠_아캠_월금).json", JSON.stringify(cheonanToAsan, null, 2), "utf-8");

console.log('완료! "셔틀(아캠_천캠_월금).json"와 "셔틀(천캠_아캠_월금).json" 파일이 생성되었습니다.');

