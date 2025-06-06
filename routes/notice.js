require("module-alias/register");

const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

// 새로운 유틸리티들 import
const { attachResponseHelper } = require("@root/utils/routes/responseHelper");
const { createLogger } = require("@root/utils/logger");
const { NoticeHelper } = require("@root/services/databaseService");
const { SearchService } = require("@root/services/searchService");
const { fileManager } = require("@root/utils/routes/fileManager");

// 크롤러 함수 import
const { parseAndSaveNotice } = require("@root/process/1_notice/get_notice_detail");

// 로거 및 응답 헬퍼 미들웨어 적용
const logger = createLogger("NOTICE");
router.use(attachResponseHelper);

/**
 * 공지사항 목록 조회 (페이징)
 * GET /notice/list?page=1&pageSize=20&type=CTG_17082400011
 */
router.get("/list", async (req, res) => {
  const startTime = Date.now();

  try {
    logger.api("GET", "/notice/list", 200, `시작`);

    // NoticeHelper를 사용한 페이징 목록 조회
    const result = await NoticeHelper.getList(req.query);

    const processingTime = `${Date.now() - startTime}ms`;
    logger.api("GET", "/notice/list", 200, processingTime);

    // 기존 응답 구조 그대로 반환 (data 배열만)
    res.json(result.data);
  } catch (error) {
    const processingTime = `${Date.now() - startTime}ms`;
    logger.api("GET", "/notice/list", 500, processingTime);
    logger.error("공지사항 목록 조회 실패", error);

    // 기존 에러 응답 구조 유지
    res.status(500).json({
      error: error.message,
      details: {
        errno: error.errno,
        sqlState: error.sqlState,
      },
    });
  }
});

/**
 * 공지사항 상세 조회 (자동 다운로드 포함)
 * GET /notice/idx/:chidx
 */
router.get("/idx/:chidx", async (req, res) => {
  const { chidx } = req.params;
  const startTime = Date.now();

  try {
    logger.api("GET", `/notice/idx/${chidx}`, 200, "시작");

    // 1. 공지사항 기본 정보 조회
    const notice = await NoticeHelper.getDetail(chidx);
    if (!notice) {
      logger.warn(`공지사항 없음: chidx=${chidx}`);
      return res.status(404).json({ error: "공지사항을 찾을 수 없습니다." });
    }

    // 2. 디렉토리 자동 생성
    const downloadRoot = path.join(process.cwd(), "download_notice");
    const chidxDir = path.join(downloadRoot, String(chidx));

    // 루트 디렉토리 생성
    if (!fs.existsSync(downloadRoot)) {
      fs.mkdirSync(downloadRoot, { recursive: true });
    }

    // chidx 디렉토리 생성
    if (!fs.existsSync(chidxDir)) {
      fs.mkdirSync(chidxDir, { recursive: true });
    }

    // 3. 상세 JSON 파일 확인 및 다운로드
    const jsonPath = path.join(chidxDir, `${chidx}_detail.json`);
    let content = null;
    let shouldDownload = false;

    // JSON 파일 존재 여부 확인
    try {
      const jsonContent = fileManager.readJSON(jsonPath);
      if (jsonContent) {
        content = jsonContent;
        logger.file("load", `${chidx}_detail.json`, "info");
      } else {
        shouldDownload = true;
      }
    } catch (e) {
      shouldDownload = true;
      logger.file("not_found", `${chidx}_detail.json`, "warn");
    }

    // 4. 필요시 자동 다운로드 실행
    if (shouldDownload) {
      try {
        logger.loading(`[${chidx}] 세부 내용 다운로드 시작`);
        content = await parseAndSaveNotice(chidx);
        logger.success(`[${chidx}] 세부 내용 다운로드 완료`);

        // 다운로드 후 최신 DB 정보 다시 조회
        const updatedNotice = await NoticeHelper.getDetail(chidx);
        if (updatedNotice) {
          Object.assign(notice, updatedNotice);
        }
      } catch (downloadError) {
        logger.error(`[${chidx}] 다운로드 실패`, downloadError);
        content = null;
      }
    }

    // 5. 첨부파일 정보 조회
    const files = await NoticeHelper.getFiles(chidx);

    // 6. 기존 응답 구조 그대로 반환
    const response = {
      ...notice,
      content: content ? content.content : null,
      assets: content ? content.assets : [],
      attachments: content ? content.attachments : files,
      isDownloaded: content !== null,
    };

    const processingTime = `${Date.now() - startTime}ms`;
    logger.api("GET", `/notice/idx/${chidx}`, 200, processingTime);

    res.json(response);
  } catch (error) {
    const processingTime = `${Date.now() - startTime}ms`;
    logger.api("GET", `/notice/idx/${chidx}`, 500, processingTime);
    logger.error(`공지사항 상세 조회 실패: chidx=${chidx}`, error);

    res.status(500).json({ error: error.message });
  }
});

/**
 * 공지사항 타입 목록 조회
 * GET /notice/types
 */
router.get("/types", async (req, res) => {
  const startTime = Date.now();

  try {
    logger.api("GET", "/notice/types", 200, "시작");

    const types = await NoticeHelper.getTypes();

    const processingTime = `${Date.now() - startTime}ms`;
    logger.api("GET", "/notice/types", 200, processingTime);

    // 기존 응답 구조 그대로 반환
    res.json(types);
  } catch (error) {
    const processingTime = `${Date.now() - startTime}ms`;
    logger.api("GET", "/notice/types", 500, processingTime);
    logger.error("공지사항 타입 조회 실패", error);

    res.status(500).json({ error: error.message });
  }
});

/**
 * 공지사항 검색
 * GET /notice/search?title=검색어&author=작성자&type=CTG_17082400011&page=1&pageSize=20
 */
router.get("/search", async (req, res) => {
  const startTime = Date.now();

  try {
    logger.api("GET", "/notice/search", 200, "시작");

    // 기본값 적용 (기존 로직 유지)
    const queryWithDefaults = {
      ...req.query,
      type: req.query.type || "CTG_17082400011", // 기본값 유지
      page: parseInt(req.query.page || "1", 10),
      pageSize: parseInt(req.query.pageSize || "20", 10),
    };

    // SearchService를 사용한 검색 조건 생성
    const searchResult = SearchService.buildNoticeSearch(queryWithDefaults);

    // NoticeHelper의 search 메소드 사용
    const result = await NoticeHelper.search(queryWithDefaults);

    const processingTime = `${Date.now() - startTime}ms`;
    logger.api("GET", "/notice/search", 200, processingTime);

    // 기존 응답 구조 그대로 반환 (data 배열만)
    res.json(result.data);
  } catch (error) {
    const processingTime = `${Date.now() - startTime}ms`;
    logger.api("GET", "/notice/search", 500, processingTime);
    logger.error("공지사항 검색 실패", error);

    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
