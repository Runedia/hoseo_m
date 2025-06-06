require("module-alias/register");

const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

// 새로운 유틸리티들 import
const { attachResponseHelper } = require("@root/utils/routes/responseHelper");
const { createLogger } = require("@root/utils/logger");
const { MenuHelper } = require("@root/services/databaseService");
const { SearchService } = require("@root/services/searchService");
const { fileManager } = require("@root/utils/routes/fileManager");

// 크롤러 함수 import
const { parseAndSaveCampusMenu } = require("@root/process/4_menu/get_menu_detail");
const { parseAndSaveHappyDormMenu } = require("@root/process/4_menu/get_menu_detail(happy_dorm)");

// 로거 및 응답 헬퍼 미들웨어 적용
const logger = createLogger("MENU");
router.use(attachResponseHelper);

/**
 * 메뉴 타입 상수
 */
const MENU_TYPES = {
  CHEONAN: "MAPP_2312012408",
  ASAN: "MAPP_2312012409",
  HAPPY_DORM: "HAPPY_DORM_NUTRITION",
};

/**
 * action 파라미터 검증 헬퍼
 */
function validateAction(action, res) {
  if (!action) {
    return res.status(400).json({
      error: "action 파라미터는 필수입니다.",
      details: {
        required: true,
        parameter: "action",
        example: "MAPP_2312012408 (천안), MAPP_2312012409 (아산), HAPPY_DORM_NUTRITION (행복기숙사)",
      },
    });
  }
  return null;
}

/**
 * 메뉴 목록 조회 (페이징) - 기존 API 구조 유지
 * GET /menu/list?action=MAPP_2312012408&page=1&pageSize=20
 */
router.get("/list", async (req, res) => {
  const startTime = Date.now();
  const { action } = req.query;

  // action 파라미터 검증
  const validationError = validateAction(action, res);
  if (validationError) return;

  try {
    logger.api("GET", "/menu/list", 200, `시작 (action=${action})`);

    // MenuHelper를 사용한 목록 조회 (기존과 동일한 응답)
    const result = await MenuHelper.getList(req.query);

    const processingTime = `${Date.now() - startTime}ms`;
    logger.api("GET", "/menu/list", 200, processingTime);

    // 기존 응답 구조 그대로 반환 (data 배열만)
    res.json(result.data);
  } catch (error) {
    const processingTime = `${Date.now() - startTime}ms`;
    logger.api("GET", "/menu/list", 500, processingTime);
    logger.error("메뉴 목록 조회 실패", error);

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
 * 메뉴 목록 조회 (페이징 + 전체 개수) - 기존 API 구조 유지
 * GET /menu/list2?action=MAPP_2312012408&page=1&pageSize=20
 */
router.get("/list2", async (req, res) => {
  const startTime = Date.now();
  const { action } = req.query;

  // action 파라미터 검증
  const validationError = validateAction(action, res);
  if (validationError) return;

  try {
    logger.api("GET", "/menu/list2", 200, `시작 (action=${action})`);

    // MenuHelper를 사용한 페이징 목록 조회
    const result = await MenuHelper.getList(req.query);

    const processingTime = `${Date.now() - startTime}ms`;
    logger.api("GET", "/menu/list2", 200, processingTime);

    // 기존 list2 응답 구조 그대로 반환
    res.json({
      data: result.data,
      totalCount: result.totalCount,
      currentPage: result.currentPage,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  } catch (error) {
    const processingTime = `${Date.now() - startTime}ms`;
    logger.api("GET", "/menu/list2", 500, processingTime);
    logger.error("메뉴 목록2 조회 실패", error);

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
 * 메뉴 상세 조회 (자동 다운로드 포함)
 * GET /menu/idx/:chidx/:action
 */
router.get("/idx/:chidx/:action", async (req, res) => {
  const { chidx, action } = req.params;
  const startTime = Date.now();

  try {
    logger.api("GET", `/menu/idx/${chidx}/${action}`, 200, "시작");

    // 1. 메뉴 기본 정보 조회 (action과 함께)
    const menu = await MenuHelper.getDetail(chidx, action);
    if (!menu) {
      logger.warn(`메뉴 없음: chidx=${chidx}, action=${action}`);
      return res.status(404).json({
        error: "메뉴를 찾을 수 없습니다.",
        details: { chidx, action },
      });
    }

    const menuType = menu.type;
    const isHappyDorm = menuType === MENU_TYPES.HAPPY_DORM;

    // 2. JSON 파일 경로 결정 (타입별로 다른 디렉토리)
    const baseDir = isHappyDorm ? "download_happy_dorm" : "download_menu";
    const jsonPath = path.join(process.cwd(), baseDir, String(chidx), `${chidx}_detail.json`);

    let content = null;
    let shouldDownload = false;

    // JSON 파일 존재 여부 확인
    if (!fs.existsSync(jsonPath)) {
      shouldDownload = true;
      logger.file("not_found", `${chidx}_detail.json`, "warn");
    } else {
      try {
        const jsonContent = fileManager.readJSON(jsonPath);
        content = jsonContent;
        logger.file("load", `${chidx}_detail.json`, "info");
      } catch (e) {
        shouldDownload = true;
        logger.file("read_error", `${chidx}_detail.json`, "warn");
      }
    }

    // 3. 필요시 자동 다운로드 실행 (타입별 처리)
    if (shouldDownload) {
      try {
        logger.loading(`[${chidx}] 세부 내용 다운로드 시작 (타입: ${menuType})`);

        if (isHappyDorm) {
          // 행복기숙사 처리
          content = await parseAndSaveHappyDormMenu(chidx);
          logger.success(`[${chidx}] 행복기숙사 메뉴 다운로드 완료`);
        } else {
          // 일반 호서대 메뉴 처리
          content = await parseAndSaveCampusMenu(chidx, menuType);
          logger.success(`[${chidx}] 캠퍼스 메뉴 다운로드 완료`);
        }

        // 다운로드 후 최신 DB 정보 다시 조회
        const updatedMenu = await MenuHelper.getDetail(chidx, action);
        if (updatedMenu) {
          Object.assign(menu, updatedMenu);
        }
      } catch (downloadError) {
        logger.error(`[${chidx}] 다운로드 실패`, downloadError);
        content = null;
      }
    }

    // 4. 첨부파일 정보 조회
    const files = await MenuHelper.getFiles(chidx);

    // 5. 기존 응답 구조 그대로 반환
    const response = {
      ...menu,
      content: content ? content.content : null,
      assets: content ? content.assets : [],
      attachments: content ? content.attachments : files,
      isDownloaded: content !== null,
      downloadPath: baseDir, // 다운로드 경로 정보 추가
    };

    const processingTime = `${Date.now() - startTime}ms`;
    logger.api("GET", `/menu/idx/${chidx}/${action}`, 200, processingTime);

    res.json(response);
  } catch (error) {
    const processingTime = `${Date.now() - startTime}ms`;
    logger.api("GET", `/menu/idx/${chidx}/${action}`, 500, processingTime);
    logger.error(`메뉴 상세 조회 실패: chidx=${chidx}, action=${action}`, error);

    res.status(500).json({ error: error.message });
  }
});

/**
 * action 목록 조회 (천안, 아산, 행복기숙사)
 * GET /menu/actions
 */
router.get("/actions", (req, res) => {
  const startTime = Date.now();

  try {
    logger.api("GET", "/menu/actions", 200, "시작");

    // 기존 응답 구조 그대로 반환
    const actions = [
      {
        action: MENU_TYPES.CHEONAN,
        name: "천안",
      },
      {
        action: MENU_TYPES.ASAN,
        name: "아산",
      },
      {
        action: MENU_TYPES.HAPPY_DORM,
        name: "행복기숙사",
      },
    ];

    const processingTime = `${Date.now() - startTime}ms`;
    logger.api("GET", "/menu/actions", 200, processingTime);

    res.json(actions);
  } catch (error) {
    const processingTime = `${Date.now() - startTime}ms`;
    logger.api("GET", "/menu/actions", 500, processingTime);
    logger.error("메뉴 액션 목록 조회 실패", error);

    res.status(500).json({ error: error.message });
  }
});

/**
 * 메뉴 검색 (행복기숙사 포함)
 * GET /menu/search?title=검색어&author=작성자&action=MAPP_2312012408&page=1&pageSize=20
 */
router.get("/search", async (req, res) => {
  const startTime = Date.now();

  try {
    logger.api("GET", "/menu/search", 200, "시작");

    // MenuHelper의 search 메소드 사용
    const result = await MenuHelper.search(req.query);

    const processingTime = `${Date.now() - startTime}ms`;
    logger.api("GET", "/menu/search", 200, processingTime);

    // 기존 응답 구조 그대로 반환 (type_name 포함)
    res.json(result);
  } catch (error) {
    const processingTime = `${Date.now() - startTime}ms`;
    logger.api("GET", "/menu/search", 500, processingTime);
    logger.error("메뉴 검색 실패", error);

    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
