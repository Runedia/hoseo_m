// utils/logger.js
const winston = require("winston");
require("winston-daily-rotate-file");
const path = require("path");

// 로그 디렉토리 생성
const logDir = path.join(process.cwd(), "logs");
require("fs").mkdirSync(logDir, { recursive: true });

// 로그 포맷 정의
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level.toUpperCase()}] ${message}${stack ? "\n" + stack : ""}`;
  })
);

// 로거 생성
const logger = winston.createLogger({
  level: "info",
  format: logFormat,
  transports: [
    // 콘솔 출력 (컬러)
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), logFormat),
    }),

    // 모든 로그 파일 (info 이상)
    new winston.transports.File({
      filename: path.join(logDir, "crawler.log"),
      level: "info",
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5, // 최대 5개 파일 로테이션
    }),

    // 에러만 별도 파일
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),

    // 일별 로그 파일
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, "%DATE%-crawler.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d", // 14일간 보관
    }),
  ],
});

// 프로덕션 환경에서는 debug 로그 제외
if (process.env.NODE_ENV === "production") {
  logger.level = "info";
} else {
  logger.level = "debug";
}

module.exports = logger;
