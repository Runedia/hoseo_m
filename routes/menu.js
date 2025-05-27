require("module-alias/register");

const express = require("express");
const router = express.Router();
const pool = require("@root/utils/db");
const fs = require("fs");
const path = require("path");
const { parseAndSaveMenu } = require("@root/process/4_menu/get_menu_detail"); // 크롤러 함수 import

// 메뉴 목록 (페이징)
router.get("/list", async (req, res) => {
  const { page = 1, pageSize = 20 } = req.query;
  const offset = (page - 1) * pageSize;
  const sql = `
    SELECT idx, type, chidx, title, author, create_dt
    FROM TBL_Menu
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

// 메뉴 상세 (본문/파일) - 자동 다운로드 기능 추가
router.get("/idx/:chidx", async (req, res) => {
  const { chidx } = req.params;
  const sql = `SELECT * FROM TBL_Menu WHERE chidx = ? LIMIT 1`;

  try {
    const [menus] = await pool.execute(sql, [chidx]);
    if (menus.length === 0) {
      return res.status(404).json({ error: "메뉴를 찾을 수 없습니다." });
    }

    const menuData = menus[0];
    const action = menuData.type; // action 정보 가져오기

    // detail json 파일 확인
    const jsonPath = path.join(
      process.cwd(),
      "download_menu",
      String(chidx),
      `${chidx}_detail.json`
    );

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
        content = await parseAndSaveMenu(chidx, action);
        console.log(`✅ [${chidx}] 세부 내용 다운로드 완료`);

        // ✅ JSON 저장 이후 다시 DB에서 최신 상태 조회
        const [updated] = await pool.execute(sql, [chidx]);
        if (updated.length > 0) menus[0] = updated[0];
      } catch (downloadError) {
        console.error(`❌ [${chidx}] 다운로드 실패:`, downloadError.message);
        content = null;
      }
    }

    // 첨부파일 조회
    const [files] = await pool.execute(
      `SELECT file_type, file_name, origin_name, file_path, file_url 
       FROM tbl_menufile WHERE menu_num = ?`,
      [chidx]
    );

    res.json({
      ...menus[0],
      content: content ? content.content : null,
      assets: content ? content.assets : [],
      attachments: content ? content.attachments : files, // JSON이 있으면 JSON 데이터, 없으면 DB 데이터
      isDownloaded: content !== null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// action별 목록 (천안, 아산, 당진 등)
router.get("/action/:action", async (req, res) => {
  const { action } = req.params;
  const { page = 1, pageSize = 20 } = req.query;
  const offset = (page - 1) * pageSize;
  const sql = `
    SELECT idx, type, chidx, title, author, create_dt
    FROM TBL_Menu
    WHERE type = ?
    ORDER BY chidx DESC
    LIMIT ? OFFSET ?
  `;
  try {
    const [rows] = await pool.execute(sql, [
      action,
      String(pageSize),
      String(offset),
    ]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// action 목록 (천안, 아산, 당진 등의 목록)
router.get("/actions", async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT DISTINCT type as action, 
             CASE 
               WHEN type = 'MAPP_2312012408' THEN '천안'
               WHEN type = 'MAPP_2312012409' THEN '아산'
               WHEN type = 'MAPP_2312012410' THEN '당진'
               ELSE type
             END as name
      FROM TBL_Menu 
      ORDER BY type
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/search", async (req, res) => {
  const { title, author, action } = req.query;
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
  // action 검색 (천안, 아산, 당진 등)
  if (action && action.trim()) {
    where.push("type = ?");
    params.push(action);
  }

  let whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const sql = `
      SELECT idx, type, chidx, title, author, create_dt
      FROM TBL_Menu
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
