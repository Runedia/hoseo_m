require("module-alias/register");

const express = require("express");
const router = express.Router();
const EduguideService = require("@root/services/eduguideService");
const { sendError, ErrorTypes } = require("@root/utils/routes/errorHandler");
const { createResponse } = require("@root/utils/routes/responseHelper");
const { createLogger, generateRequestId } = require("@root/utils/logger");

// 교육과정 크롤링 모듈 import (통합 파일)
const { getCurriculum, CURRICULUM_CONFIGS } = require("@root/process/6_eduguide/get_curriculum");

const logger = createLogger("eduguide-curriculum");

/**
 * 통합 교육과정 API
 * GET /eduguide/curriculum?type=basic
 */
router.get("/", async (req, res) => {
  const startTime = Date.now();
  const requestId = generateRequestId();

  try {
    const { type = "basic" } = req.query;

    logger.info(`[${requestId}] 📚 교육과정 조회 요청 시작 (타입: ${type})`);

    // 타입 유효성 검증
    const config = EduguideService.validateType(type, CURRICULUM_CONFIGS);
    if (!config) {
      const errorResponse = EduguideService.createTypeErrorResponse(type, CURRICULUM_CONFIGS, "교육과정");
      logger.warn(`[${requestId}] ⚠️ 잘못된 교육과정 타입: ${type}`);
      return res.status(400).json(createResponse(null, errorResponse, { requestId }));
    }

    // JSON 파일 처리 (자동 생성 포함)
    const curriculumData = await EduguideService.processJsonFile(
      config.fileName,
      config.description,
      getCurriculum,
      type
    );

    // 응답 생성
    const response = EduguideService.createResponse(
      `호서대학교 ${config.name}`,
      curriculumData,
      type,
      "섹션 > 텍스트 및 하위 내용 구조"
    );

    const processingTime = Date.now() - startTime;
    logger.info(`[${requestId}] ✅ 교육과정 조회 성공 (타입: ${type}, ${processingTime}ms)`);

    // 메타 정보 추가하여 응답
    res.json(
      createResponse(response, null, {
        requestId,
        processingTime: `${processingTime}ms`,
      })
    );
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`[${requestId}] ❌ 교육과정 조회 실패 (${processingTime}ms):`, error);

    sendError(res, ErrorTypes.INTERNAL_ERROR, "교육과정을 불러오는 중 오류가 발생했습니다.");
  }
});

/**
 * 교육과정 타입 목록 API
 * GET /eduguide/curriculum/types
 */
router.get("/types", (req, res) => {
  const startTime = Date.now();
  const requestId = generateRequestId();

  try {
    logger.info(`[${requestId}] 📋 교육과정 타입 목록 조회 요청`);

    const response = EduguideService.createTypesResponse(
      "호서대학교 교육과정 타입 목록",
      CURRICULUM_CONFIGS,
      "/eduguide/curriculum?type=basic"
    );

    const processingTime = Date.now() - startTime;
    logger.info(`[${requestId}] ✅ 교육과정 타입 목록 조회 성공 (${processingTime}ms)`);

    // 메타 정보 추가하여 응답
    res.json(
      createResponse(response, null, {
        requestId,
        processingTime: `${processingTime}ms`,
      })
    );
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`[${requestId}] ❌ 교육과정 타입 목록 조회 실패 (${processingTime}ms):`, error);

    sendError(res, ErrorTypes.INTERNAL_ERROR, "교육과정 타입 목록을 불러오는 중 오류가 발생했습니다.");
  }
});

module.exports = router;
