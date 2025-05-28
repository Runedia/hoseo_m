require("module-alias/register");

const express = require("express");
const router = express.Router();
const pool = require("@root/utils/db");
const fs = require("fs");
const path = require("path");
const { parseAndSaveCampusMenu } = require("@root/process/4_menu/get_menu_detail"); // 일반 메뉴 크롤러
const { parseAndSaveHappyDormMenu } = require("@root/process/4_menu/get_menu_detail(happy_dorm)"); // 행복기숙사 크롤러

// 메뉴 목록 (페이징)
router.get("/list", async (req, res) => {
  const { page = 1, pageSize = 20, action } = req.query;

  // action 파라미터 필수 검증
  if (!action) {
    return res.status(400).json({
      error: "action 파라미터는 필수입니다.",
      details: {
        required: true,
        parameter: "action",
        example: "MAPP_2312012408 (천안), MAPP_2312012409 (아산), HAPPY_DORM_NUTRITION (행복기숙사)",
      },
    });
  }

  const offset = (page - 1) * pageSize;
  const sql = `
    SELECT idx, type, chidx, title, author, create_dt
    FROM TBL_Menu
    WHERE type = ?
    ORDER BY chidx DESC
    LIMIT ? OFFSET ?
  `;
  try {
    const [rows] = await pool.execute(sql, [action, String(pageSize), String(offset)]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({
      error: err.message,
      details: {
        sql: sql,
        parameters: [action, String(pageSize), String(offset)],
        errno: err.errno,
        sqlState: err.sqlState,
      },
    });
  }
});

// 메뉴 상세 (본문/파일) - 타입별 자동 다운로드 기능
router.get("/idx/:chidx/:action", async (req, res) => {
  const { chidx, action } = req.params;

  // chidx와 action을 모두 사용하여 정확한 메뉴 조회
  const sql = `SELECT * FROM TBL_Menu WHERE chidx = ? AND type = ? LIMIT 1`;

  try {
    const [menus] = await pool.execute(sql, [chidx, action]);
    if (menus.length === 0) {
      return res.status(404).json({
        error: "메뉴를 찾을 수 없습니다.",
        details: { chidx, action },
      });
    }

    const menuData = menus[0];
    const menuType = menuData.type; // type 정보 가져오기

    // 행복기숙사 여부 확인
    const isHappyDorm = menuType === "HAPPY_DORM_NUTRITION";

    // JSON 파일 경로 결정 (타입별로 다른 디렉토리)
    const baseDir = isHappyDorm ? "download_happy_dorm" : "download_menu";
    const jsonPath = path.join(process.cwd(), baseDir, String(chidx), `${chidx}_detail.json`);

    let content = null;
    let shouldDownload = false;

    try {
      content = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      console.log(`📁 [${chidx}] 기존 JSON 파일 로드 성공`);
    } catch (e) {
      // JSON 파일이 없으면 다운로드 필요
      shouldDownload = true;
      console.log(`🔍 [${chidx}] JSON 파일 없음, 다운로드 필요`);
    }

    // 다운로드가 필요한 경우 타입별로 실행
    if (shouldDownload) {
      try {
        console.log(`🔄 [${chidx}] 세부 내용 다운로드 시작... (타입: ${menuType})`);

        if (isHappyDorm) {
          // 행복기숙사 처리
          content = await parseAndSaveHappyDormMenu(chidx);
        } else {
          // 일반 호서대 메뉴 처리
          content = await parseAndSaveCampusMenu(chidx, menuType);
        }

        console.log(`✅ [${chidx}] 세부 내용 다운로드 완료`);

        // ✅ JSON 저장 이후 다시 DB에서 최신 상태 조회
        const [updated] = await pool.execute(sql, [chidx, action]);
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
      downloadPath: baseDir, // 다운로드 경로 정보 추가
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// action 목록 (천안, 아산, 행복기숙사 목록)
router.get("/actions", (req, res) => {
  const actions = [
    {
      action: "MAPP_2312012408",
      name: "천안",
    },
    {
      action: "MAPP_2312012409",
      name: "아산",
    },
    {
      action: "HAPPY_DORM_NUTRITION",
      name: "행복기숙사",
    },
  ];

  res.json(actions);
});

// 검색 기능 (행복기숙사 포함)
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
  // action 검색 (천안, 아산, 행복기숙사 등)
  if (action && action.trim()) {
    where.push("type = ?");
    params.push(action);
  }

  let whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const sql = `
      SELECT idx, type, chidx, title, author, create_dt,
             CASE 
               WHEN type = 'MAPP_2312012408' THEN '천안'
               WHEN type = 'MAPP_2312012409' THEN '아산'
               WHEN type = 'HAPPY_DORM_NUTRITION' THEN '행복기숙사'
               ELSE type
             END as type_name
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

