const express = require("express");
const router = express.Router();
const pool = require("../utils/db");
const fs = require("fs");
const path = require("path");

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

// 공지 상세 (본문/파일)
router.get("/idx/:chidx", async (req, res) => {
  const { chidx } = req.params;
  const sql = `SELECT * FROM tbl_notice WHERE chidx = ? LIMIT 1`;
  try {
    const [notices] = await pool.execute(sql, [chidx]);
    if (notices.length === 0)
      return res.status(404).json({ error: "not found" });

    // detail json 불러오기
    let content = null;
    try {
      const jsonPath = path.join(
        __dirname,
        "..",
        "download",
        String(chidx),
        `${chidx}_detail.json`
      );
      content = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    } catch (e) {
      /* not found: content=null */
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
      attachments: files,
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
    const [rows] = await pool.execute(sql, [
      type,
      String(pageSize),
      String(offset),
    ]);
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
