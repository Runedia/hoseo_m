const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const pool = require("./utils/db"); // DB 연결 pool

const BASE_URL = "https://www.hoseo.ac.kr";

// 파일명 안전 변환 함수
function safeFilename(name, fallbackExt = ".bin") {
  let ext = path.extname(name);
  if (!ext) ext = fallbackExt;
  let base = name.replace(/[\\/:*?"<>|]+/g, "_");
  if (!base.endsWith(ext)) base += ext;
  return base;
}

// 파일 다운로드 + DB 저장
async function downloadFileAndSaveDB(
  noticeNum,
  fileType,
  fileUrl,
  originName,
  saveDir
) {
  const filenameSafe = safeFilename(
    originName,
    fileType === "image" ? ".jpg" : ".pdf"
  );
  const savePath = path.join(saveDir, filenameSafe);
  const filePath = path.relative(__dirname, savePath);

  // 파일 다운로드
  const writer = fs.createWriteStream(savePath);
  const response = await axios({
    url: fileUrl,
    method: "GET",
    responseType: "stream",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/124.0.0.0 Safari/537.36",
      Accept: "*/*",
      Referer: BASE_URL + "/",
    },
  });
  response.data.pipe(writer);
  await new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  // DB 저장(tbl_noticefile)
  await pool.execute(
    `INSERT INTO tbl_noticefile (notice_num, file_type, file_name, origin_name, file_path, file_url)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [noticeNum, fileType, filenameSafe, originName, filePath, fileUrl]
  );
  return { filename: filenameSafe, localpath: filePath };
}

// 문단(빈 줄) 반영: <p>, <div>, <dd>, <section> 등에서 줄바꿈을 기준으로 분리
function getTextBlockWithNewlines($, el) {
  // img, table 등은 제거
  $(el).find("table, img").remove();
  let html = $(el).html() || "";
  html = html.replace(/<br\s*\/?>/gi, "\n");
  // 문단 분리(연속 줄바꿈 2개 이상)
  let paragraphs = html.split(/\n{2,}/);
  // HTML 태그 제거
  paragraphs = paragraphs.map((p) =>
    cheerio
      .load("<div>" + p + "</div>")("div")
      .text()
      .replace(/\u200B/g, "")
      .replace(/[ ]{2,}/g, " ")
      .replace(/^\s+|\s+$/g, "")
  );
  return paragraphs.filter((txt) => txt.length > 0);
}

// content 추출 (문단 단위 + newline 삽입)
function extractContentBlocks($, $context) {
  const content = [];
  $context.children().each((i, el) => {
    // 표
    if (el.tagName === "table") {
      const rows = [];
      $(el)
        .find("tr")
        .each((j, tr) => {
          const cells = [];
          $(tr)
            .find("th,td")
            .each((k, td) => {
              cells.push($(td).text().replace(/\s+/g, " ").trim());
            });
          rows.push(cells);
        });
      content.push({ type: "table", value: rows });
      return;
    }

    // 이미지
    if (el.tagName === "img") {
      let imgUrl = $(el).attr("src");
      if (imgUrl && imgUrl.startsWith("/")) imgUrl = BASE_URL + imgUrl;
      content.push({
        type: "image",
        value: {
          url: imgUrl,
          alt: $(el).attr("alt") || $(el).attr("title") || "",
          originName: $(el).attr("title") || $(el).attr("alt") || "image.jpg",
          localpath: null,
          filename: null,
        },
      });
      return;
    }

    // 문단(텍스트 블록, 줄바꿈 구분 포함)
    if (["p", "div", "dd", "span", "section"].includes(el.tagName)) {
      const paragraphs = getTextBlockWithNewlines($, el);
      paragraphs.forEach((txt, idx) => {
        content.push({ type: "text", value: txt });
        // 마지막이 아니면 빈 줄(newline) 삽입
        if (idx !== paragraphs.length - 1) {
          content.push({ type: "newline" });
        }
      });
      // 하위 img/table 등도 추가
      $(el)
        .find("img")
        .each((_, img) => {
          let imgUrl = $(img).attr("src");
          if (imgUrl && imgUrl.startsWith("/")) imgUrl = BASE_URL + imgUrl;
          content.push({
            type: "image",
            value: {
              url: imgUrl,
              alt: $(img).attr("alt") || $(img).attr("title") || "",
              originName:
                $(img).attr("title") || $(img).attr("alt") || "image.jpg",
              localpath: null,
              filename: null,
            },
          });
        });
      $(el)
        .find("table")
        .each((_, table) => {
          const rows = [];
          $(table)
            .find("tr")
            .each((j, tr) => {
              const cells = [];
              $(tr)
                .find("th,td")
                .each((k, td) => {
                  cells.push($(td).text().replace(/\s+/g, " ").trim());
                });
              rows.push(cells);
            });
          content.push({ type: "table", value: rows });
        });
      return;
    }

    // 기타(단순 텍스트 노드 등)
    if (el.type === "text") {
      const txt = $(el)
        .text()
        .replace(/\u200B/g, "")
        .trim();
      if (txt) content.push({ type: "text", value: txt });
    }
  });
  return content;
}

async function extractAndStoreNotice(schIdx) {
  const url = `${BASE_URL}/Home/BBSView.mbz?action=MAPP_1708240139&schIdx=${schIdx}`;
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/124.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    Referer: BASE_URL + "/",
  };

  const response = await axios.get(url, { headers });
  const $ = cheerio.load(response.data);

  // 저장 디렉토리 (download/schIdx)
  const saveDir = path.join(__dirname, "download", String(schIdx));
  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }

  // content 추출 (실제 화면 순서대로)
  const boardEl = $("#board_item_list");
  let content = [];
  if (boardEl.find("dd").length > 0) {
    boardEl.find("dd").each((i, dd) => {
      content.push(...extractContentBlocks($, $(dd)));
    });
  } else {
    content = extractContentBlocks($, boardEl);
  }

  // 첨부파일 추출 및 다운로드+DB저장
  const attachments = [];
  const downloadPromises = [];
  $(".fileBox .fileList ul li a").each((i, el) => {
    const href = $(el).attr("href");
    if (href && href.startsWith("/File/Download.do")) {
      let fileUrl = href.startsWith("/") ? BASE_URL + href : href;
      let originName = $(el).text().trim();
      attachments.push({ url: fileUrl, filename: originName });
      downloadPromises.push(
        downloadFileAndSaveDB(
          schIdx,
          "attachment",
          fileUrl,
          originName,
          saveDir
        ).catch((e) => {
          console.error("첨부파일 다운로드 오류:", e.message);
        })
      );
    }
  });

  // content 내 image 다운로드+DB저장 (localpath/filename 기록)
  let imgIdx = 0;
  for (const entry of content) {
    if (entry.type === "image" && entry.value.url) {
      imgIdx++;
      const originName = entry.value.originName || `img${imgIdx}.jpg`;
      downloadPromises.push(
        downloadFileAndSaveDB(
          schIdx,
          "image",
          entry.value.url,
          originName,
          saveDir
        )
          .then((res) => {
            entry.value.localpath = res.localpath;
            entry.value.filename = res.filename;
          })
          .catch((e) => {
            entry.value.localpath = null;
            entry.value.filename = null;
            console.error("이미지 다운로드 오류:", e.message);
          })
      );
    }
  }

  await Promise.all(downloadPromises);

  // 최종 json 저장
  const result = { schIdx, content, attachments };
  fs.writeFileSync(
    path.join(saveDir, `${schIdx}_detail.json`),
    JSON.stringify(result, null, 2),
    "utf-8"
  );
  console.log(`[${schIdx}] detail json + 파일 다운로드/DB 저장 완료`);
  return result;
}

// 전체 chidx 반복 처리 예시 (여기선 1개만)
(async () => {
  // 여러 개 돌릴 경우
  const sql = "SELECT chidx FROM hoseo_m.tbl_notice limit 100";
  const [result] = await pool.query(sql);
  const chidxList = result.map((r) => r.chidx);
  for (const chidx of chidxList) {
    await extractAndStoreNotice(chidx);
  }

  pool.end();
})();
