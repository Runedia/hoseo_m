const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

// 학사일정 크롤링 모듈 import
const { generateCalendarHTML } = require("../process/6_edugrad/get_calendar");
const { parseCalendarToJson, generateHelperFunctions } = require("../process/6_edugrad/parse_calendar_to_json");

// 학사일정 HTML API
router.get("/calendar", async (req, res) => {
  try {
    const calendarPath = path.join(process.cwd(), "assets", "학사일정.html");

    // 파일 존재 여부 확인
    if (!fs.existsSync(calendarPath)) {
      console.log("🔄 학사일정 HTML 파일이 없어 자동 생성 시작...");
      
      try {
        // 1. HTML 크롤링 및 생성
        await generateCalendarHTML();
        console.log("✅ 학사일정 HTML 자동 생성 완료");
        
        // 2. JSON 파싱도 함께 실행
        await parseCalendarToJson();
        await generateHelperFunctions();
        console.log("✅ 학사일정 JSON 자동 생성 완료");
        
      } catch (generateError) {
        console.error("❌ 학사일정 자동 생성 실패:", generateError.message);
        return res.status(500).json({
          error: "학사일정을 자동 생성하는 중 오류가 발생했습니다.",
          details: generateError.message,
          suggestion: "잠시 후 다시 시도하거나 관리자에게 문의하세요."
        });
      }
    }

    // HTML 파일 읽기
    const htmlContent = fs.readFileSync(calendarPath, "utf-8");

    // HTML로 응답
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(htmlContent);
  } catch (error) {
    console.error("학사일정 API 오류:", error);
    res.status(500).json({
      error: "학사일정을 불러오는 중 오류가 발생했습니다.",
      details: error.message
    });
  }
});

// 학사일정 JSON API
router.get("/calendar/json", async (req, res) => {
  try {
    const jsonPath = path.join(process.cwd(), "assets", "학사일정.json");
    const htmlPath = path.join(process.cwd(), "assets", "학사일정.html");

    // JSON 파일 존재 여부 확인
    if (!fs.existsSync(jsonPath)) {
      console.log("🔄 학사일정 JSON 파일이 없어 자동 생성 시작...");
      
      try {
        // 1. HTML이 없으면 먼저 HTML 생성
        if (!fs.existsSync(htmlPath)) {
          console.log("📄 HTML 파일도 없어 먼저 생성...");
          await generateCalendarHTML();
          console.log("✅ HTML 생성 완료");
        }
        
        // 2. JSON 파싱 실행
        await parseCalendarToJson();
        await generateHelperFunctions();
        console.log("✅ 학사일정 JSON 자동 생성 완료");
        
      } catch (generateError) {
        console.error("❌ 학사일정 JSON 자동 생성 실패:", generateError.message);
        return res.status(500).json({
          error: "학사일정 JSON을 자동 생성하는 중 오류가 발생했습니다.",
          details: generateError.message,
          suggestion: "잠시 후 다시 시도하거나 관리자에게 문의하세요."
        });
      }
    }

    // JSON 파일 읽기
    const jsonContent = fs.readFileSync(jsonPath, "utf-8");
    const calendarData = JSON.parse(jsonContent);

    // 쿼리 파라미터 처리
    const { date, month, year, limit } = req.query;
    let filteredEvents = calendarData.events;

    // 날짜별 필터링 (YYYY-MM-DD)
    if (date) {
      filteredEvents = filteredEvents.filter((event) => event.date === date);
    }

    // 월별 필터링 (YYYY-MM 형태)
    if (month) {
      filteredEvents = filteredEvents.filter((event) => {
        const eventMonth = `${event.year}-${String(event.monthNumber).padStart(2, "0")}`;
        return eventMonth === month;
      });
    }

    // 연도별 필터링
    if (year) {
      filteredEvents = filteredEvents.filter((event) => event.year === parseInt(year));
    }

    // 개수 제한
    if (limit) {
      filteredEvents = filteredEvents.slice(0, parseInt(limit));
    }

    // 응답 데이터 구성
    const response = {
      ...calendarData,
      events: filteredEvents,
      filtered: {
        totalCount: filteredEvents.length,
        originalCount: calendarData.events.length,
        filters: { date, month, year, limit },
      },
    };

    res.json(response);
  } catch (error) {
    console.error("학사일정 JSON API 오류:", error);
    res.status(500).json({
      error: "학사일정 JSON을 불러오는 중 오류가 발생했습니다.",
      details: error.message,
    });
  }
});

module.exports = router;
