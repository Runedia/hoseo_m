/**
 * 공통 검증 로직
 */

/**
 * 기본 검증 함수들
 */
const Validators = {
  /**
   * 필수 파라미터 검증
   * @param {*} value - 검증할 값
   * @param {string} fieldName - 필드명
   * @returns {Object} 검증 결과
   */
  required(value, fieldName) {
    const isValid = value !== undefined && value !== null && value !== "";
    return {
      isValid,
      field: fieldName,
      message: isValid ? null : `${fieldName}은(는) 필수입니다.`,
    };
  },

  /**
   * 날짜 형식 검증 (YYYY-MM-DD)
   * @param {string} dateString - 날짜 문자열
   * @param {string} fieldName - 필드명
   * @returns {Object} 검증 결과
   */
  dateFormat(dateString, fieldName = "date") {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const isValid = dateRegex.test(dateString);
    return {
      isValid,
      field: fieldName,
      message: isValid ? null : `${fieldName}는 YYYY-MM-DD 형식이어야 합니다.`,
      expectedFormat: "YYYY-MM-DD",
    };
  },

  /**
   * 숫자 형식 검증
   * @param {*} value - 검증할 값
   * @param {string} fieldName - 필드명
   * @returns {Object} 검증 결과
   */
  number(value, fieldName) {
    const isValid = !isNaN(value) && isFinite(value);
    return {
      isValid,
      field: fieldName,
      message: isValid ? null : `${fieldName}은(는) 유효한 숫자여야 합니다.`,
    };
  },

  /**
   * 정수 형식 검증
   * @param {*} value - 검증할 값
   * @param {string} fieldName - 필드명
   * @returns {Object} 검증 결과
   */
  integer(value, fieldName) {
    const numValue = Number(value);
    const isValid = Number.isInteger(numValue) && numValue >= 0;
    return {
      isValid,
      field: fieldName,
      message: isValid ? null : `${fieldName}은(는) 0 이상의 정수여야 합니다.`,
    };
  },

  /**
   * 값 범위 검증
   * @param {*} value - 검증할 값
   * @param {Array} allowedValues - 허용된 값들
   * @param {string} fieldName - 필드명
   * @returns {Object} 검증 결과
   */
  enum(value, allowedValues, fieldName) {
    const isValid = allowedValues.includes(value);
    return {
      isValid,
      field: fieldName,
      message: isValid ? null : `${fieldName}은(는) 다음 값 중 하나여야 합니다: ${allowedValues.join(", ")}`,
      allowedValues,
    };
  },

  /**
   * 페이지 번호 검증
   * @param {*} page - 페이지 번호
   * @returns {Object} 검증 결과
   */
  page(page) {
    const pageNum = Number(page);
    const isValid = Number.isInteger(pageNum) && pageNum >= 1;
    return {
      isValid,
      field: "page",
      message: isValid ? null : "page는 1 이상의 정수여야 합니다.",
      value: isValid ? pageNum : 1,
    };
  },

  /**
   * 페이지 크기 검증
   * @param {*} pageSize - 페이지 크기
   * @param {number} maxSize - 최대 크기
   * @returns {Object} 검증 결과
   */
  pageSize(pageSize, maxSize = 100) {
    const sizeNum = Number(pageSize);
    const isValid = Number.isInteger(sizeNum) && sizeNum >= 1 && sizeNum <= maxSize;
    return {
      isValid,
      field: "pageSize",
      message: isValid ? null : `pageSize는 1 이상 ${maxSize} 이하의 정수여야 합니다.`,
      value: isValid ? sizeNum : 20,
    };
  },
};

/**
 * 검증 결과 처리기
 */
class ValidationResult {
  constructor() {
    this.errors = [];
    this.isValid = true;
  }

  /**
   * 검증 결과 추가
   * @param {Object} result - 검증 결과
   */
  add(result) {
    if (!result.isValid) {
      this.isValid = false;
      this.errors.push({
        field: result.field,
        message: result.message,
        expectedFormat: result.expectedFormat,
        allowedValues: result.allowedValues,
      });
    }
    return this;
  }

  /**
   * 첫 번째 에러 반환
   * @returns {Object|null} 첫 번째 에러
   */
  getFirstError() {
    return this.errors.length > 0 ? this.errors[0] : null;
  }

  /**
   * 모든 에러 반환
   * @returns {Array} 에러 배열
   */
  getAllErrors() {
    return this.errors;
  }
}

/**
 * 라우트별 검증기들
 */
const RouteValidators = {
  /**
   * 공지사항 관련 검증
   */
  notice: {
    list: (query) => {
      const result = new ValidationResult();

      if (query.page) {
        result.add(Validators.page(query.page));
      }
      if (query.pageSize) {
        result.add(Validators.pageSize(query.pageSize));
      }

      return result;
    },

    detail: (params) => {
      const result = new ValidationResult();
      result.add(Validators.required(params.chidx, "chidx"));
      if (params.chidx) {
        result.add(Validators.integer(params.chidx, "chidx"));
      }
      return result;
    },
  },

  /**
   * 메뉴 관련 검증
   */
  menu: {
    list: (query) => {
      const result = new ValidationResult();

      result.add(Validators.required(query.action, "action"));

      if (query.action) {
        const validActions = ["MAPP_2312012408", "MAPP_2312012409", "HAPPY_DORM_NUTRITION"];
        result.add(Validators.enum(query.action, validActions, "action"));
      }

      if (query.page) {
        result.add(Validators.page(query.page));
      }
      if (query.pageSize) {
        result.add(Validators.pageSize(query.pageSize));
      }

      return result;
    },

    detail: (params) => {
      const result = new ValidationResult();
      result.add(Validators.required(params.chidx, "chidx"));
      result.add(Validators.required(params.action, "action"));

      if (params.chidx) {
        result.add(Validators.integer(params.chidx, "chidx"));
      }

      return result;
    },
  },

  /**
   * 셔틀 관련 검증
   */
  shuttle: {
    schedule: (query) => {
      const result = new ValidationResult();

      result.add(Validators.required(query.date, "date"));
      result.add(Validators.required(query.route, "route"));

      if (query.date) {
        result.add(Validators.dateFormat(query.date, "date"));
      }

      if (query.route) {
        result.add(Validators.enum(query.route, ["1", "2"], "route"));
      }

      return result;
    },
  },

  /**
   * 캠퍼스 맵 관련 검증
   */
  campusMap: {
    info: (params) => {
      const result = new ValidationResult();
      result.add(Validators.required(params.campus, "campus"));

      if (params.campus) {
        const validCampuses = ["asan", "cheonan"];
        result.add(Validators.enum(params.campus.toLowerCase(), validCampuses, "campus"));
      }

      return result;
    },
  },

  /**
   * 학과 관련 검증
   */
  departments: {
    list: (query) => {
      const result = new ValidationResult();

      if (query.format) {
        const validFormats = ["detailed", "simple"];
        result.add(Validators.enum(query.format, validFormats, "format"));
      }

      return result;
    },

    info: (query) => {
      const result = new ValidationResult();
      result.add(Validators.required(query.dept, "dept"));
      return result;
    },
  },

  /**
   * 교육가이드 관련 검증
   */
  eduguide: {
    curriculum: (query) => {
      const result = new ValidationResult();
      // type은 선택사항이므로 존재할 때만 검증
      return result;
    },

    class: (query) => {
      const result = new ValidationResult();
      // type은 선택사항이므로 존재할 때만 검증
      return result;
    },

    record: (query) => {
      const result = new ValidationResult();
      // type은 선택사항이므로 존재할 때만 검증
      return result;
    },
  },
};

/**
 * 검증 미들웨어 생성기
 * @param {Function} validator - 검증 함수
 * @returns {Function} Express 미들웨어
 */
const createValidationMiddleware = (validator) => {
  return (req, res, next) => {
    const validationResult = validator(req.query, req.params, req.body);

    if (!validationResult.isValid) {
      const firstError = validationResult.getFirstError();
      return res.status(400).json({
        error: firstError.message,
        details: {
          field: firstError.field,
          expectedFormat: firstError.expectedFormat,
          allowedValues: firstError.allowedValues,
        },
        success: false,
      });
    }

    next();
  };
};

module.exports = {
  Validators,
  ValidationResult,
  RouteValidators,
  createValidationMiddleware,
};

