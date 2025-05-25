const dotenv = require("dotenv");
const path = require("path");

// NODE_ENV가 없으면 기본값은 development
const env = process.env.NODE_ENV || "development";

// 환경별로 .env 파일 로드
dotenv.config({ path: path.resolve(process.cwd(), `.env.${env}`) });

// config 객체로 통일해서 내보내기
module.exports = {
  env,
  db: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || "10", 10),
  },
};
