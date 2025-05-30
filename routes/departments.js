require("module-alias/register");

const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

// 학과 정보 크롤링 모듈 import
const { extractDepartmentList } = require("@root/process/5_department/get_department_list");

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

module.exports = router;
