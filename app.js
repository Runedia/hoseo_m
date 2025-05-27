var express = require("express");
var logger = require("morgan");
const cors = require("cors");

var noticeRouter = require("./routes/notice");
var shuttleRouter = require("./routes/shuttle");
var menuRouter = require("./routes/menu");

var app = express();
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({ origin: "http://rukeras.com" }));
app.use("/download", express.static("download"));

app.use("/notice", noticeRouter);
app.use("/shuttle", shuttleRouter);
app.use("/menu", menuRouter);

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
