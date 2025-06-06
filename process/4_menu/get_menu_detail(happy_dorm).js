require("module-alias/register");

const path = require("path");
const pool = require("@root/utils/db");
const { logger } = require("@root/utils/logger");
const { crawlWebPage, downloadFile } = require("@root/utils/process/crawler");
const { saveHtmlFile, saveJsonFile, safeFilename, ensureDirectoryExists } = require("@root/utils/process/file");

const BASE_URL = "https://happydorm.hoseo.ac.kr";
const DOWNLOAD_ROOT = path.resolve(process.cwd(), "download_happy_dorm");

// 행복기숙사 전용 헤더
const HAPPY_DORM_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "*/*",
  Referer: BASE_URL + "/",
};

// 파일 다운로드 + DB 저장
async function downloadFileAndSaveDB(menuNum, fileType, fileUrl, originName, downloadDir) {
  const filenameSafe = safeFilename(originName, fileType === "image" ? ".jpg" : ".pdf");
  const localFilePath = path.join(downloadDir, filenameSafe);
  const relativeFilePath = path.relative(process.cwd(), localFilePath);
  const urlPath = relativeFilePath.replace(/\\/g, "/");

  // 완전한 URL 생성
  const fullFileUrl = fileUrl.startsWith("/") ? BASE_URL + fileUrl : fileUrl;

  // 파일 다운로드 (행복기숙사 전용 헤더 사용)
  await downloadFile(fullFileUrl, localFilePath, { headers: HAPPY_DORM_HEADERS });

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

    const response = await crawlWebPage(fileApiUrl, {
      description: `첨부파일 API [${idx}]`,
      headers: HAPPY_DORM_HEADERS,
    });

    // JSON 응답 파싱
    let fileData;
    try {
      fileData = JSON.parse(response);
    } catch (e) {
      console.warn(`[${idx}] 첨부파일 API 응답을 JSON으로 파싱할 수 없음`);
      return attachments;
    }

    if (Array.isArray(fileData) && fileData.length > 0) {
      const downloadPromises = fileData.map(async (file) => {
        const result = await downloadFileAndSaveDB(
          idx,
          "attachment",
          file.file_url,
          file.file_original_name,
          downloadDir
        );
        return {
          originUrl: file.file_url,
          originName: file.file_original_name,
          localPath: result.localpath,
          fileName: result.filename,
        };
      });

      const results = await Promise.allSettled(downloadPromises);
      results.forEach((result, i) => {
        if (result.status === "fulfilled") {
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

    imagePromises.push(
      downloadFileAndSaveDB(idx, "image", src, filename, downloadDir)
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

    // 공통 크롤링 함수 사용
    const html = await crawlWebPage(url, {
      description: `행복기숙사 메뉴 [${idx}]`,
      headers: HAPPY_DORM_HEADERS,
    });

    const cheerio = require("cheerio");
    const $ = cheerio.load(html);

    // 본문 영역 찾기 (우선순위 순)
    const selectors = [".board_view", ".board-view", ".board-content", ".content"];
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

      $("div").each((i, el) => {
        const $div = $(el);
        const text = $div.text().trim();
        if (text.length > maxTextLength && text.length > 100) {
          maxTextLength = text.length;
          bestDiv = $div;
        }
      });

      if (bestDiv) {
        boardContent = bestDiv;
        usedSelector = "div (최대 텍스트)";
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
    await ensureDirectoryExists(menuDownloadDir);

    // 첨부파일 및 이미지 처리
    console.log(`[${idx}] 첨부파일 처리 중...`);
    const attachments = await processAttachments(idx, menuDownloadDir);

    console.log(`[${idx}] 이미지 처리 중...`);
    const assets = await processImages($, boardContent, idx, menuDownloadDir);

    // HTML 파일 저장
    const htmlFilePath = path.join(menuDownloadDir, `${idx}.html`);
    await saveHtmlFile(boardContent.html(), `행복기숙사 메뉴 ${idx}`, htmlFilePath);

    // JSON 메타데이터 저장
    const jsonResult = {
      idx: idx,
      type: "HAPPY_DORM_NUTRITION",
      content: `download_happy_dorm/${idx}/${idx}.html`,
      assets: assets,
      attachments: attachments,
    };

    const jsonFilePath = path.join(menuDownloadDir, `${idx}_detail.json`);
    await saveJsonFile(jsonResult, jsonFilePath);

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
