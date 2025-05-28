var express = require("express");
var router = express.Router();

/* GET test page. */
router.get("/", function (req, res, next) {
  var test = {
    title: "안녕하세요 제목입니다.",
    content: "안녕하세요 내용입니다.",
    message: "success",
  };

  res.json(test);
});

module.exports = router;

