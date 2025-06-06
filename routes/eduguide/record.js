require("module-alias/register");

const express = require("express");
const router = express.Router();
const EduguideService = require("@root/services/eduguideService");
const { sendError, ErrorTypes } = require("@root/utils/routes/errorHandler");
const { createResponse } = require("@root/utils/routes/responseHelper");
const { createLogger, generateRequestId } = require("@root/utils/logger");

// 학적 크롤링 모듈 import (통합 파일)
const { getRecord, RECORD_CONFIGS } = require("@root/process/6_eduguide/get_record");

const logger = createLogger("eduguide-record");

/**
 * 통합 학적 API
 * GET /eduguide/record?type=test
 */
router.get("/", async (req, res) => {
  const startTime = Date.now();
  const requestId = generateRequestId();

  try {
    const { type = "test" } = req.query;

    logger.info(`[${requestId}] 📝 학적 조회 요청 시작 (타입: ${type})`);

    // 타입 유효성 검증
    const config = EduguideService.validateType(type, RECORD_CONFIGS);
    if (!config) {
      const errorResponse = EduguideService.createTypeErrorResponse(type, RECORD_CONFIGS, "학적");
      logger.warn(`[${requestId}] ⚠️ 잘못된 학적 타입: ${type}`);
      return res.status(400).json(createResponse(null, errorResponse, { requestId }));
    }

    // JSON 파일 처리 (자동 생성 포함)
    const recordData = await EduguideService.processJsonFile(config.fileName, config.description, getRecord, type);

    // 응답 생성
    const response = EduguideService.createResponse(
      `호서대학교 ${config.name}`,
      recordData,
      type,
      "섹션 > 텍스트 및 하위 내용 구조"
    );

    const processingTime = Date.now() - startTime;
    logger.info(`[${requestId}] ✅ 학적 조회 성공 (타입: ${type}, ${processingTime}ms)`);

    // 메타 정보 추가하여 응답
    res.json(
      createResponse(response, null, {
        requestId,
        processingTime: `${processingTime}ms`,
      })
    );
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`[${requestId}] ❌ 학적 조회 실패 (${processingTime}ms):`, error);

    sendError(res, ErrorTypes.INTERNAL_ERROR, "학적 정보를 불러오는 중 오류가 발생했습니다.");
  }
});

/**
 * 학적 타입 목록 API
 * GET /eduguide/record/types
 */
router.get("/types", (req, res) => {
  const startTime = Date.now();
  const requestId = generateRequestId();

  try {
    logger.info(`[${requestId}] 📋 학적 타입 목록 조회 요청`);

    const response = EduguideService.createTypesResponse(
      "호서대학교 학적 타입 목록",
      RECORD_CONFIGS,
      "/eduguide/record?type=test"
    );

    const processingTime = Date.now() - startTime;
    logger.info(`[${requestId}] ✅ 학적 타입 목록 조회 성공 (${processingTime}ms)`);

    // 메타 정보 추가하여 응답
    res.json(
      createResponse(response, null, {
        requestId,
        processingTime: `${processingTime}ms`,
      })
    );
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`[${requestId}] ❌ 학적 타입 목록 조회 실패 (${processingTime}ms):`, error);

    sendError(res, ErrorTypes.INTERNAL_ERROR, "학적 타입 목록을 불러오는 중 오류가 발생했습니다.");
  }
});

module.exports = router;
