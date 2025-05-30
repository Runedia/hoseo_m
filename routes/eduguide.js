require("module-alias/register");

const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

// 학사일정 크롤링 모듈 import
const { getCalendar } = require("@root/process/6_eduguide/get_calendar");

// 교육과정 크롤링 모듈 import (통합 파일)
const { getCurriculum, CURRICULUM_CONFIGS } = require("@root/process/6_eduguide/get_curriculum");

// 수업 크롤링 모듈 import (통합 파일)
const { getClass, CLASS_CONFIGS } = require("@root/process/6_eduguide/get_class");

// 학적 크롤링 모듈 import (통합 파일)
const { getRecord, RECORD_CONFIGS } = require("@root/process/6_eduguide/get_record");

// ====================
// 학사일정 API
// ====================

// 학사일정 JSON API (구조화된 중첩 형태)
router.get("/calendar", async (req, res) => {
  try {
    const jsonPath = path.join(process.cwd(), "assets", "static", "학사일정.json");

    // JSON 파일 존재 여부 확인
    if (!fs.existsSync(jsonPath)) {
      console.log("🔄 학사일정 JSON 파일이 없어 자동 생성 시작...");

      try {
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

    // 메타정보와 함께 응답
    const response = {
      title: "호서대학교 학사일정",
      generatedAt: new Date().toISOString(),
      structure: "nested",
      description: "년도 > 월 > 일 > 이벤트번호 구조",
      data: calendarData,
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

// ====================
// 교육과정 API
// ====================

// 새로운 통합 교육과정 API
router.get("/curriculum", async (req, res) => {
  try {
    const { type = "basic" } = req.query;

    // 사용 가능한 타입 확인
    if (!CURRICULUM_CONFIGS[type]) {
      return res.status(400).json({
        error: `지원하지 않는 교육과정 타입: ${type}`,
        availableTypes: Object.keys(CURRICULUM_CONFIGS),
        typeDescriptions: Object.keys(CURRICULUM_CONFIGS).map((key) => ({
          type: key,
          name: CURRICULUM_CONFIGS[key].name,
          description: CURRICULUM_CONFIGS[key].description,
        })),
      });
    }

    const config = CURRICULUM_CONFIGS[type];
    const jsonPath = path.join(process.cwd(), "assets", "static", `${config.fileName}.json`);

    // JSON 파일 존재 여부 확인
    if (!fs.existsSync(jsonPath)) {
      console.log(`🔄 ${config.description} JSON 파일이 없어 자동 생성 시작...`);

      try {
        await getCurriculum(type);
        console.log(`✅ ${config.description} 자동 생성 완료`);
      } catch (generateError) {
        console.error(`❌ ${config.description} JSON 자동 생성 실패:`, generateError.message);
        return res.status(500).json({
          error: `${config.description} JSON을 자동 생성하는 중 오류가 발생했습니다.`,
          details: generateError.message,
          suggestion: "잠시 후 다시 시도하거나 관리자에게 문의하세요.",
        });
      }
    }

    // JSON 파일 읽기
    const jsonContent = fs.readFileSync(jsonPath, "utf-8");
    const curriculumData = JSON.parse(jsonContent);

    // 메타정보와 함께 응답
    const response = {
      title: `호서대학교 ${config.name}`,
      type: type,
      generatedAt: new Date().toISOString(),
      structure: "hierarchical",
      description: "섹션 > 텍스트 및 하위 내용 구조",
      data: curriculumData,
    };

    res.json(response);
  } catch (error) {
    console.error("통합 교육과정 JSON API 오류:", error);
    res.status(500).json({
      error: "교육과정 JSON을 불러오는 중 오류가 발생했습니다.",
      details: error.message,
    });
  }
});

// 교육과정 타입 목록 API
router.get("/curriculum/types", (req, res) => {
  try {
    const types = Object.keys(CURRICULUM_CONFIGS).map((key) => ({
      type: key,
      name: CURRICULUM_CONFIGS[key].name,
      description: CURRICULUM_CONFIGS[key].description,
      url: CURRICULUM_CONFIGS[key].url,
      fileName: CURRICULUM_CONFIGS[key].fileName,
    }));

    res.json({
      title: "호서대학교 교육과정 타입 목록",
      generatedAt: new Date().toISOString(),
      totalTypes: types.length,
      types: types,
      usage: {
        basicApi: "/eduguide/curriculum?type=basic",
      },
    });
  } catch (error) {
    console.error("교육과정 타입 목록 API 오류:", error);
    res.status(500).json({
      error: "교육과정 타입 목록을 불러오는 중 오류가 발생했습니다.",
      details: error.message,
    });
  }
});

// ====================
// 수업 관련 API
// ====================

// 새로운 통합 수업 API
router.get("/class", async (req, res) => {
  try {
    const { type = "regist" } = req.query;

    // 사용 가능한 타입 확인
    if (!CLASS_CONFIGS[type]) {
      return res.status(400).json({
        error: `지원하지 않는 수업 타입: ${type}`,
        availableTypes: Object.keys(CLASS_CONFIGS),
        typeDescriptions: Object.keys(CLASS_CONFIGS).map((key) => ({
          type: key,
          name: CLASS_CONFIGS[key].name,
          description: CLASS_CONFIGS[key].description,
        })),
      });
    }

    const config = CLASS_CONFIGS[type];
    const jsonPath = path.join(process.cwd(), "assets", "static", `${config.fileName}.json`);

    // JSON 파일 존재 여부 확인
    if (!fs.existsSync(jsonPath)) {
      console.log(`🔄 ${config.description} JSON 파일이 없어 자동 생성 시작...`);

      try {
        await getClass(type);
        console.log(`✅ ${config.description} 자동 생성 완료`);
      } catch (generateError) {
        console.error(`❌ ${config.description} JSON 자동 생성 실패:`, generateError.message);
        return res.status(500).json({
          error: `${config.description} JSON을 자동 생성하는 중 오류가 발생했습니다.`,
          details: generateError.message,
          suggestion: "잠시 후 다시 시도하거나 관리자에게 문의하세요.",
        });
      }
    }

    // JSON 파일 읽기
    const jsonContent = fs.readFileSync(jsonPath, "utf-8");
    const classData = JSON.parse(jsonContent);

    // 메타정보와 함께 응답
    const response = {
      title: `호서대학교 ${config.name}`,
      type: type,
      generatedAt: new Date().toISOString(),
      structure: "hierarchical",
      description: "섹션 > 텍스트 및 하위 내용 구조",
      data: classData,
    };

    res.json(response);
  } catch (error) {
    console.error("통합 수업 JSON API 오류:", error);
    res.status(500).json({
      error: "수업 JSON을 불러오는 중 오류가 발생했습니다.",
      details: error.message,
    });
  }
});

// 수업 타입 목록 API
router.get("/class/types", (req, res) => {
  try {
    const types = Object.keys(CLASS_CONFIGS).map((key) => ({
      type: key,
      name: CLASS_CONFIGS[key].name,
      description: CLASS_CONFIGS[key].description,
      url: CLASS_CONFIGS[key].url,
      fileName: CLASS_CONFIGS[key].fileName,
    }));

    res.json({
      title: "호서대학교 수업 타입 목록",
      generatedAt: new Date().toISOString(),
      totalTypes: types.length,
      types: types,
      usage: {
        basicApi: "/eduguide/class?type=regist",
      },
    });
  } catch (error) {
    console.error("수업 타입 목록 API 오류:", error);
    res.status(500).json({
      error: "수업 타입 목록을 불러오는 중 오류가 발생했습니다.",
      details: error.message,
    });
  }
});

// ====================
// 학적 관련 API
// ====================

// 새로운 통합 학적 API
router.get("/record", async (req, res) => {
  try {
    const { type = "test" } = req.query;

    // 사용 가능한 타입 확인
    if (!RECORD_CONFIGS[type]) {
      return res.status(400).json({
        error: `지원하지 않는 학적 타입: ${type}`,
        availableTypes: Object.keys(RECORD_CONFIGS),
        typeDescriptions: Object.keys(RECORD_CONFIGS).map((key) => ({
          type: key,
          name: RECORD_CONFIGS[key].name,
          description: RECORD_CONFIGS[key].description,
        })),
      });
    }

    const config = RECORD_CONFIGS[type];
    const jsonPath = path.join(process.cwd(), "assets", "static", `${config.fileName}.json`);

    // JSON 파일 존재 여부 확인
    if (!fs.existsSync(jsonPath)) {
      console.log(`🔄 ${config.description} JSON 파일이 없어 자동 생성 시작...`);

      try {
        await getRecord(type);
        console.log(`✅ ${config.description} 자동 생성 완료`);
      } catch (generateError) {
        console.error(`❌ ${config.description} JSON 자동 생성 실패:`, generateError.message);
        return res.status(500).json({
          error: `${config.description} JSON을 자동 생성하는 중 오류가 발생했습니다.`,
          details: generateError.message,
          suggestion: "잠시 후 다시 시도하거나 관리자에게 문의하세요.",
        });
      }
    }

    // JSON 파일 읽기
    const jsonContent = fs.readFileSync(jsonPath, "utf-8");
    const recordData = JSON.parse(jsonContent);

    // 메타정보와 함께 응답
    const response = {
      title: `호서대학교 ${config.name}`,
      type: type,
      generatedAt: new Date().toISOString(),
      structure: "hierarchical",
      description: "섹션 > 텍스트 및 하위 내용 구조",
      data: recordData,
    };

    res.json(response);
  } catch (error) {
    console.error("통합 학적 JSON API 오류:", error);
    res.status(500).json({
      error: "학적 JSON을 불러오는 중 오류가 발생했습니다.",
      details: error.message,
    });
  }
});

// 학적 타입 목록 API
router.get("/record/types", (req, res) => {
  try {
    const types = Object.keys(RECORD_CONFIGS).map((key) => ({
      type: key,
      name: RECORD_CONFIGS[key].name,
      description: RECORD_CONFIGS[key].description,
      url: RECORD_CONFIGS[key].url,
      fileName: RECORD_CONFIGS[key].fileName,
      excludeItems: RECORD_CONFIGS[key].excludeItems || [],
    }));

    res.json({
      title: "호서대학교 학적 타입 목록",
      generatedAt: new Date().toISOString(),
      totalTypes: types.length,
      types: types,
      usage: {
        basicApi: "/eduguide/record?type=test",
      },
    });
  } catch (error) {
    console.error("학적 타입 목록 API 오류:", error);
    res.status(500).json({
      error: "학적 타입 목록을 불러오는 중 오류가 발생했습니다.",
      details: error.message,
    });
  }
});

module.exports = router;

