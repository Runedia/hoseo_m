/**
 * API 응답 헬퍼 - 기존 응답 구조 유지하면서 메타정보 추가
 */
class ResponseHelper {
  constructor() {
    this.startTime = Date.now();
  }

  /**
   * 간단한 UUID 대체 함수
   */
  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 성공 응답 생성 (기존 구조 유지)
   * @param {Object} data - 기존 응답 데이터
   * @param {Object} options - 추가 옵션
   * @returns {Object} 응답 객체
   */
  success(data, options = {}) {
    const response = { ...data }; // 기존 데이터 구조 그대로 유지

    // 메타정보는 별도로 추가 (기존 API와 호환)
    if (options.includeMeta !== false) {
      response.meta = {
        requestId: this._generateId(),
        timestamp: new Date().toISOString(),
        processingTime: `${Date.now() - this.startTime}ms`,
        success: true,
      };
    }

    return response;
  }

  /**
   * 에러 응답 생성 (기존 구조 유지)
   * @param {string} message - 에러 메시지
   * @param {number} statusCode - HTTP 상태 코드
   * @param {Object} details - 상세 정보
   * @returns {Object} 에러 응답 객체
   */
  error(message, statusCode = 500, details = null) {
    const response = {
      error: message, // 기존 에러 형식 유지
      success: false,
    };

    if (details) {
      response.details = details; // 기존 details 형식 유지
    }

    // 메타정보 추가
    response.meta = {
      requestId: this._generateId(),
      timestamp: new Date().toISOString(),
      processingTime: `${Date.now() - this.startTime}ms`,
      statusCode,
      success: false,
    };

    return response;
  }

  /**
   * 페이징 응답 생성 (기존 구조 유지)
   * @param {Array} data - 데이터 배열
   * @param {Object} pagination - 페이징 정보
   * @returns {Object} 페이징 응답 객체
   */
  paginated(data, pagination) {
    return this.success({
      data, // 기존 data 필드 유지
      totalCount: pagination.totalCount, // 기존 totalCount 유지
      currentPage: pagination.currentPage,
      pageSize: pagination.pageSize,
      totalPages: pagination.totalPages,
    });
  }

  /**
   * 리스트 응답 생성 (기존 구조 유지)
   * @param {Array} data - 데이터 배열
   * @param {Object} options - 추가 옵션
   * @returns {Object} 리스트 응답 객체
   */
  list(data, options = {}) {
    const response = { data }; // 기존 data 필드 유지

    // 기존 필드들 추가
    if (options.title) response.title = options.title;
    if (options.description) response.description = options.description;
    if (options.generatedAt) response.generatedAt = options.generatedAt;
    if (options.format) response.format = options.format;
    if (options.type) response.type = options.type;
    if (options.statistics) response.statistics = options.statistics;

    return this.success(response, options);
  }
}

/**
 * Express 미들웨어로 사용할 수 있는 헬퍼 함수
 */
const attachResponseHelper = (req, res, next) => {
  res.helper = new ResponseHelper();
  next();
};

/**
 * 간단한 ID 생성 (숫자 기반)
 */
let requestCounter = 0;
const createSimpleId = () => {
  requestCounter += 1;
  return `${Date.now().toString(36)}${String(requestCounter).padStart(4, "0")}`;
};

/**
 * 기본 응답 생성 함수 (호환성을 위해 추가)
 * @param {Object} data - 응답 데이터
 * @param {Object} error - 에러 객체 (있는 경우)
 * @param {Object} meta - 메타 정보
 * @returns {Object} 응답 객체
 */
const createResponse = (data, error = null, meta = {}) => {
  const response = error ? { ...error } : { ...data };

  // 메타정보 추가
  if (Object.keys(meta).length > 0) {
    response.meta = {
      timestamp: new Date().toISOString(),
      ...meta,
    };
  }

  return response;
};

module.exports = {
  ResponseHelper,
  attachResponseHelper,
  createResponse,
  createSimpleId,
};

