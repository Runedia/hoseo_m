require("module-alias/register");

const express = require("express");
const router = express.Router();

// 분할된 교육가이드 라우터들 import
const calendarRouter = require("./eduguide/calendar");
const curriculumRouter = require("./eduguide/curriculum");
const classRouter = require("./eduguide/class");
const recordRouter = require("./eduguide/record");

// ====================
// 교육가이드 통합 라우터
// ====================

// 학사일정 라우터 연결
router.use("/calendar", calendarRouter);

// 교육과정 라우터 연결
router.use("/curriculum", curriculumRouter);

// 수업 라우터 연결
router.use("/class", classRouter);

// 학적 라우터 연결
router.use("/record", recordRouter);

// API 정보 엔드포인트 (선택사항)
router.get("/", (req, res) => {
  res.json({
    title: "호서대학교 교육가이드 API",
    description: "학사일정, 교육과정, 수업, 학적 정보를 제공하는 통합 API",
    generatedAt: new Date().toISOString(),
    availableEndpoints: {
      calendar: {
        path: "/eduguide/calendar",
        description: "학사일정 조회",
      },
      curriculum: {
        path: "/eduguide/curriculum",
        description: "교육과정 조회",
        subPaths: {
          types: "/eduguide/curriculum/types",
        },
      },
      class: {
        path: "/eduguide/class",
        description: "수업 정보 조회",
        subPaths: {
          types: "/eduguide/class/types",
        },
      },
      record: {
        path: "/eduguide/record",
        description: "학적 정보 조회",
        subPaths: {
          types: "/eduguide/record/types",
        },
      },
    },
    usage: {
      examples: [
        "/eduguide/calendar",
        "/eduguide/curriculum?type=basic",
        "/eduguide/curriculum/types",
        "/eduguide/class?type=regist",
        "/eduguide/class/types",
        "/eduguide/record?type=test",
        "/eduguide/record/types",
      ],
    },
  });
});

module.exports = router;
