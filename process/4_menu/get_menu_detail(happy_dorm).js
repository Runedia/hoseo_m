require("module-alias/register");

const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs-extra");
const path = require("path");
const pool = require("@root/utils/db");
const { logger } = require("@root/utils/logger");

const BASE_URL = "https://happydorm.hoseo.ac.kr";
const DOWNLOAD_ROOT = path.resolve(process.cwd(), "download_happy_dorm");
const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
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
async function downloadFileAndSaveDB(menuNum, fileType, fileUrl, originName, downloadDir) {
  const filenameSafe = safeFilename(originName, fileType === "image" ? ".jpg" : ".pdf");
  const localFilePath = path.join(downloadDir, filenameSafe);
  const relativeFilePath = path.relative(process.cwd(), localFilePath);
  const urlPath = relativeFilePath.replace(/\\/g, "/");

  // 파일 다운로드
  await downloadFile(fileUrl, localFilePath);

  // DB 저장
  await pool.execute(
    `INSERT INTO tbl_menufile (menu_num, file_type, file_name, origin_name, file_path, file_url)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
     file_type = VALUES(file_type), file_name = VALUES(file_name),
     origin_name = VALUES(origin_name), file_path = VALUES(file_path), file_url = VALUES(file_url)`,
    [menuNum, fileType, filenameSafe, originName, urlPath, fileUrl]
  );

  return {
    filename: filenameSafe,
    localpath: urlPath,
    fullPath: localFilePath,
  };
}

// 첨부파일 처리 함수
async function processAttachments(idx, downloadDir) {
  const attachments = [];

  try {
    const fileApiUrl = `${BASE_URL}/fileload?idx=${idx}&table=board&rev=4`;
    const response = await axios.get(fileApiUrl, { headers });
    const fileData = response.data;

    if (Array.isArray(fileData) && fileData.length > 0) {
      const downloadPromises = fileData.map(async (file) => {
        const result = await downloadFileAndSaveDB(idx, "attachment", file.file_url, file.file_original_name, downloadDir);
        return {
          originUrl: file.file_url,
          originName: file.file_original_name,
          localPath: result.localpath,
          fileName: result.filename,
        };
      });

      const results = await Promise.allSettled(downloadPromises);
      results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          attachments.push(result.value);
        } else {
          console.error(`[${idx}] 첨부파일 다운로드 오류:`, result.reason.message);
        }
      });
    }
  } catch (err) {
    console.warn(`[${idx}] 첨부파일 API 호출 실패:`, err.message);
  }

  return attachments;
}

// 이미지 처리 함수
async function processImages($, boardElement, idx, downloadDir) {
  const imagePromises = [];
  const assets = [];
  let imageIndex = 0;

  boardElement.find("img").each((i, el) => {
    const $img = $(el);
    let src = $img.attr("src");

    if (!src) return;

    imageIndex++;

    // 행복기숙사 이미지 URL 처리
    let filename;
    if (src.includes("/api/image/imgdownload")) {
      const hashMatch = src.match(/hash=([a-f0-9]+)/);
      const idxMatch = src.match(/idx=(\d+)/);
      if (hashMatch && idxMatch) {
        filename = `image_${idxMatch[1]}_${hashMatch[1].substring(0, 8)}.jpg`;
      } else {
        filename = `image_${imageIndex}.jpg`;
      }
    } else {
      const baseName = path.basename(src.split("?")[0]);
      filename = safeFilename(baseName || `image_${imageIndex}.jpg`, ".jpg");
    }

    const fileUrl = src.startsWith("/") ? BASE_URL + src : src;

    imagePromises.push(
      downloadFileAndSaveDB(idx, "image", fileUrl, filename, downloadDir)
        .then((result) => {
          $img.attr("src", result.filename);
          assets.push({
            localPath: result.localpath,
            fileName: result.filename,
          });
        })
        .catch((e) => {
          console.error(`[${idx}] 이미지 다운로드 오류 (${filename}):`, e.message);
        })
    );
  });

  await Promise.allSettled(imagePromises);
  return assets;
}

// 메뉴 다운로드 상태 업데이트
async function updateMenuDownloadStatus(idx, isSuccess, errorMessage = null) {
  try {
    await pool.execute(
      `UPDATE TBL_Menu
       SET download_completed = ?, download_date = NOW(), download_error = ?
       WHERE chidx = ? AND type = 'HAPPY_DORM_NUTRITION'`,
      [isSuccess ? 1 : 0, errorMessage, idx]
    );
  } catch (e) {
    logger.error(`DB 상태 업데이트 실패 [${idx}]: ${e.message}`);
  }
}

// 통합 메뉴 처리 함수
async function parseAndSaveHappyDormMenu(idx) {
  try {
    const url = `${BASE_URL}/board/nutrition/view?idx=${idx}`;
    console.log(`[${idx}] 요청 URL: ${url}`);

    const { data: html } = await axios.get(url, { headers });
    console.log(`[${idx}] 응답 받음 - HTML 길이: ${html.length}바이트`);

    const $ = cheerio.load(html);

    // 본문 영역 찾기 (우선순위 순)
    const selectors = ['.board_view', '.board-view', '.board-content', '.content'];
    let boardContent = null;
    let usedSelector = null;

    for (const selector of selectors) {
      const element = $(selector);
      if (element.length > 0 && element.html() && element.text().trim()) {
        boardContent = element;
        usedSelector = selector;
        console.log(`[${idx}] 본문 영역 발견: ${selector}`);
        break;
      }
    }

    // 대안 방법: 가장 긴 div 찾기
    if (!boardContent) {
      let bestDiv = null;
      let maxTextLength = 0;

      $('div').each((i, el) => {
        const $div = $(el);
        const text = $div.text().trim();
        if (text.length > maxTextLength && text.length > 100) {
          maxTextLength = text.length;
          bestDiv = $div;
        }
      });

      if (bestDiv) {
        boardContent = bestDiv;
        usedSelector = 'div (최대 텍스트)';
        console.log(`[${idx}] 최대 텍스트 div 사용 (${maxTextLength}자)`);
      }
    }

    if (!boardContent || !boardContent.html() || !boardContent.text().trim()) {
      logger.warn(`본문 영역을 찾을 수 없음 [${idx}]`);
      await updateMenuDownloadStatus(idx, false, "본문 영역을 찾을 수 없음");
      throw new Error("본문 영역을 찾을 수 없습니다.");
    }

    console.log(`[${idx}] 사용된 선택자: ${usedSelector}`);

    // 저장 디렉토리 생성
    const menuDownloadDir = path.join(DOWNLOAD_ROOT, String(idx));
    await fs.ensureDir(menuDownloadDir);

    // 첨부파일 및 이미지 처리
    console.log(`[${idx}] 첨부파일 처리 중...`);
    const attachments = await processAttachments(idx, menuDownloadDir);

    console.log(`[${idx}] 이미지 처리 중...`);
    const assets = await processImages($, boardContent, idx, menuDownloadDir);

    // HTML 파일 저장
    const htmlFilePath = path.join(menuDownloadDir, `${idx}.html`);
    await fs.writeFile(htmlFilePath, boardContent.html(), { encoding: "utf-8" });

    // JSON 메타데이터 저장
    const jsonResult = {
      idx: idx,
      type: "HAPPY_DORM_NUTRITION",
      content: `download_happy_dorm/${idx}/${idx}.html`,
      assets: assets,
      attachments: attachments,
    };

    const jsonFilePath = path.join(menuDownloadDir, `${idx}_detail.json`);
    await fs.writeFile(jsonFilePath, JSON.stringify(jsonResult, null, 2), "utf-8");

    // DB 상태 업데이트
    await updateMenuDownloadStatus(idx, true);

    console.log(`[${idx}] ✅ 완료: HTML(${assets.length}개 이미지), JSON, ${attachments.length}개 첨부파일 저장`);

    return jsonResult;
  } catch (err) {
    console.error(`[${idx}] ❌ 에러:`, err.message);
    await updateMenuDownloadStatus(idx, false, err.message);
    throw err;
  }
}

// 행복기숙사 메인 실행 함수
async function runHappyDormDetailScraper() {
  try {
    const sql = `
      SELECT chidx FROM TBL_Menu
      WHERE type = 'HAPPY_DORM_NUTRITION'
        AND (download_completed IS NULL OR download_completed = 0)
      ORDER BY chidx DESC
      LIMIT 10
    `;

    const [result] = await pool.query(sql);
    const menuList = result.map((r) => r.chidx);

    console.log(`총 ${menuList.length}개의 행복기숙사 메뉴를 처리합니다.`);

    if (menuList.length === 0) {
      console.log("처리할 행복기숙사 메뉴가 없습니다.");
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const idx of menuList) {
      try {
        await parseAndSaveHappyDormMenu(idx);
        successCount++;
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1초 대기
      } catch (e) {
        console.error(`❌ idx=${idx} 처리 실패:`, e.message);
        failCount++;
      }
    }

    console.log(`\n=== 행복기숙사 처리 완료 ===`);
    console.log(`성공: ${successCount}개, 실패: ${failCount}개`);
  } catch (error) {
    console.error("행복기숙사 메인 프로세스 오류:", error);
  }
}

// 직접 실행될 때만 메인 함수 호출
if (require.main === module) {
  (async () => {
    try {
      await runHappyDormDetailScraper();
    } catch (err) {
      console.error("❌ 전체 처리 중 오류:", err.message);
    } finally {
      pool.end();
    }
  })();
}

module.exports = {
  parseAndSaveHappyDormMenu,
  runHappyDormDetailScraper,
};
