require("module-alias/register");

const express = require("express");
const router = express.Router();
const pool = require("@root/utils/db");
const fs = require("fs");
const path = require("path");
const { parseAndSaveNotice } = require("@root/process/1_notice/get_notice_detail"); // 크롤러 함수 import

// 공지 목록 (페이징)
router.get("/list", async (req, res) => {
  const { page = 1, pageSize = 20 } = req.query;
  const offset = (page - 1) * pageSize;
  const sql = `
    SELECT idx, type,  chidx, title, author, create_dt
    FROM tbl_notice
    ORDER BY chidx DESC
    LIMIT ? OFFSET ?
  `;
  try {
    const [rows] = await pool.execute(sql, [String(pageSize), String(offset)]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({
      error: err.message,
      details: {
        sql: sql,
        parameters: [String(pageSize), String(offset)],
        errno: err.errno,
        sqlState: err.sqlState,
      },
    });
  }
});

// 공지 상세 (본문/파일) - 자동 다운로드 기능 추가
router.get("/idx/:chidx", async (req, res) => {
  const { chidx } = req.params;
  const sql = `SELECT * FROM tbl_notice WHERE chidx = ? LIMIT 1`;

  try {
    const [notices] = await pool.execute(sql, [chidx]);
    if (notices.length === 0) {
      return res.status(404).json({ error: "공지사항을 찾을 수 없습니다." });
    }

    // detail json 파일 확인
    const jsonPath = path.join(process.cwd(), "download_notice", String(chidx), `${chidx}_detail.json`);

    let content = null;
    let shouldDownload = false;

    try {
      content = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    } catch (e) {
      // JSON 파일이 없으면 다운로드 필요
      shouldDownload = true;
    }

    // 다운로드가 필요한 경우 실행
    if (shouldDownload) {
      try {
        console.log(`🔄 [${chidx}] 세부 내용 다운로드 시작...`);
        content = await parseAndSaveNotice(chidx);
        console.log(`✅ [${chidx}] 세부 내용 다운로드 완료`);

        // ✅ JSON 저장 이후 다시 DB에서 최신 상태 조회
        const [updated] = await pool.execute(sql, [chidx]);
        if (updated.length > 0) notices[0] = updated[0];
      } catch (downloadError) {
        console.error(`❌ [${chidx}] 다운로드 실패:`, downloadError.message);
        content = null;
      }
    }

    // 첨부파일 조회
    const [files] = await pool.execute(
      `SELECT file_type, file_name, origin_name, file_path, file_url 
       FROM tbl_noticefile WHERE notice_num = ?`,
      [chidx]
    );

    res.json({
      ...notices[0],
      content: content ? content.content : null,
      assets: content ? content.assets : [],
      attachments: content ? content.attachments : files, // JSON이 있으면 JSON 데이터, 없으면 DB 데이터
      isDownloaded: content !== null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 카테고리별 목록
router.get("/type/:type", async (req, res) => {
  const { type } = req.params;
  const { page = 1, pageSize = 20 } = req.query;
  const offset = (page - 1) * pageSize;
  const sql = `
    SELECT idx, type,  chidx, title, author, create_dt
    FROM tbl_notice
    WHERE type = ?
    ORDER BY chidx DESC
    LIMIT ? OFFSET ?
  `;
  try {
    const [rows] = await pool.execute(sql, [type, String(pageSize), String(offset)]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 카테고리 목록
router.get("/types", async (req, res) => {
  try {
    const [rows] = await pool.execute(`SELECT * FROM tbl_noticetype`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/search", async (req, res) => {
  const { title, author } = req.query;
  // 기본값 적용
  const type = req.query.type ? req.query.type : "CTG_17082400011";
  const page = parseInt(req.query.page || "1", 10);
  const pageSize = parseInt(req.query.pageSize || "20", 10);
  const offset = (page - 1) * pageSize;

  let where = [];
  let params = [];

  // 제목 검색
  if (title && title.trim()) {
    where.push("title LIKE ?");
    params.push(`%${title}%`);
  }
  // 작성자 검색
  if (author && author.trim()) {
    where.push("author LIKE ?");
    params.push(`%${author}%`);
  }
  // 카테고리 (항상 기본값 또는 직접 지정)
  if (type && type.trim()) {
    where.push("type = ?");
    params.push(type);
  }

  let whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const sql = `
      SELECT idx, type, chidx, title, author, create_dt
      FROM tbl_notice
      ${whereSql}
      ORDER BY chidx DESC
      LIMIT ${offset}, ${pageSize}
    `;

  try {
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
