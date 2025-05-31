require("module-alias/register");

const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

// 학과 정보 크롤링 모듈 import
const { extractDepartmentList } = require("@root/process/5_department/get_department_list");
const DepartmentCrawler = require("@root/process/5_department/department_crawler");

// ====================
// 학과 정보 API
// ====================

// 학과 정보 JSON API
router.get("/list", async (req, res) => {
  try {
    const { format = "detailed" } = req.query;

    // 포맷 옵션 확인
    const validFormats = ["detailed", "simple"];
    if (!validFormats.includes(format)) {
      return res.status(400).json({
        error: `지원하지 않는 포맷: ${format}`,
        availableFormats: validFormats,
        description: {
          detailed: "대학별 그룹화된 상세 정보",
          simple: "단순 리스트 형태",
        },
      });
    }

    const fileName = format === "simple" ? "departments_simple.json" : "departments.json";
    const jsonPath = path.join(process.cwd(), "assets", "static", fileName);

    // JSON 파일 존재 여부 확인
    if (!fs.existsSync(jsonPath)) {
      console.log("🔄 학과 정보 JSON 파일이 없어 자동 생성 시작...");

      try {
        await extractDepartmentList();
        console.log("✅ 학과 정보 자동 생성 완료");
      } catch (generateError) {
        console.error("❌ 학과 정보 JSON 자동 생성 실패:", generateError.message);
        return res.status(500).json({
          error: "학과 정보 JSON을 자동 생성하는 중 오류가 발생했습니다.",
          details: generateError.message,
          suggestion: "잠시 후 다시 시도하거나 관리자에게 문의하세요.",
        });
      }
    }

    // JSON 파일 읽기
    const jsonContent = fs.readFileSync(jsonPath, "utf-8");
    const departmentData = JSON.parse(jsonContent);

    // 메타정보와 함께 응답
    const response = {
      title: "호서대학교 학부(과) 정보",
      format: format,
      generatedAt: new Date().toISOString(),
      description: format === "simple" ? "단순 리스트 형태의 학과 정보" : "대학별 그룹화된 상세 학과 정보",
      ...(format === "detailed" &&
        departmentData.statistics && {
          statistics: departmentData.statistics,
        }),
      data: format === "detailed" ? departmentData : departmentData,
    };

    res.json(response);
  } catch (error) {
    console.error("학과 정보 JSON API 오류:", error);
    res.status(500).json({
      error: "학과 정보 JSON을 불러오는 중 오류가 발생했습니다.",
      details: error.message,
    });
  }
});

// 학과 상세 정보 API - 특정 학과 정보 조회
router.get("/info", async (req, res) => {
  try {
    const { dept } = req.query;

    if (!dept) {
      return res.status(400).json({
        error: "학과명(dept)을 쿼리 파라미터로 전달해주세요.",
        example: "/departments/info?dept=컴퓨터공학부",
      });
    }

    // 상세 학과 정보가 저장된 JSON 파일 경로
    const detailedJsonPath = path.join(process.cwd(), "assets", "static", "departments_detailed.json");

    // 파일 존재 여부 확인
    if (!fs.existsSync(detailedJsonPath)) {
      // 파일이 없으면 간략 정보에서 검색
      const simpleJsonPath = path.join(process.cwd(), "assets", "static", "departments_simple.json");

      if (!fs.existsSync(simpleJsonPath)) {
        return res.status(404).json({
          error: "학과 정보 파일을 찾을 수 없습니다.",
          suggestion: "먼저 학과 정보를 크롤링해주세요.",
        });
      }

      const simpleData = JSON.parse(fs.readFileSync(simpleJsonPath, "utf-8"));
      const department = simpleData.find((d) => d.name === dept);

      if (!department) {
        return res.status(404).json({
          error: `'${dept}' 학과를 찾을 수 없습니다.`,
          suggestion: "정확한 학과명을 입력해주세요.",
        });
      }

      // 발견한 학과를 크롤링
      const crawler = new DepartmentCrawler();
      const detailedInfo = await crawler.crawlDepartmentDetail(department);

      if (!detailedInfo) {
        return res.status(500).json({
          error: `'${dept}' 학과 정보를 가져오는데 실패했습니다.`,
          suggestion: "잠시 후 다시 시도해주세요.",
        });
      }

      return res.json({
        message: "학과 정보를 성공적으로 가져왔습니다.",
        data: detailedInfo,
      });
    }

    // 상세 정보 파일이 있으면 해당 파일에서 학과 찾기
    const detailedData = JSON.parse(fs.readFileSync(detailedJsonPath, "utf-8"));
    const department = detailedData.find((d) => d.name === dept);

    if (!department) {
      return res.status(404).json({
        error: `'${dept}' 학과를 찾을 수 없습니다.`,
        suggestion: "정확한 학과명을 입력해주세요.",
      });
    }

    return res.json({
      message: "학과 정보를 성공적으로 가져왔습니다.",
      data: department,
    });
  } catch (error) {
    console.error("학과 상세 정보 API 오류:", error);
    res.status(500).json({
      error: "학과 정보를 가져오는 중 오류가 발생했습니다.",
      details: error.message,
    });
  }
});

// 학과 이미지 다운로드 API
router.get("/images/:filename", (req, res) => {
  try {
    const { filename } = req.params;

    // 파일 경로 설정
    const imagePath = path.join(process.cwd(), "assets", "static", "images", filename);

    // 파일 존재 여부 확인
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({
        error: `'${filename}' 이미지를 찾을 수 없습니다.`,
        suggestion: "정확한 파일명을 확인해주세요.",
      });
    }

    // 파일 확장자 확인
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
    };

    // Content-Type 설정
    if (mimeTypes[ext]) {
      res.setHeader("Content-Type", mimeTypes[ext]);
    }

    // 파일 전송
    return res.sendFile(imagePath);
  } catch (error) {
    console.error("학과 이미지 다운로드 API 오류:", error);
    res.status(500).json({
      error: "이미지를 가져오는 중 오류가 발생했습니다.",
      details: error.message,
    });
  }
});

module.exports = router;
