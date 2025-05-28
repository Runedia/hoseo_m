require("module-alias/register");

var express = require("express");
var logger = require("morgan");
const cors = require("cors");

var noticeRouter = require("@root/routes/notice");
var shuttleRouter = require("@root/routes/shuttle");
var menuRouter = require("@root/routes/menu");
var campusMapRouter = require("@root/routes/campus_map");
var edugradRouter = require("@root/routes/edugrad");
const path = require("path");
const fs = require("fs");

var app = express();
app.use(logger("dev"));

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

  // 외부 IP에서의 접속만 로깅 (IPv4 형식으로)
  if (!isLocalIP(ip)) {
    const displayIP = cleanIP(ip);
    console.log(`[외부 접속 IP] ${displayIP} - ${req.method} ${req.originalUrl}`);
  }

  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({ origin: "http://rukeras.com" }));
app.use("/download_menu", express.static("download_menu"));
app.use("/download_notice", express.static("download_notice"));
app.use("/assets", express.static("assets")); // 학사일정 CSS 파일들을 위한 정적 파일 서빙

app.use("/notice", noticeRouter);
app.use("/shuttle", shuttleRouter);
app.use("/menu", menuRouter);
app.use("/campus_map", campusMapRouter);
app.use("/edugrad", edugradRouter);

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

