require("module-alias/register");
const { createLogger } = require("@root/utils/logger");

const logger = createLogger("SEARCH");

/**
 * 검색 조건 빌더
 */
class SearchBuilder {
  constructor() {
    this.conditions = [];
    this.parameters = [];
  }

  /**
   * LIKE 조건 추가
   * @param {string} column - 컬럼명
   * @param {string} value - 검색값
   * @param {string} pattern - 패턴 (%value%, value%, %value)
   * @returns {SearchBuilder} 체이닝을 위한 this
   */
  like(column, value, pattern = "both") {
    if (value && value.trim()) {
      let searchValue;
      switch (pattern) {
        case "start":
          searchValue = `${value}%`;
          break;
        case "end":
          searchValue = `%${value}`;
          break;
        case "both":
        default:
          searchValue = `%${value}%`;
          break;
      }

      this.conditions.push(`${column} LIKE ?`);
      this.parameters.push(searchValue);
    }
    return this;
  }

  /**
   * 정확한 값 조건 추가
   * @param {string} column - 컬럼명
   * @param {*} value - 값
   * @returns {SearchBuilder} 체이닝을 위한 this
   */
  equals(column, value) {
    if (value !== undefined && value !== null && value !== "") {
      this.conditions.push(`${column} = ?`);
      this.parameters.push(value);
    }
    return this;
  }

  /**
   * IN 조건 추가
   * @param {string} column - 컬럼명
   * @param {Array} values - 값 배열
   * @returns {SearchBuilder} 체이닝을 위한 this
   */
  in(column, values) {
    if (Array.isArray(values) && values.length > 0) {
      const placeholders = values.map(() => "?").join(", ");
      this.conditions.push(`${column} IN (${placeholders})`);
      this.parameters.push(...values);
    }
    return this;
  }

  /**
   * 날짜 범위 조건 추가
   * @param {string} column - 컬럼명
   * @param {string} startDate - 시작 날짜
   * @param {string} endDate - 종료 날짜
   * @returns {SearchBuilder} 체이닝을 위한 this
   */
  dateRange(column, startDate, endDate) {
    if (startDate) {
      this.conditions.push(`${column} >= ?`);
      this.parameters.push(startDate);
    }
    if (endDate) {
      this.conditions.push(`${column} <= ?`);
      this.parameters.push(endDate);
    }
    return this;
  }

  /**
   * 커스텀 조건 추가
   * @param {string} condition - SQL 조건문
   * @param {Array} params - 파라미터 배열
   * @returns {SearchBuilder} 체이닝을 위한 this
   */
  custom(condition, params = []) {
    if (condition) {
      this.conditions.push(condition);
      this.parameters.push(...params);
    }
    return this;
  }

  /**
   * WHERE 절 생성
   * @returns {Object} WHERE 절과 파라미터
   */
  build() {
    const whereClause = this.conditions.length > 0 ? `WHERE ${this.conditions.join(" AND ")}` : "";

    return {
      whereClause,
      parameters: this.parameters,
      hasConditions: this.conditions.length > 0,
    };
  }

  /**
   * 조건 초기화
   * @returns {SearchBuilder} 체이닝을 위한 this
   */
  reset() {
    this.conditions = [];
    this.parameters = [];
    return this;
  }
}

/**
 * 검색 서비스
 */
class SearchService {
  /**
   * 공지사항 검색 조건 생성
   * @param {Object} query - 검색 쿼리
   * @returns {Object} 검색 조건
   */
  static buildNoticeSearch(query) {
    const builder = new SearchBuilder();

    return builder
      .like("title", query.title)
      .like("author", query.author)
      .equals("type", query.type || "CTG_17082400011") // 기본값 유지
      .build();
  }

  /**
   * 메뉴 검색 조건 생성
   * @param {Object} query - 검색 쿼리
   * @returns {Object} 검색 조건
   */
  static buildMenuSearch(query) {
    const builder = new SearchBuilder();

    return builder
      .like("title", query.title)
      .like("author", query.author)
      .equals("type", query.action) // action을 type으로 매핑
      .build();
  }

  /**
   * 기본 리스트 조건 생성 (type 필터 포함)
   * @param {Object} query - 쿼리 객체
   * @param {string} typeField - 타입 필드명 (기본: 'type')
   * @returns {Object} 검색 조건
   */
  static buildListConditions(query, typeField = "type") {
    const builder = new SearchBuilder();

    if (query.type || query.action) {
      builder.equals(typeField, query.type || query.action);
    }

    return builder.build();
  }

  /**
   * 검색 로그 생성
   * @param {string} table - 테이블명
   * @param {Object} searchResult - 검색 결과
   * @param {Object} query - 쿼리 객체
   */
  static logSearch(table, searchResult, query) {
    const conditions = Object.keys(query)
      .filter((key) => query[key] && query[key].trim && query[key].trim())
      .map((key) => `${key}=${query[key]}`)
      .join(", ");

    logger.db(`SEARCH ${table}`, conditions || "no conditions");
  }
}

/**
 * 빠른 검색 헬퍼 함수들
 */

/**
 * 검색 빌더 생성
 * @returns {SearchBuilder} 새로운 검색 빌더 인스턴스
 */
const createSearchBuilder = () => new SearchBuilder();

/**
 * 기본 검색 조건 생성 (title, author, type)
 * @param {Object} query - 쿼리 객체
 * @param {Object} options - 옵션
 * @returns {Object} 검색 조건
 */
const buildBasicSearch = (query, options = {}) => {
  const { typeField = "type", defaultType = null } = options;
  const builder = new SearchBuilder();

  builder.like("title", query.title).like("author", query.author);

  // 타입 조건 처리
  const typeValue = query.type || query.action || defaultType;
  if (typeValue) {
    builder.equals(typeField, typeValue);
  }

  return builder.build();
};

module.exports = {
  SearchBuilder,
  SearchService,
  createSearchBuilder,
  buildBasicSearch,
};
