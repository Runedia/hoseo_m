require("module-alias/register");

const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

// 로그 파일 목록 조회
router.get("/", async (req, res) => {
  try {
    const logsDir = path.join(process.cwd(), "logs");
    const files = fs.readdirSync(logsDir);

    // .log 파일만 필터링하고 파일 정보 추가
    const logFiles = files
      .filter((file) => file.endsWith(".log") || file.includes(".log"))
      .map((file) => {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          modified: stats.mtime,
          created: stats.birthtime,
        };
      })
      .sort((a, b) => b.modified - a.modified); // 최신 수정일 순으로 정렬

    res.json({
      count: logFiles.length,
      files: logFiles,
    });
  } catch (err) {
    res.status(500).json({
      error: "로그 파일 목록을 불러올 수 없습니다.",
      details: err.message,
    });
  }
});

// 특정 로그 파일 내용 조회
router.get("/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const logsDir = path.join(process.cwd(), "logs");
    const filePath = path.join(logsDir, filename);

    // 파일 존재 여부 확인
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: "로그 파일을 찾을 수 없습니다.",
        filename: filename,
      });
    }

    // 보안을 위해 logs 디렉토리 외부 파일 접근 차단
    if (!filePath.startsWith(logsDir)) {
      return res.status(403).json({
        error: "접근이 제한된 파일입니다.",
      });
    }

    // 파일 내용을 텍스트로 직접 반환
    const content = fs.readFileSync(filePath, "utf-8");

    // Content-Type을 text/plain으로 설정
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(content);
  } catch (err) {
    res.status(500).json({
      error: "로그 파일을 읽을 수 없습니다.",
      details: err.message,
    });
  }
});

module.exports = router;

