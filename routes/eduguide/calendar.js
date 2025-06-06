require("module-alias/register");

const express = require("express");
const router = express.Router();
const EduguideService = require("@root/services/eduguideService");
const { sendError, ErrorTypes } = require("@root/utils/routes/errorHandler");
const { createResponse } = require("@root/utils/routes/responseHelper");
const { createLogger, generateRequestId } = require("@root/utils/logger");

// 학사일정 크롤링 모듈 import
const { getCalendar } = require("@root/process/6_eduguide/get_calendar");

const logger = createLogger("eduguide-calendar");

/**
 * 학사일정 JSON API (구조화된 중첩 형태)
 * GET /eduguide/calendar
 */
router.get("/", async (req, res) => {
  const startTime = Date.now();
  const requestId = generateRequestId();

  try {
    logger.info(`[${requestId}] 📅 학사일정 조회 요청 시작`);

    // JSON 파일 처리 (자동 생성 포함)
    const calendarData = await EduguideService.processJsonFile("학사일정", "학사일정", getCalendar);

    // 응답 생성
    const response = EduguideService.createResponse(
      "호서대학교 학사일정",
      calendarData,
      null,
      "년도 > 월 > 일 > 이벤트번호 구조"
    );

    const processingTime = Date.now() - startTime;
    logger.info(`[${requestId}] ✅ 학사일정 조회 성공 (${processingTime}ms)`);

    // 메타 정보 추가하여 응답
    res.json(
      createResponse(response, null, {
        requestId,
        processingTime: `${processingTime}ms`,
      })
    );
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`[${requestId}] ❌ 학사일정 조회 실패 (${processingTime}ms):`, error);

    sendError(res, ErrorTypes.INTERNAL_ERROR, "학사일정을 불러오는 중 오류가 발생했습니다.");
  }
});

module.exports = router;
