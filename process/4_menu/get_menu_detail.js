require("module-alias/register");

const path = require("path");
const pool = require("@root/utils/db");
const { logger } = require("@root/utils/logger");
const { crawlHoseoNotice, downloadFile } = require("@root/utils/process/crawler");
const { saveHtmlFile, saveJsonFile, safeFilename, ensureDirectoryExists } = require("@root/utils/process/file");

const BASE_URL = "https://www.hoseo.ac.kr";
const DOWNLOAD_ROOT = path.resolve(process.cwd(), "download_menu");

// 파일 다운로드 + DB 저장
async function downloadFileAndSaveDB(menuNum, fileType, fileUrl, originName, downloadDir) {
  // 파라미터 검증
  if (!fileUrl || typeof fileUrl !== "string") {
    throw new Error(`잘못된 fileUrl: ${fileUrl}`);
  }
  if (!originName || typeof originName !== "string") {
    throw new Error(`잘못된 originName: ${originName}`);
  }
  if (!downloadDir || typeof downloadDir !== "string") {
    throw new Error(`잘못된 downloadDir: ${downloadDir}`);
  }

  const filenameSafe = safeFilename(originName, fileType === "image" ? ".jpg" : ".pdf");
  const localFilePath = path.join(downloadDir, filenameSafe);
  const relativeFilePath = path.relative(process.cwd(), localFilePath);

  // URL용 경로 (슬래시로 변환)
  const urlPath = relativeFilePath.replace(/\\/g, "/");

  // 완전한 URL 생성
  const fullFileUrl = fileUrl.startsWith("/") ? BASE_URL + fileUrl : fileUrl;

  // 파일 다운로드
  await downloadFile(fullFileUrl, localFilePath);

  // DB 저장(tbl_menufile)
  await pool.execute(
    `INSERT INTO tbl_menufile (menu_num, file_type, file_name, origin_name, file_path, file_url)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
     file_type = VALUES(file_type),
     file_name = VALUES(file_name),
     origin_name = VALUES(origin_name),
     file_path = VALUES(file_path),
     file_url = VALUES(file_url)`,
    [menuNum, fileType, filenameSafe, originName, urlPath, fileUrl]
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
        downloadFileAndSaveDB(chidx, "attachment", href, originName, downloadDir)
          .then((result) => {
            // attachments 배열의 해당 항목 업데이트
            const attachmentIndex = attachments.findIndex((att) => att.originUrl === fileUrl);
            if (attachmentIndex !== -1) {
              attachments[attachmentIndex].localPath = result.localpath;
              attachments[attachmentIndex].fileName = result.filename;
            }
          })
          .catch((e) => {
            console.error(`[${chidx}] 첨부파일 다운로드 오류 (${originName}):`, e.message);
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

    // src가 없거나 빈 문자열이면 스킵
    if (!src || src.trim() === "") {
      return;
    }

    imageIndex++;

    // 파일명 결정
    let title = $img.attr("title");
    let filename;
    try {
      if (title && title.trim() !== "") {
        filename = safeFilename(title.trim(), ".jpg");
      } else {
        const baseName = path.basename(src.split("?")[0]);
        filename = safeFilename(baseName || `image_${imageIndex}.jpg`, ".jpg");
      }
    } catch (e) {
      console.error(`[${chidx}] 파일명 생성 오류 (src: ${src}):`, e.message);
      filename = `image_${imageIndex}.jpg`;
    }

    // 이미지 다운로드 및 DB 저장
    imagePromises.push(
      downloadFileAndSaveDB(chidx, "image", src, filename, downloadDir)
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
          console.error(`[${chidx}] 이미지 다운로드 오류 (${filename}):`, e.message);
        })
    );
  });

  await Promise.all(imagePromises);
  return assets;
}

// 메뉴 다운로드 상태 업데이트
async function updateMenuDownloadStatus(chidx, isSuccess, errorMessage = null) {
  try {
    await pool.execute(
      `UPDATE TBL_Menu
       SET download_completed = ?,
           download_date = NOW(),
           download_error = ?
       WHERE chidx = ?`,
      [isSuccess ? 1 : 0, errorMessage, chidx]
    );
  } catch (e) {
    logger.error(`DB 상태 업데이트 실패 [${chidx}]: ${e.message}`);
  }
}

// 캠퍼스 내 일반 식당 메뉴 처리 함수
async function parseAndSaveCampusMenu(chidx, action) {
  try {
    const url = `${BASE_URL}/Home/BBSView.mbz?action=${action}&schIdx=${chidx}`;

    // 공통 크롤링 함수 사용
    const { $, boardContent } = await crawlHoseoNotice(url, `메뉴 상세 [${chidx}]`);

    logger.info(`📥 처리 시작 [${chidx}]`);

    // 저장 디렉토리 생성
    const menuDownloadDir = path.join(DOWNLOAD_ROOT, String(chidx));
    await ensureDirectoryExists(menuDownloadDir);

    // 첨부파일 처리
    console.log(`[${chidx}] 첨부파일 처리 중...`);
    const attachments = await processAttachments($, chidx, menuDownloadDir);

    // 이미지 처리 (HTML 수정 포함)
    console.log(`[${chidx}] 이미지 처리 중...`);
    const assets = await processImages($, boardContent, chidx, menuDownloadDir);

    // HTML 정리: 불필요한 요소 제거
    boardContent.find("dt.no-print").remove();

    // HTML 파일 저장 (수정된 이미지 경로 포함)
    const htmlFilePath = path.join(menuDownloadDir, `${chidx}.html`);
    await saveHtmlFile(boardContent.html(), `메뉴 ${chidx}`, htmlFilePath);

    // JSON 메타데이터 저장
    const jsonResult = {
      schIdx: chidx,
      content: `download_menu/${chidx}/${chidx}.html`,
      assets: assets,
      attachments: attachments,
    };

    const jsonFilePath = path.join(menuDownloadDir, `${chidx}_detail.json`);
    await saveJsonFile(jsonResult, jsonFilePath);

    // DB에 완료 상태 업데이트
    await updateMenuDownloadStatus(chidx, true);

    console.log(`[${chidx}] ✅ 완료: HTML(${assets.length}개 이미지), JSON, ${attachments.length}개 첨부파일, DB 저장`);

    return jsonResult;
  } catch (err) {
    console.error(`[${chidx}] ❌ 에러:`, err.message);
    // 실패 상태도 DB에 기록
    await updateMenuDownloadStatus(chidx, false, err.message);
    throw err;
  }
}

// 캠퍼스 내 일반 식당 메뉴 스크래퍼 실행 함수
async function runGeneralMenuScraper() {
  try {
    // DB에서 아직 다운로드되지 않은 메뉴 목록 가져오기
    const sql = `
      SELECT chidx, type FROM TBL_Menu
      WHERE download_completed IS NULL OR download_completed = 0
      ORDER BY chidx DESC
      LIMIT 10
    `;

    const [result] = await pool.query(sql);
    const menuList = result.map((r) => ({ chidx: r.chidx, action: r.type }));

    console.log(`총 ${menuList.length}개의 메뉴를 처리합니다.`);

    if (menuList.length === 0) {
      console.log("처리할 메뉴가 없습니다.");
      return;
    }

    // 메뉴별로 상세 크롤링/파싱
    let successCount = 0;
    let failCount = 0;

    for (const menu of menuList) {
      try {
        await parseAndSaveCampusMenu(menu.chidx, menu.action);
        successCount++;

        // 요청 간격 조절 (서버 부하 방지)
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (e) {
        console.error(`❌ chidx=${menu.chidx} 처리 실패:`, e.message);
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
  runGeneralMenuScraper();
}

module.exports = {
  parseAndSaveCampusMenu,
  runGeneralMenuScraper,
};
