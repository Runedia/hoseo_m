/**
 * 통일된 로깅 시스템 - Winston 기반
 * utils/logger.js로 통합
 */
const winston = require("winston");
require("winston-daily-rotate-file");
const path = require("path");

// 로그 디렉토리 생성
const logDir = path.join(process.cwd(), "logs");
require("fs").mkdirSync(logDir, { recursive: true });

/**
 * 로거 클래스
 */
class Logger {
  constructor(module = "SYSTEM") {
    this.module = module;
    this.winston = this._createWinstonLogger();
  }

  /**
   * Winston 로거 생성
   */
  _createWinstonLogger() {
    // 로그 포맷 정의
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ timestamp, level, message, stack, module }) => {
        const moduleStr = module ? `[${module}]` : "";
        return `${timestamp} [${level.toUpperCase()}] ${moduleStr} ${message}${stack ? "\n" + stack : ""}`;
      })
    );

    // 컬러 콘솔 포맷
    const consoleFormat = winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.timestamp({ format: "HH:mm:ss" }),
      winston.format.printf(({ timestamp, level, message, module }) => {
        const moduleStr = module ? `[${module}]` : "";
        return `${timestamp} ${level} ${moduleStr} ${message}`;
      })
    );

    return winston.createLogger({
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
      defaultMeta: { module: this.module },
      format: logFormat,
      transports: [
        // 콘솔 출력 (컬러, 개발환경에서만)
        ...(process.env.NODE_ENV !== "production"
          ? [
              new winston.transports.Console({
                format: consoleFormat,
              }),
            ]
          : []),

        // 모든 로그 파일 (info 이상)
        new winston.transports.File({
          filename: path.join(logDir, `${this.module.toLowerCase()}.log`),
          level: "info",
          maxsize: 5 * 1024 * 1024, // 5MB
          maxFiles: 3,
        }),

        // 에러만 별도 파일
        new winston.transports.File({
          filename: path.join(logDir, "error.log"),
          level: "error",
          maxsize: 5 * 1024 * 1024, // 5MB
          maxFiles: 3,
        }),

        // 일별 로그 파일
        new winston.transports.DailyRotateFile({
          filename: path.join(logDir, `%DATE%-${this.module.toLowerCase()}.log`),
          datePattern: "YYYY-MM-DD",
          zippedArchive: true,
          maxSize: "10m",
          maxFiles: "7d", // 7일간 보관
        }),

        // 통합 일별 로그 (모든 모듈)
        new winston.transports.DailyRotateFile({
          filename: path.join(logDir, "%DATE%-all.log"),
          datePattern: "YYYY-MM-DD",
          zippedArchive: true,
          maxSize: "20m",
          maxFiles: "14d", // 14일간 보관
        }),
      ],
    });
  }

  /**
   * 정보 로그
   */
  info(message, data = null) {
    if (data) {
      this.winston.info(`ℹ️ ${message}`, { data });
    } else {
      this.winston.info(`ℹ️ ${message}`);
    }
  }

  /**
   * 성공 로그
   */
  success(message, data = null) {
    if (data) {
      this.winston.info(`✅ ${message}`, { data });
    } else {
      this.winston.info(`✅ ${message}`);
    }
  }

  /**
   * 경고 로그
   */
  warn(message, data = null) {
    if (data) {
      this.winston.warn(`⚠️ ${message}`, { data });
    } else {
      this.winston.warn(`⚠️ ${message}`);
    }
  }

  /**
   * 에러 로그
   */
  error(message, error = null) {
    if (error) {
      this.winston.error(`❌ ${message}`, { error: error.message, stack: error.stack });
    } else {
      this.winston.error(`❌ ${message}`);
    }
  }

  /**
   * 로딩/처리 시작 로그
   */
  loading(message, data = null) {
    if (data) {
      this.winston.info(`🔄 ${message}`, { data });
    } else {
      this.winston.info(`🔄 ${message}`);
    }
  }

  /**
   * 디버그 로그
   */
  debug(message, data = null) {
    if (data) {
      this.winston.debug(`🔍 ${message}`, { data });
    } else {
      this.winston.debug(`🔍 ${message}`);
    }
  }

  /**
   * 파일 관련 로그
   */
  file(action, filename, status = "info") {
    const emojis = {
      load: "📁",
      save: "💾",
      create: "📝",
      delete: "🗑️",
      not_found: "🔍",
      read_error: "❌",
    };

    const emoji = emojis[action] || "📄";
    const message = `${emoji} ${action.toUpperCase()}: ${filename}`;

    if (status === "error") {
      this.winston.error(message);
    } else if (status === "warn") {
      this.winston.warn(message);
    } else {
      this.winston.info(message);
    }
  }

  /**
   * 캐시 관련 로그
   */
  cache(action, key, status = "info") {
    const emojis = {
      hit: "🎯",
      miss: "🔍",
      set: "💾",
      clear: "🧹",
    };

    const emoji = emojis[action] || "💭";
    const message = `${emoji} CACHE ${action.toUpperCase()}: ${key}`;

    this.winston.info(message);
  }

  /**
   * API 요청 로그
   */
  api(method, path, status = 200, processingTime = null) {
    const timeInfo = processingTime ? ` (${processingTime})` : "";
    const message = `🌐 ${method.toUpperCase()} ${path} - ${status}${timeInfo}`;

    if (status >= 400) {
      this.winston.error(message);
    } else if (status >= 300) {
      this.winston.warn(message);
    } else {
      this.winston.info(message);
    }
  }

  /**
   * 데이터베이스 쿼리 로그
   */
  db(operation, table = "", recordCount = null) {
    const tableInfo = table ? ` TBL_${table.toUpperCase()}` : "";
    const countInfo = recordCount !== null ? `, ${recordCount}건` : "";
    const message = `🗃️ DB ${operation.toUpperCase()}${tableInfo}${countInfo}`;

    this.winston.info(message);
  }

  /**
   * 크롤링 관련 로그
   */
  crawl(action, target, status = "info") {
    const emojis = {
      start: "🕷️",
      success: "✅",
      failed: "❌",
      retry: "🔄",
    };

    const emoji = emojis[action] || "🕷️";
    const message = `${emoji} CRAWL ${action.toUpperCase()}: ${target}`;

    if (status === "failed") {
      this.winston.error(message);
    } else if (status === "retry") {
      this.winston.warn(message);
    } else {
      this.winston.info(message);
    }
  }

  /**
   * 성능 측정 시작
   */
  startTimer(label) {
    this.winston.profile(label);
    return label;
  }

  /**
   * 성능 측정 종료
   */
  endTimer(label) {
    this.winston.profile(label);
  }
}

// 외부 접속 전용 로거 생성
const accessLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, message }) => {
      return `${timestamp} ${message}`;
    })
  ),
  transports: [
    // 외부 접속 로그 파일
    new winston.transports.File({
      filename: path.join(logDir, "access.log"),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),

    // 일별 외부 접속 로그 파일
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, "%DATE%-access.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
    }),
  ],
});

/**
 * 모듈별 로거 인스턴스 생성
 */
const createLogger = (moduleName) => new Logger(moduleName);

// 기본 로거 인스턴스들
const logger = new Logger("SYSTEM"); // 기존 호환성을 위해 유지
const systemLogger = new Logger("SYSTEM");
const apiLogger = new Logger("API");
const dbLogger = new Logger("DB");
const fileLogger = new Logger("FILE");

/**
 * 간단한 ID 생성 (숫자 기반)
 */
let requestCounter = 0;
const generateRequestId = () => {
  requestCounter += 1;
  return `REQ${String(requestCounter).padStart(6, "0")}`;
};

/**
 * 로거 팩토리 메서드 (호환성을 위해 추가)
 */
const getLogger = (moduleName) => createLogger(moduleName);

module.exports = {
  Logger,
  createLogger,
  getLogger, // 호환성을 위한 별칭
  generateRequestId,
  logger, // 기존 호환성을 위해 유지
  accessLogger,
  systemLogger,
  apiLogger,
  dbLogger,
  fileLogger,
};
