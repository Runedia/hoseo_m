require("module-alias/register");

const express = require("express");
const router = express.Router();
const EduguideService = require("@root/services/eduguideService");
const { sendError, ErrorTypes } = require("@root/utils/routes/errorHandler");
const { createResponse } = require("@root/utils/routes/responseHelper");
const { createLogger, generateRequestId } = require("@root/utils/logger");

// 수업 크롤링 모듈 import (통합 파일)
const { getClass, CLASS_CONFIGS } = require("@root/process/6_eduguide/get_class");

const logger = createLogger("eduguide-class");

/**
 * 통합 수업 API
 * GET /eduguide/class?type=regist
 */
router.get("/", async (req, res) => {
  const startTime = Date.now();
  const requestId = generateRequestId();

  try {
    const { type = "regist" } = req.query;

    logger.info(`[${requestId}] 🎓 수업 조회 요청 시작 (타입: ${type})`);

    // 타입 유효성 검증
    const config = EduguideService.validateType(type, CLASS_CONFIGS);
    if (!config) {
      const errorResponse = EduguideService.createTypeErrorResponse(type, CLASS_CONFIGS, "수업");
      logger.warn(`[${requestId}] ⚠️ 잘못된 수업 타입: ${type}`);
      return res.status(400).json(createResponse(null, errorResponse, { requestId }));
    }

    // JSON 파일 처리 (자동 생성 포함)
    const classData = await EduguideService.processJsonFile(config.fileName, config.description, getClass, type);

    // 응답 생성
    const response = EduguideService.createResponse(
      `호서대학교 ${config.name}`,
      classData,
      type,
      "섹션 > 텍스트 및 하위 내용 구조"
    );

    const processingTime = Date.now() - startTime;
    logger.info(`[${requestId}] ✅ 수업 조회 성공 (타입: ${type}, ${processingTime}ms)`);

    // 메타 정보 추가하여 응답
    res.json(
      createResponse(response, null, {
        requestId,
        processingTime: `${processingTime}ms`,
      })
    );
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`[${requestId}] ❌ 수업 조회 실패 (${processingTime}ms):`, error);

    sendError(res, ErrorTypes.INTERNAL_ERROR, "수업 정보를 불러오는 중 오류가 발생했습니다.");
  }
});

/**
 * 수업 타입 목록 API
 * GET /eduguide/class/types
 */
router.get("/types", (req, res) => {
  const startTime = Date.now();
  const requestId = generateRequestId();

  try {
    logger.info(`[${requestId}] 📋 수업 타입 목록 조회 요청`);

    const response = EduguideService.createTypesResponse(
      "호서대학교 수업 타입 목록",
      CLASS_CONFIGS,
      "/eduguide/class?type=regist"
    );

    const processingTime = Date.now() - startTime;
    logger.info(`[${requestId}] ✅ 수업 타입 목록 조회 성공 (${processingTime}ms)`);

    // 메타 정보 추가하여 응답
    res.json(
      createResponse(response, null, {
        requestId,
        processingTime: `${processingTime}ms`,
      })
    );
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`[${requestId}] ❌ 수업 타입 목록 조회 실패 (${processingTime}ms):`, error);

    sendError(res, ErrorTypes.INTERNAL_ERROR, "수업 타입 목록을 불러오는 중 오류가 발생했습니다.");
  }
});

module.exports = router;
