// enhanced_notice_crawler.js
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs-extra");
const path = require("path");
const pool = require("../utils/db"); // DB 연결 pool
const logger = require("../utils/logger"); // Winston 로거

const BASE_URL = "https://www.hoseo.ac.kr";
const DOWNLOAD_ROOT = path.join(__dirname, "download");
const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
    "AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/124.0.0.0 Safari/537.36",
  Accept: "*/*",
  Referer: BASE_URL + "/",
};

// 파일명 안전 변환 함수
function safeFilename(name, fallbackExt = ".bin") {
  if (!name || name.trim() === "") {
    return `file_${Date.now()}${fallbackExt}`;
  }

  let ext = path.extname(name);
  if (!ext) ext = fallbackExt;

  let base = name.replace(/[\\/:*?"<>|]+/g, "_").trim();
  if (!base.endsWith(ext)) base += ext;

  return base;
}

// 파일 다운로드 함수
async function downloadFile(fileUrl, destPath) {
  if (fileUrl.startsWith("/")) {
    fileUrl = BASE_URL + fileUrl;
  }

  const writer = fs.createWriteStream(destPath);
  const response = await axios({
    url: fileUrl,
    method: "GET",
    responseType: "stream",
    headers,
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

// 파일 다운로드 + DB 저장
async function downloadFileAndSaveDB(
  noticeNum,
  fileType,
  fileUrl,
  originName,
  downloadDir
) {
  const filenameSafe = safeFilename(
    originName,
    fileType === "image" ? ".jpg" : ".pdf"
  );
  const localFilePath = path.join(downloadDir, filenameSafe);
  const relativeFilePath = path.relative(__dirname, localFilePath);

  // URL용 경로 (슬래시로 변환)
  const urlPath = relativeFilePath.replace(/\\/g, "/");

  // 파일 다운로드
  await downloadFile(fileUrl, localFilePath);

  // DB 저장(tbl_noticefile)
  await pool.execute(
    `INSERT INTO tbl_noticefile (notice_num, file_type, file_name, origin_name, file_path, file_url)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE 
     file_type = VALUES(file_type),
     file_name = VALUES(file_name),
     origin_name = VALUES(origin_name),
     file_path = VALUES(file_path),
     file_url = VALUES(file_url)`,
    [noticeNum, fileType, filenameSafe, originName, urlPath, fileUrl]
  );

  return {
    filename: filenameSafe,
    localpath: urlPath,
    fullPath: localFilePath,
  };
}

// 첨부파일 처리 함수
async function processAttachments($, chidx, downloadDir) {
  const attachments = [];
  const downloadPromises = [];

  $(".fileBox .fileList ul li a").each((i, el) => {
    const href = $(el).attr("href");
    if (href && href.startsWith("/File/Download.do")) {
      const fileUrl = href.startsWith("/") ? BASE_URL + href : href;
      const originName = $(el).text().trim();

      attachments.push({
        originUrl: fileUrl,
        originName: originName,
        localPath: null,
        fileName: null,
      });

      downloadPromises.push(
        downloadFileAndSaveDB(
          chidx,
          "attachment",
          fileUrl,
          originName,
          downloadDir
        )
          .then((result) => {
            // attachments 배열의 해당 항목 업데이트
            const attachmentIndex = attachments.findIndex(
              (att) => att.originUrl === fileUrl
            );
            if (attachmentIndex !== -1) {
              attachments[attachmentIndex].localPath = result.localpath;
              attachments[attachmentIndex].fileName = result.filename;
            }
          })
          .catch((e) => {
            console.error(
              `[${chidx}] 첨부파일 다운로드 오류 (${originName}):`,
              e.message
            );
          })
      );
    }
  });

  await Promise.all(downloadPromises);
  return attachments;
}

// 이미지 처리 함수 (assets 정보도 수집)
async function processImages($, boardElement, chidx, downloadDir) {
  const imagePromises = [];
  const assets = [];
  let imageIndex = 0;

  boardElement.find("img").each((i, el) => {
    const $img = $(el);
    let src = $img.attr("src");

    if (!src) return;

    imageIndex++;

    // 파일명 결정
    let title = $img.attr("title");
    let filename;
    if (title && title.trim() !== "") {
      filename = safeFilename(title.trim(), ".jpg");
    } else {
      const baseName = path.basename(src.split("?")[0]);
      filename = safeFilename(baseName || `image_${imageIndex}.jpg`, ".jpg");
    }

    const fileUrl = src.startsWith("/") ? BASE_URL + src : src;

    // 이미지 다운로드 및 DB 저장
    imagePromises.push(
      downloadFileAndSaveDB(chidx, "image", fileUrl, filename, downloadDir)
        .then((result) => {
          // img src 경로를 로컬 파일명으로 변경
          $img.attr("src", result.filename);

          // assets 배열에 추가
          assets.push({
            localPath: result.localpath,
            fileName: result.filename,
          });
        })
        .catch((e) => {
          console.error(
            `[${chidx}] 이미지 다운로드 오류 (${filename}):`,
            e.message
          );
        })
    );
  });

  await Promise.all(imagePromises);
  return assets;
}

// 공지사항 다운로드 상태 업데이트
async function updateNoticeDownloadStatus(
  chidx,
  isSuccess,
  errorMessage = null
) {
  try {
    await pool.execute(
      `UPDATE tbl_notice 
       SET download_completed = ?, 
           download_date = NOW(),
           download_error = ?
       WHERE chidx = ?`,
      [isSuccess ? 1 : 0, errorMessage, chidx]
    );
  } catch (e) {
    logger.error(`[${chidx}] DB 상태 업데이트 실패: ${e.message}`);
  }
}

// 통합 공지사항 처리 함수
async function parseAndSaveNotice(chidx) {
  try {
    const url = `${BASE_URL}/Home/BBSView.mbz?action=MAPP_1708240139&schIdx=${chidx}`;
    const { data: html } = await axios.get(url, { headers });
    const $ = cheerio.load(html);

    // 본문 영역 추출
    let boardContent = $("#board_item_list");
    if (
      !boardContent.length ||
      !boardContent.html() ||
      !boardContent.text().trim()
    ) {
      boardContent = $(".bbs-view-content");
    }

    if (!boardContent.length) {
      logger.warn(`[${chidx}] 본문 영역을 찾을 수 없습니다.`);
      await updateNoticeDownloadStatus(
        chidx,
        false,
        "본문 영역을 찾을 수 없음"
      );
      throw new Error("본문 영역을 찾을 수 없습니다.");
    }

    logger.info(`[${chidx}] 처리 시작...`);

    // 저장 디렉토리 생성
    const noticeDownloadDir = path.join(DOWNLOAD_ROOT, String(chidx));
    await fs.ensureDir(noticeDownloadDir);

    // 첨부파일 처리
    console.log(`[${chidx}] 첨부파일 처리 중...`);
    const attachments = await processAttachments($, chidx, noticeDownloadDir);

    // 이미지 처리 (HTML 수정 포함)
    console.log(`[${chidx}] 이미지 처리 중...`);
    const assets = await processImages(
      $,
      boardContent,
      chidx,
      noticeDownloadDir
    );

    // HTML 정리: 불필요한 요소 제거
    boardContent.find("dt.no-print").remove();

    // HTML 파일 저장 (수정된 이미지 경로 포함)
    const htmlFilePath = path.join(noticeDownloadDir, `${chidx}.html`);
    await fs.writeFile(htmlFilePath, boardContent.html(), {
      encoding: "utf-8",
    });

    // JSON 메타데이터 저장
    const jsonResult = {
      schIdx: chidx,
      content: `download/${chidx}/${chidx}.html`,
      assets: assets,
      attachments: attachments,
    };

    const jsonFilePath = path.join(noticeDownloadDir, `${chidx}_detail.json`);
    await fs.writeFile(
      jsonFilePath,
      JSON.stringify(jsonResult, null, 2),
      "utf-8"
    );

    // DB에 완료 상태 업데이트
    await updateNoticeDownloadStatus(chidx, true);

    console.log(
      `[${chidx}] ✅ 완료: HTML(${assets.length}개 이미지), JSON, ${attachments.length}개 첨부파일, DB 저장`
    );

    return jsonResult;
  } catch (err) {
    console.error(`[${chidx}] ❌ 에러:`, err.message);
    // 실패 상태도 DB에 기록
    await updateNoticeDownloadStatus(chidx, false, err.message);
    throw err;
  }
}

// 메인 실행 함수
async function main() {
  try {
    // DB에서 아직 다운로드되지 않은 공지사항 목록 가져오기
    const sql = `
      SELECT chidx FROM tbl_notice 
      WHERE download_completed IS NULL OR download_completed = 0 
      ORDER BY chidx DESC 
      LIMIT 10
    `;

    const [result] = await pool.query(sql);
    const chidxList = result.map((r) => r.chidx);

    console.log(`총 ${chidxList.length}개의 공지사항을 처리합니다.`);

    if (chidxList.length === 0) {
      console.log("처리할 공지사항이 없습니다.");
      return;
    }

    // chidx별로 공지 상세 크롤링/파싱
    let successCount = 0;
    let failCount = 0;

    for (const chidx of chidxList) {
      try {
        await parseAndSaveNotice(chidx);
        successCount++;

        // 요청 간격 조절 (서버 부하 방지)
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (e) {
        console.error(`❌ chidx=${chidx} 처리 실패:`, e.message);
        failCount++;
      }
    }

    console.log(`\n=== 처리 완료 ===`);
    console.log(`성공: ${successCount}개`);
    console.log(`실패: ${failCount}개`);
    console.log(`총계: ${successCount + failCount}개`);
  } catch (error) {
    console.error("메인 프로세스 오류:", error);
  } finally {
    pool.end();
  }
}

// 실행
if (require.main === module) {
  main();
}

module.exports = {
  parseAndSaveNotice,
  main,
};
