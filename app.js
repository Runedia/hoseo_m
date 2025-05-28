require("module-alias/register");

var express = require("express");
var logger = require("morgan");
const cors = require("cors");

var noticeRouter = require("@root/routes/notice");
var shuttleRouter = require("@root/routes/shuttle");
var menuRouter = require("@root/routes/menu");
var campusMapRouter = require("@root/routes/campus_map");

var app = express();
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({ origin: "http://rukeras.com" }));
app.use("/download", express.static("download"));

app.use("/notice", noticeRouter);
app.use("/shuttle", shuttleRouter);
app.use("/menu", menuRouter);
app.use("/campus_map", campusMapRouter);

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
