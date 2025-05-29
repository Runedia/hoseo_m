require("module-alias/register");

const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

// 학사일정 크롤링 모듈 import
const { getCalendar } = require("@root/process/6_eduguide/get_calendar");

// 교육과정 크롤링 모듈 import
const { getCurriculum } = require("@root/process/6_eduguide/get_curriculum1");

// 학사일정 HTML API
router.get("/calendar", async (req, res) => {
  try {
    const calendarPath = path.join(process.cwd(), "assets", "static", "학사일정.html");

    // 파일 존재 여부 확인
    if (!fs.existsSync(calendarPath)) {
      console.log("🔄 학사일정 HTML 파일이 없어 자동 생성 시작...");

      try {
        // HTML 크롤링 및 JSON 파싱까지 한번에 실행
        await getCalendar();
        console.log("✅ 학사일정 자동 생성 완료");
      } catch (generateError) {
        console.error("❌ 학사일정 자동 생성 실패:", generateError.message);
        return res.status(500).json({
          error: "학사일정을 자동 생성하는 중 오류가 발생했습니다.",
          details: generateError.message,
          suggestion: "잠시 후 다시 시도하거나 관리자에게 문의하세요.",
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
      details: error.message,
    });
  }
});

// 학사일정 JSON API (구조화된 중첩 형태)
router.get("/calendar/json", async (req, res) => {
  try {
    const jsonPath = path.join(process.cwd(), "assets", "static", "학사일정.json");
    // const htmlPath = path.join(process.cwd(), "assets", "학사일정.html");

    // JSON 파일 존재 여부 확인
    if (!fs.existsSync(jsonPath)) {
      console.log("🔄 학사일정 JSON 파일이 없어 자동 생성 시작...");

      try {
        // HTML과 JSON을 한번에 생성
        await getCalendar();
        console.log("✅ 학사일정 자동 생성 완료");
      } catch (generateError) {
        console.error("❌ 학사일정 JSON 자동 생성 실패:", generateError.message);
        return res.status(500).json({
          error: "학사일정 JSON을 자동 생성하는 중 오류가 발생했습니다.",
          details: generateError.message,
          suggestion: "잠시 후 다시 시도하거나 관리자에게 문의하세요.",
        });
      }
    }

    // JSON 파일 읽기
    const jsonContent = fs.readFileSync(jsonPath, "utf-8");
    const calendarData = JSON.parse(jsonContent);

    // 쿼리 파라미터 처리
    const { year, month, day, limit } = req.query;
    let responseData = { ...calendarData };

    // 연도별 필터링
    if (year) {
      const targetYear = parseInt(year);
      if (calendarData[targetYear]) {
        responseData = { [targetYear]: calendarData[targetYear] };
      } else {
        responseData = {};
      }
    }

    // 월별 필터링
    if (month && year) {
      const targetYear = parseInt(year);
      const targetMonth = parseInt(month);
      if (calendarData[targetYear] && calendarData[targetYear][targetMonth]) {
        responseData = {
          [targetYear]: {
            [targetMonth]: calendarData[targetYear][targetMonth],
          },
        };
      } else {
        responseData = {};
      }
    }

    // 일별 필터링
    if (day && month && year) {
      const targetYear = parseInt(year);
      const targetMonth = parseInt(month);
      const targetDay = parseInt(day);
      if (
        calendarData[targetYear] &&
        calendarData[targetYear][targetMonth] &&
        calendarData[targetYear][targetMonth][targetDay]
      ) {
        responseData = {
          [targetYear]: {
            [targetMonth]: {
              [targetDay]: calendarData[targetYear][targetMonth][targetDay],
            },
          },
        };
      } else {
        responseData = {};
      }
    }

    // 통계 정보 추가
    let totalEvents = 0;
    let totalDays = 0;

    Object.keys(responseData).forEach((y) => {
      if (typeof responseData[y] === "object") {
        Object.keys(responseData[y]).forEach((m) => {
          if (typeof responseData[y][m] === "object") {
            Object.keys(responseData[y][m]).forEach((d) => {
              if (typeof responseData[y][m][d] === "object") {
                totalDays++;
                totalEvents += Object.keys(responseData[y][m][d]).length;
              }
            });
          }
        });
      }
    });

    // 메타정보와 함께 응답
    const response = {
      title: "호서대학교 학사일정",
      generatedAt: new Date().toISOString(),
      structure: "nested", // 중첩 구조임을 명시
      description: "년도 > 월 > 일 > 이벤트번호 구조",
      filters: { year, month, day, limit },
      statistics: {
        totalEvents,
        totalDays,
        years: Object.keys(responseData).length,
      },
      data: responseData,
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

// 교육과정 HTML API
router.get("/curriculum", async (req, res) => {
  try {
    const curriculumPath = path.join(process.cwd(), "assets", "static", "교육과정.html");

    // 파일 존재 여부 확인
    if (!fs.existsSync(curriculumPath)) {
      console.log("🔄 교육과정 HTML 파일이 없어 자동 생성 시작...");

      try {
        // HTML 크롤링 및 JSON 파싱까지 한번에 실행
        await getCurriculum();
        console.log("✅ 교육과정 자동 생성 완료");
      } catch (generateError) {
        console.error("❌ 교육과정 자동 생성 실패:", generateError.message);
        return res.status(500).json({
          error: "교육과정을 자동 생성하는 중 오류가 발생했습니다.",
          details: generateError.message,
          suggestion: "잠시 후 다시 시도하거나 관리자에게 문의하세요.",
        });
      }
    }

    // HTML 파일 읽기
    const htmlContent = fs.readFileSync(curriculumPath, "utf-8");

    // HTML로 응답
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(htmlContent);
  } catch (error) {
    console.error("교육과정 API 오류:", error);
    res.status(500).json({
      error: "교육과정을 불러오는 중 오류가 발생했습니다.",
      details: error.message,
    });
  }
});

// 교육과정 JSON API (구조화된 형태)
router.get("/curriculum/json", async (req, res) => {
  try {
    const jsonPath = path.join(process.cwd(), "assets", "static", "교육과정.json");

    // JSON 파일 존재 여부 확인
    if (!fs.existsSync(jsonPath)) {
      console.log("🔄 교육과정 JSON 파일이 없어 자동 생성 시작...");

      try {
        // HTML과 JSON을 한번에 생성
        await getCurriculum();
        console.log("✅ 교육과정 자동 생성 완료");
      } catch (generateError) {
        console.error("❌ 교육과정 JSON 자동 생성 실패:", generateError.message);
        return res.status(500).json({
          error: "교육과정 JSON을 자동 생성하는 중 오류가 발생했습니다.",
          details: generateError.message,
          suggestion: "잠시 후 다시 시도하거나 관리자에게 문의하세요.",
        });
      }
    }

    // JSON 파일 읽기
    const jsonContent = fs.readFileSync(jsonPath, "utf-8");
    const curriculumData = JSON.parse(jsonContent);

    // 쿼리 파라미터 처리
    const { section, search, limit } = req.query;
    let responseData = { ...curriculumData };

    // 섹션별 필터링
    if (section) {
      const targetSection = section.toString();
      if (curriculumData[targetSection]) {
        responseData = { [targetSection]: curriculumData[targetSection] };
      } else {
        responseData = {};
      }
    }

    // 검색 기능
    if (search) {
      const searchTerm = search.toLowerCase();
      const filteredData = {};
      
      Object.keys(curriculumData).forEach(sectionKey => {
        const sectionData = curriculumData[sectionKey];
        
        // 섹션 제목에서 검색
        if (sectionData.text && sectionData.text.toLowerCase().includes(searchTerm)) {
          filteredData[sectionKey] = sectionData;
        } else {
          // 하위 내용에서 검색
          const matchingChildren = {};
          Object.keys(sectionData.children || {}).forEach(childKey => {
            const childContent = sectionData.children[childKey];
            if (typeof childContent === 'string' && childContent.toLowerCase().includes(searchTerm)) {
              matchingChildren[childKey] = childContent;
            }
          });
          
          if (Object.keys(matchingChildren).length > 0) {
            filteredData[sectionKey] = {
              ...sectionData,
              children: matchingChildren
            };
          }
        }
      });
      
      responseData = filteredData;
    }

    // 결과 제한
    if (limit) {
      const limitNum = parseInt(limit);
      const limitedData = {};
      const keys = Object.keys(responseData).slice(0, limitNum);
      keys.forEach(key => {
        limitedData[key] = responseData[key];
      });
      responseData = limitedData;
    }

    // 통계 정보 계산
    let totalSections = Object.keys(responseData).length;
    let totalContent = 0;

    Object.keys(responseData).forEach(sectionKey => {
      const section = responseData[sectionKey];
      if (section.children) {
        totalContent += Object.keys(section.children).length;
      }
    });

    // 메타정보와 함께 응답
    const response = {
      title: "호서대학교 교육과정",
      generatedAt: new Date().toISOString(),
      structure: "hierarchical", // 계층 구조임을 명시
      description: "섹션 > 텍스트 및 하위 내용 구조",
      filters: { section, search, limit },
      statistics: {
        totalSections,
        totalContent,
        filteredSections: Object.keys(responseData).length,
      },
      data: responseData,
    };

    res.json(response);
  } catch (error) {
    console.error("교육과정 JSON API 오류:", error);
    res.status(500).json({
      error: "교육과정 JSON을 불러오는 중 오류가 발생했습니다.",
      details: error.message,
    });
  }
});

module.exports = router;

