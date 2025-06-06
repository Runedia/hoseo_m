require("module-alias/register");

const pool = require("@root/utils/db");
const { createLogger } = require("@root/utils/logger");
const { PaginationService } = require("@root/services/paginationService");
const { SearchService } = require("@root/services/searchService");

const logger = createLogger("DATABASE");

/**
 * 데이터베이스 공통 서비스
 */
class DatabaseService {
  /**
   * 페이징된 리스트 조회 (공지사항, 메뉴 공통)
   * @param {Object} config - 설정 객체
   * @returns {Promise<Object>} 페이징된 결과
   */
  static async getPaginatedList(config) {
    const {
      table, // 테이블명
      query, // req.query
      searchBuilder, // 검색 조건 빌더
      selectFields = "*", // 선택 필드
      orderBy = "chidx DESC", // 정렬 조건
      options = {}, // 페이징 옵션
    } = config;

    try {
      // 페이징 정보 생성
      const pagination = PaginationService.normalizePagination(query, options);
      const { limitValue, offsetValue } = PaginationService.getSQLParams(pagination);

      // 검색 조건 생성
      const searchResult = searchBuilder;
      const { whereClause, parameters } = searchResult;

      // 전체 개수 조회 쿼리
      const countSql = `SELECT COUNT(*) as totalCount FROM ${table} ${whereClause}`;

      // 데이터 조회 쿼리
      const dataSql = `
        SELECT ${selectFields}
        FROM ${table}
        ${whereClause}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `;

      // 병렬 실행
      const [countResult, dataResult] = await Promise.all([
        pool.execute(countSql, parameters),
        pool.execute(dataSql, [...parameters, limitValue, offsetValue]),
      ]);

      const totalCount = countResult[0][0].totalCount;
      const data = dataResult[0];

      // 로깅
      logger.db(`SELECT ${table}`, `${data.length}/${totalCount}건`);

      // 페이징 응답 생성 (기존 구조 유지)
      return PaginationService.createResponse(data, totalCount, pagination);
    } catch (error) {
      logger.error(`${table} 페이징 조회 실패`, error);
      throw error;
    }
  }

  /**
   * 단일 항목 조회 (chidx 기반)
   * @param {Object} config - 설정 객체
   * @returns {Promise<Object|null>} 조회 결과
   */
  static async getItemByChidx(config) {
    const {
      table, // 테이블명
      chidx, // 조회할 chidx
      selectFields = "*", // 선택 필드
      additionalWhere = "", // 추가 WHERE 조건
      additionalParams = [], // 추가 파라미터
    } = config;

    try {
      let sql = `SELECT ${selectFields} FROM ${table} WHERE chidx = ?`;
      let params = [chidx];

      // 추가 조건이 있으면 AND로 연결
      if (additionalWhere) {
        sql += ` AND ${additionalWhere}`;
        params.push(...additionalParams);
      }

      sql += " LIMIT 1";

      const [rows] = await pool.execute(sql, params);

      logger.db(`SELECT ${table}`, `chidx=${chidx}, found=${rows.length > 0 ? "Y" : "N"}`);

      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      logger.error(`${table} 단일 조회 실패 (chidx=${chidx})`, error);
      throw error;
    }
  }

  /**
   * 첨부파일 조회
   * @param {Object} config - 설정 객체
   * @returns {Promise<Array>} 첨부파일 목록
   */
  static async getAttachments(config) {
    const {
      table, // 파일 테이블명
      foreignKey, // 외래키 컬럼명 (notice_num, menu_num 등)
      foreignValue, // 외래키 값
      selectFields = "file_type, file_name, origin_name, file_path, file_url",
    } = config;

    try {
      const sql = `SELECT ${selectFields} FROM ${table} WHERE ${foreignKey} = ?`;
      const [rows] = await pool.execute(sql, [foreignValue]);

      logger.db(`SELECT ${table}`, `${foreignKey}=${foreignValue}, files=${rows.length}건`);

      return rows;
    } catch (error) {
      logger.error(`${table} 첨부파일 조회 실패`, error);
      throw error;
    }
  }

  /**
   * 타입 목록 조회 (카테고리 등)
   * @param {string} table - 테이블명
   * @param {string} selectFields - 선택 필드
   * @returns {Promise<Array>} 타입 목록
   */
  static async getTypes(table, selectFields = "*") {
    try {
      const sql = `SELECT ${selectFields} FROM ${table}`;
      const [rows] = await pool.execute(sql);

      logger.db(`SELECT ${table}`, `types=${rows.length}건`);

      return rows;
    } catch (error) {
      logger.error(`${table} 타입 조회 실패`, error);
      throw error;
    }
  }

  /**
   * 검색 실행 (일반 검색, 페이징 없음)
   * @param {Object} config - 설정 객체
   * @returns {Promise<Array>} 검색 결과
   */
  static async search(config) {
    const {
      table, // 테이블명
      query, // req.query
      searchBuilder, // 검색 조건 빌더
      selectFields = "*", // 선택 필드
      orderBy = "chidx DESC", // 정렬 조건
      limit = null, // 제한 개수 (선택사항)
    } = config;

    try {
      // 검색 조건 생성
      const searchResult = searchBuilder;
      const { whereClause, parameters } = searchResult;

      // 쿼리 생성
      let sql = `
        SELECT ${selectFields}
        FROM ${table}
        ${whereClause}
        ORDER BY ${orderBy}
      `;

      // 제한 개수가 있으면 추가
      if (limit) {
        sql += ` LIMIT ${limit}`;
      }

      const [rows] = await pool.execute(sql, parameters);

      logger.db(`SEARCH ${table}`, `results=${rows.length}건`);

      return rows;
    } catch (error) {
      logger.error(`${table} 검색 실패`, error);
      throw error;
    }
  }

  /**
   * 페이징된 검색 실행
   * @param {Object} config - 설정 객체
   * @returns {Promise<Object>} 페이징된 검색 결과
   */
  static async searchWithPaging(config) {
    const {
      table, // 테이블명
      query, // req.query (페이징 + 검색 조건 포함)
      searchBuilder, // 검색 조건 빌더
      selectFields = "*", // 선택 필드
      orderBy = "chidx DESC", // 정렬 조건
      options = {}, // 페이징 옵션
    } = config;

    try {
      // 페이징 정보 생성
      const pagination = PaginationService.normalizePagination(query, options);
      const { limitValue, offsetValue } = PaginationService.getSQLParams(pagination);

      // 검색 조건 생성
      const searchResult = searchBuilder;
      const { whereClause, parameters } = searchResult;

      // 전체 개수 조회 쿼리
      const countSql = `SELECT COUNT(*) as totalCount FROM ${table} ${whereClause}`;

      // 데이터 조회 쿼리
      const dataSql = `
        SELECT ${selectFields}
        FROM ${table}
        ${whereClause}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `;

      // 병렬 실행
      const [countResult, dataResult] = await Promise.all([
        pool.execute(countSql, parameters),
        pool.execute(dataSql, [...parameters, limitValue, offsetValue]),
      ]);

      const totalCount = countResult[0][0].totalCount;
      const data = dataResult[0];

      // 로깅
      logger.db(`SEARCH ${table}`, `${data.length}/${totalCount}건`);

      // 페이징 응답 생성 (기존 구조 유지)
      return PaginationService.createResponse(data, totalCount, pagination);
    } catch (error) {
      logger.error(`${table} 페이징 검색 실패`, error);
      throw error;
    }
  }

  /**
   * 트랜잭션 실행
   * @param {Function} callback - 트랜잭션 내에서 실행할 함수
   * @returns {Promise<*>} 콜백 함수의 반환값
   */
  static async transaction(callback) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      logger.db("TRANSACTION", "BEGIN");

      const result = await callback(connection);

      await connection.commit();
      logger.db("TRANSACTION", "COMMIT");

      return result;
    } catch (error) {
      await connection.rollback();
      logger.db("TRANSACTION", "ROLLBACK");
      logger.error("트랜잭션 실행 실패", error);
      throw error;
    } finally {
      connection.release();
    }
  }
}

/**
 * 빠른 사용을 위한 헬퍼 함수들
 */

/**
 * 공지사항 전용 헬퍼
 */
const NoticeHelper = {
  /**
   * 공지사항 목록 조회
   */
  async getList(query, options = {}) {
    const searchBuilder = SearchService.buildListConditions(query);

    return DatabaseService.getPaginatedList({
      table: "tbl_notice",
      query,
      searchBuilder,
      selectFields: "idx, type, chidx, title, author, create_dt",
      options,
    });
  },

  /**
   * 공지사항 상세 조회
   */
  async getDetail(chidx) {
    return DatabaseService.getItemByChidx({
      table: "tbl_notice",
      chidx,
    });
  },

  /**
   * 공지사항 첨부파일 조회
   */
  async getFiles(chidx) {
    return DatabaseService.getAttachments({
      table: "tbl_noticefile",
      foreignKey: "notice_num",
      foreignValue: chidx,
    });
  },

  /**
   * 공지사항 타입 목록
   */
  async getTypes() {
    return DatabaseService.getTypes("tbl_noticetype");
  },

  /**
   * 공지사항 검색
   */
  async search(query) {
    const searchBuilder = SearchService.buildNoticeSearch(query);

    return DatabaseService.searchWithPaging({
      table: "tbl_notice",
      query,
      searchBuilder,
      selectFields: "idx, type, chidx, title, author, create_dt",
    });
  },
};

/**
 * 메뉴 전용 헬퍼
 */
const MenuHelper = {
  /**
   * 메뉴 목록 조회
   */
  async getList(query, options = {}) {
    const { createSearchBuilder } = require("./searchService");
    const searchBuilder = createSearchBuilder();

    // action을 type으로 매핑
    if (query.action) {
      searchBuilder.equals("type", query.action);
    }

    return DatabaseService.getPaginatedList({
      table: "TBL_Menu",
      query,
      searchBuilder: searchBuilder.build(),
      selectFields: "idx, type, chidx, title, author, create_dt",
      options,
    });
  },

  /**
   * 메뉴 상세 조회 (action 포함)
   */
  async getDetail(chidx, action) {
    return DatabaseService.getItemByChidx({
      table: "TBL_Menu",
      chidx,
      additionalWhere: "type = ?",
      additionalParams: [action],
    });
  },

  /**
   * 메뉴 첨부파일 조회
   */
  async getFiles(chidx) {
    return DatabaseService.getAttachments({
      table: "tbl_menufile",
      foreignKey: "menu_num",
      foreignValue: chidx,
    });
  },

  /**
   * 메뉴 검색
   */
  async search(query) {
    const { createSearchBuilder } = require("./searchService");
    const searchBuilder = createSearchBuilder();

    // 검색 조건 추가
    searchBuilder.like("title", query.title).like("author", query.author).equals("type", query.action);

    return DatabaseService.search({
      table: "TBL_Menu",
      query,
      searchBuilder: searchBuilder.build(),
      selectFields: `idx, type, chidx, title, author, create_dt,
             CASE
               WHEN type = 'MAPP_2312012408' THEN '천안'
               WHEN type = 'MAPP_2312012409' THEN '아산'
               WHEN type = 'HAPPY_DORM_NUTRITION' THEN '행복기숙사'
               ELSE type
             END as type_name`,
      limit: parseInt(query.pageSize || 20),
    });
  },
};

module.exports = {
  DatabaseService,
  NoticeHelper,
  MenuHelper,
};
