const mysql = require("mysql2/promise");
const config = require("./config");

// 연결 풀 생성
const pool = mysql.createPool({
  host: config.db.host,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: parseInt(config.db.connectionLimit || "10", 10), // 동시에 유지할 최대 연결 수
  queueLimit: 0, // 대기열 제한 (0 = 무제한)
});

module.exports = pool;
