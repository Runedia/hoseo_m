require("module-alias/register");
const { createLogger } = require("@root/utils/logger");

const logger = createLogger("PAGINATION");

/**
 * 페이징 처리 서비스
 */
class PaginationService {
  /**
   * 페이징 파라미터 정규화
   * @param {Object} query - 쿼리 객체
   * @param {Object} options - 옵션
   * @returns {Object} 정규화된 페이징 정보
   */
  static normalizePagination(query, options = {}) {
    const { defaultPageSize = 20, maxPageSize = 100 } = options;

    const page = Math.max(1, parseInt(query.page || 1, 10));
    let pageSize = parseInt(query.pageSize || defaultPageSize, 10);

    // 최대 페이지 크기 제한
    if (pageSize > maxPageSize) {
      pageSize = maxPageSize;
    }

    const offset = (page - 1) * pageSize;

    return {
      page,
      pageSize,
      offset,
      limit: pageSize,
    };
  }

  /**
   * 페이징 메타데이터 생성
   * @param {number} totalCount - 전체 개수
   * @param {Object} pagination - 페이징 정보
   * @returns {Object} 페이징 메타데이터
   */
  static createMetadata(totalCount, pagination) {
    const { page, pageSize } = pagination;
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      totalCount,
      currentPage: page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
    };
  }

  /**
   * SQL 쿼리용 LIMIT, OFFSET 문자열 생성
   * @param {Object} pagination - 페이징 정보
   * @returns {Object} SQL 쿼리 정보
   */
  static getSQLParams(pagination) {
    return {
      limitClause: `LIMIT ${pagination.limit} OFFSET ${pagination.offset}`,
      limitValue: String(pagination.limit),
      offsetValue: String(pagination.offset),
    };
  }

  /**
   * 페이징된 응답 생성 (기존 구조 유지)
   * @param {Array} data - 데이터 배열
   * @param {number} totalCount - 전체 개수
   * @param {Object} pagination - 페이징 정보
   * @returns {Object} 페이징된 응답
   */
  static createResponse(data, totalCount, pagination) {
    const metadata = this.createMetadata(totalCount, pagination);

    // 기존 응답 구조 유지
    return {
      data,
      totalCount: metadata.totalCount,
      currentPage: metadata.currentPage,
      pageSize: metadata.pageSize,
      totalPages: metadata.totalPages,
    };
  }
}

/**
 * 빠른 사용을 위한 헬퍼 함수들
 */

/**
 * 기본 페이징 처리
 * @param {Object} query - Express req.query
 * @param {Object} options - 옵션
 * @returns {Object} 페이징 정보
 */
const getPagination = (query, options = {}) => {
  return PaginationService.normalizePagination(query, options);
};

/**
 * 페이징 응답 생성
 * @param {Array} data - 데이터
 * @param {number} totalCount - 전체 개수
 * @param {Object} query - 쿼리 객체
 * @param {Object} options - 옵션
 * @returns {Object} 응답 객체
 */
const createPaginatedResponse = (data, totalCount, query, options = {}) => {
  const pagination = getPagination(query, options);
  return PaginationService.createResponse(data, totalCount, pagination);
};

module.exports = {
  PaginationService,
  getPagination,
  createPaginatedResponse,
};
