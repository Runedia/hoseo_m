require("module-alias/register");

const { createLogger } = require("@root/utils/logger");
const { ResponseHelper } = require("@root/utils/routes/responseHelper");

const logger = createLogger("ERROR");

/**
 * 에러 처리 미들웨어 및 헬퍼 함수들
 */

/**
 * 비동기 함수 래퍼 - try-catch 자동 처리
 * @param {Function} fn - 비동기 함수
 * @returns {Function} 래핑된 함수
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 에러 응답 생성기
 */
class ErrorBuilder {
  constructor() {
    this.statusCode = 500;
    this.message = "서버 오류가 발생했습니다.";
    this.details = null;
    this.suggestion = null;
  }

  status(code) {
    this.statusCode = code;
    return this;
  }

  msg(message) {
    this.message = message;
    return this;
  }

  detail(details) {
    this.details = details;
    return this;
  }

  suggest(suggestion) {
    this.suggestion = suggestion;
    return this;
  }

  build() {
    const response = {
      error: this.message,
      success: false,
    };

    if (this.details) {
      response.details = this.details;
    }

    if (this.suggestion) {
      response.suggestion = this.suggestion;
    }

    return {
      statusCode: this.statusCode,
      response,
    };
  }
}

/**
 * 공통 에러 타입들
 */
const ErrorTypes = {
  // 400번대 클라이언트 에러
  BAD_REQUEST: (message = "잘못된 요청입니다.") => new ErrorBuilder().status(400).msg(message),

  NOT_FOUND: (resource = "리소스") => new ErrorBuilder().status(404).msg(`${resource}를 찾을 수 없습니다.`),

  VALIDATION_ERROR: (field, value) =>
    new ErrorBuilder().status(400).msg(`입력값 검증 오류가 발생했습니다.`).detail({ field, value }),

  MISSING_PARAMETER: (paramName, example = null) =>
    new ErrorBuilder()
      .status(400)
      .msg(`${paramName} 파라미터는 필수입니다.`)
      .detail({ required: true, parameter: paramName })
      .suggest(example ? `예시: ${example}` : "정확한 파라미터를 입력해주세요."),

  INVALID_FORMAT: (field, expectedFormat) =>
    new ErrorBuilder()
      .status(400)
      .msg(`${field} 형식이 올바르지 않습니다.`)
      .detail({ field, expectedFormat })
      .suggest(`${expectedFormat} 형식으로 입력해주세요.`),

  // 500번대 서버 에러
  INTERNAL_ERROR: (operation = "작업") =>
    new ErrorBuilder()
      .status(500)
      .msg(`${operation} 중 오류가 발생했습니다.`)
      .suggest("잠시 후 다시 시도하거나 관리자에게 문의하세요."),

  FILE_ERROR: (fileName, operation = "처리") =>
    new ErrorBuilder()
      .status(500)
      .msg(`${fileName} 파일 ${operation} 중 오류가 발생했습니다.`)
      .suggest("잠시 후 다시 시도해주세요."),

  DB_ERROR: (operation = "데이터베이스 작업") =>
    new ErrorBuilder()
      .status(500)
      .msg(`${operation} 중 데이터베이스 오류가 발생했습니다.`)
      .suggest("잠시 후 다시 시도하거나 관리자에게 문의하세요."),

  GENERATION_ERROR: (resourceType) =>
    new ErrorBuilder()
      .status(500)
      .msg(`${resourceType}을 자동 생성하는 중 오류가 발생했습니다.`)
      .suggest("잠시 후 다시 시도하거나 관리자에게 문의하세요."),
};

/**
 * 에러 처리 미들웨어
 */
const errorHandler = (err, req, res, next) => {
  // 이미 응답이 전송된 경우
  if (res.headersSent) {
    return next(err);
  }

  // 에러 로깅
  logger.error(`API 에러 발생: ${req.method} ${req.path}`, err);

  // ResponseHelper가 있으면 사용, 없으면 기본 응답
  const helper = res.helper || new ResponseHelper();

  // 기본 에러 응답
  let statusCode = 500;
  let message = "서버 오류가 발생했습니다.";
  let details = null;

  // 에러 타입별 처리
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "입력값 검증 오류가 발생했습니다.";
    details = err.details;
  } else if (err.code === "ENOENT") {
    statusCode = 404;
    message = "파일을 찾을 수 없습니다.";
  } else if (err.errno && err.sqlState) {
    // MySQL 에러
    statusCode = 500;
    message = "데이터베이스 오류가 발생했습니다.";
    details = {
      errno: err.errno,
      sqlState: err.sqlState,
      code: err.code,
    };
  } else if (err.message) {
    message = err.message;
  }

  // 개발 환경에서는 스택 트레이스 포함
  if (process.env.NODE_ENV === "development") {
    details = details || {};
    details.stack = err.stack;
  }

  const errorResponse = helper.error(message, statusCode, details);
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 핸들러
 */
const notFoundHandler = (req, res) => {
  const helper = res.helper || new ResponseHelper();
  const errorResponse = helper.error(`경로를 찾을 수 없습니다: ${req.method} ${req.path}`, 404);

  logger.api(req.method, req.path, 404);
  res.status(404).json(errorResponse);
};

/**
 * 빠른 에러 응답 헬퍼
 */
const sendError = (res, errorType, ...args) => {
  const error = errorType(...args).build();
  const helper = res.helper || new ResponseHelper();
  const errorResponse = helper.error(error.response.error, error.statusCode, error.response.details);

  if (error.response.suggestion) {
    errorResponse.suggestion = error.response.suggestion;
  }

  res.status(error.statusCode).json(errorResponse);
};

module.exports = {
  asyncHandler,
  ErrorBuilder,
  ErrorTypes,
  errorHandler,
  notFoundHandler,
  sendError,
};
