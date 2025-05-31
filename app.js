require("module-alias/register");

var express = require("express");
var logger = require("morgan");
const cors = require("cors");
const { accessLogger } = require("@root/utils/logger");
const helmet = require("helmet");

var noticeRouter = require("@root/routes/notice");
var shuttleRouter = require("@root/routes/shuttle");
var menuRouter = require("@root/routes/menu");
var campusMapRouter = require("@root/routes/campus_map");
var eduguideRouter = require("@root/routes/eduguide");
var logsRouter = require("@root/routes/logs");
var departmentsRouter = require("@root/routes/departments");

const path = require("path");
const fs = require("fs");

// 서버 시작 시 assets/static 폴더 삭제
const clearStaticFolder = () => {
  const staticPath = path.join(__dirname, "assets", "static");

  try {
    if (fs.existsSync(staticPath)) {
      fs.rmSync(staticPath, { recursive: true, force: true });
      console.log("[시작] assets/static 폴더를 삭제했습니다.");
    } else {
      console.log("[시작] assets/static 폴더가 존재하지 않습니다.");
    }
  } catch (error) {
    console.error("[에러] assets/static 폴더 삭제 실패:", error.message);
  }
};

// 폴더 삭제 실행
clearStaticFolder();

var app = express();
app.use(logger("dev"));

// 환경변수 안전 처리
const getAllowedHosts = () => {
  const hostsEnv = process.env.ALLOWED_HOSTS;

  if (!hostsEnv) {
    console.warn("[경고] ALLOWED_HOSTS 환경변수가 설정되지 않았습니다. 기본값을 사용합니다.");

    if (process.env.NODE_ENV === "production") {
      return ["rukeras.com"]; // 운영 환경 기본값
    } else {
      return ["localhost", "127.0.0.1", "rukeras.com"]; // 개발 환경 기본값
    }
  }

  const hosts = hostsEnv
    .split(",")
    .map((host) => host.trim())
    .filter((host) => host);

  if (hosts.length === 0) {
    console.error("[에러] ALLOWED_HOSTS가 비어있습니다!");
    process.exit(1);
  }

  return hosts;
};

const allowedHosts = getAllowedHosts();
console.log(`[설정] 허용된 호스트:`, allowedHosts);

// 보안 헤더 설정 (Helmet 사용)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // API 서버에서는 비활성화
    hsts: (() => {
      // HSTS 설정 로직
      const enableHSTS = process.env.ENABLE_HSTS === "true";
      const isProduction = process.env.NODE_ENV === "production";

      if (enableHSTS || (isProduction && process.env.ENABLE_HSTS !== "false")) {
        return {
          maxAge: 31536000, // 1년
          includeSubDomains: true,
        };
      }
      return false;
    })(),
  })
);

// HSTS 설정 로그
const hstsEnabled = (() => {
  const enableHSTS = process.env.ENABLE_HSTS === "true";
  const isProduction = process.env.NODE_ENV === "production";
  return enableHSTS || (isProduction && process.env.ENABLE_HSTS !== "false");
})();

console.log("[보안] Helmet으로 보안 헤더가 설정되었습니다.");
console.log(`[보안] HSTS (HTTPS 강제): ${hstsEnabled ? "활성화" : "비활성화"}`);

// 호스트 검증 미들웨어
const validateHost = (req, res, next) => {
  const host = req.get("Host");

  if (!host) {
    return res.status(400).json({ error: "Host header is required" });
  }

  // 포트 번호 제거 (예: localhost:3000 -> localhost)
  const hostname = host.split(":")[0];

  if (!allowedHosts.includes(hostname)) {
    // IP 추출 및 정리 (기존 로깅 미들웨어와 동일한 로직)
    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress || req.ip;

    const cleanIP = (ip) => {
      if (ip.startsWith("::ffff:")) {
        return ip.replace("::ffff:", "");
      }
      if (ip === "::1") {
        return "127.0.0.1";
      }
      return ip;
    };

    const clientIP = cleanIP(ip);

    console.log(`[호스트 차단] IP: ${clientIP} | Host: ${host} | ${req.method} ${req.originalUrl}`);
    return res.status(403).json({
      error: "Access denied",
      message: "Direct IP access or unauthorized domain access is not allowed",
    });
  }

  next();
};

// 호스트 검증 적용
app.use(validateHost);

// IP 로깅을 위한 미들웨어
app.use((req, res, next) => {
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress || req.ip;

  // IPv6 -> IPv4 변환 및 정리 함수
  const cleanIP = (ip) => {
    // IPv6 매핑된 IPv4 주소 변환 (::ffff:192.168.1.1 -> 192.168.1.1)
    if (ip.startsWith("::ffff:")) {
      return ip.replace("::ffff:", "");
    }
    // 기타 IPv6 로컬 주소 처리
    if (ip === "::1") {
      return "127.0.0.1";
    }
    return ip;
  };

  // 로컬/내부 IP 체크 함수
  const isLocalIP = (ip) => {
    const cleanedIP = cleanIP(ip);

    // 로컬 IP 패턴들
    const localPatterns = [
      /^127\./, // 127.x.x.x (localhost)
      /^192\.168\./, // 192.168.x.x (사설IP)
      /^10\./, // 10.x.x.x (사설IP)
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.x.x ~ 172.31.x.x (사설IP)
      /^localhost$/, // localhost 문자열
      /^0\.0\.0\.0$/, // 0.0.0.0
    ];

    return localPatterns.some((pattern) => pattern.test(cleanedIP));
  };

  // 외부 IP에서의 접속인지 확인
  const isExternalAccess = !isLocalIP(ip);

  if (isExternalAccess) {
    const displayIP = cleanIP(ip);

    // 응답 완료 후 로깅
    res.on("finish", () => {
      const logMessage = `[외부 접속] IP: ${displayIP} | ${req.method} ${req.originalUrl} | Status: ${res.statusCode}`;

      // 콘솔 출력
      console.log(logMessage);

      // 로그 파일에 기록
      accessLogger.info(logMessage);
    });
  }

  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({ origin: "http://rukeras.com" }));
app.use("/download_menu", express.static("download_menu"));
app.use("/download_notice", express.static("download_notice"));
app.use("/download_happy_dorm", express.static("download_happy_dorm"));
app.use("/assets/static", express.static("assets/static"));

app.use("/notice", noticeRouter);
app.use("/shuttle", shuttleRouter);
app.use("/menu", menuRouter);
app.use("/campus_map", campusMapRouter);
app.use("/eduguide", eduguideRouter);
app.use("/logs", logsRouter);
app.use("/departments", departmentsRouter);

// 404 핸들링
app.use(function (req, res, next) {
  res.status(404).json({ error: "Not found" });
});

// 에러 핸들링
app.use(function (err, req, res, next) {
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

module.exports = app;

