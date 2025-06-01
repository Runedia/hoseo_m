# hoseo-m

> 호서대학교 홈페이지 크롤링 및 정보 제공 REST API 서버

[![Node.js](https://img.shields.io/badge/Node.js-22.15.x-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21.x-blue.svg)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-orange.svg)](https://www.mysql.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

## 📋 프로젝트 개요

호서대학교의 각종 정보(공지사항, 식단표, 셔틀버스, 학사일정 등)를 자동으로 수집하고 API로 제공하는 Node.js 기반 백엔드 서버입니다. 웹 크롤링을 통해 실시간으로 정보를 수집하며, RESTful API를 통해 모바일 앱이나 웹 클라이언트에서 활용할 수 있습니다.

### 🎯 주요 기능

- **공지사항 크롤링**: 학교 홈페이지의 공지사항을 자동 수집 및 분류
- **식단표 정보**: 학교 식당 및 기숙사 식단 정보 제공
- **셔틀버스 시간표**: 캠퍼스 간 셔틀 운행 시간 정보
- **학사일정**: 중요한 학사 일정 정보 제공
- **학과 정보**: 각 학과별 상세 정보 크롤링
- **캠퍼스 맵**: 캠퍼스 지도 및 시설 정보
- **자동 스케줄링**: 1시간마다 자동으로 최신 정보 업데이트

## 🛠️ 기술 스택

### Backend Framework
- **Node.js** (22.15.x) - JavaScript 런타임
- **Express.js** (4.21.x) - 웹 프레임워크
- **MySQL2** (3.14.x) - 데이터베이스 연결

### 크롤링 & 데이터 처리
- **Axios** (1.9.x) - HTTP 클라이언트
- **Cheerio** (1.0.x) - HTML 파싱 및 DOM 조작
- **node-cron** - 스케줄링 시스템

### 보안 & 미들웨어
- **Helmet** (8.1.x) - 보안 헤더 설정
- **CORS** (2.8.x) - Cross-Origin Resource Sharing
- **Morgan** (1.9.x) - HTTP 요청 로깅

### 로깅 & 모니터링
- **Winston** (3.17.x) - 로깅 시스템
- **Winston Daily Rotate File** (5.0.x) - 로그 파일 로테이션

### 개발 도구
- **Nodemon** (3.1.x) - 개발 서버 자동 재시작
- **Prettier** - 코드 포맷팅
- **Module Alias** (2.2.x) - 경로 별칭

## 📂 프로젝트 구조

```
hoseo_m/
├── 📁 assets/                    # 정적 자산 및 크롤링된 데이터
│   ├── 📁 static/               # 임시 정적 파일
│   ├── Asan_Campus.json         # 아산캠퍼스 정보
│   └── Cheonan_Campus.json      # 천안캠퍼스 정보
├── 📁 bin/                      # 실행 스크립트
│   └── www                      # 서버 시작점
├── 📁 download_menu/            # 식단표 다운로드 파일
├── 📁 download_notice/          # 공지사항 다운로드 파일
├── 📁 download_happy_dorm/      # 기숙사 관련 다운로드 파일
├── 📁 logs/                     # 로그 파일
├── 📁 process/                  # 크롤링 프로세스
│   ├── 📁 1_notice/            # 공지사항 크롤링
│   ├── 📁 2_shuttle/           # 셔틀버스 정보 크롤링
│   ├── 📁 4_menu/              # 식단표 크롤링
│   ├── 📁 5_department/        # 학과 정보 크롤링
│   └── 📁 6_eduguide/          # 교육과정 크롤링
├── 📁 routes/                   # API 라우트
│   ├── campus_map.js           # 캠퍼스 맵 API
│   ├── departments.js          # 학과 정보 API
│   ├── eduguide.js            # 교육과정 API
│   ├── logs.js                # 로그 조회 API
│   ├── menu.js                # 식단표 API
│   ├── notice.js              # 공지사항 API
│   └── shuttle.js             # 셔틀버스 API
├── 📁 utils/                    # 유틸리티
│   ├── config.js              # 환경설정
│   ├── db.js                  # 데이터베이스 연결
│   ├── logger.js              # 로깅 설정
│   └── scheduler.js           # 자동 스케줄러 (새로 추가)
├── 📄 app.js                    # Express 앱 설정
├── 📄 package.json             # 프로젝트 의존성
├── 📄 DBSetting.sql            # 데이터베이스 스키마
├── 📄 .env.development         # 개발환경 설정
└── 📄 .env.production          # 운영환경 설정
```

## 🚀 설치 및 실행

### 1. 프로젝트 클론 및 의존성 설치

```bash
git clone [repository-url]
cd hoseo_m
npm install
```

### 2. 환경 변수 설정

#### 환경 설정 파일 (`.env.development` 또는 `.env.production`)
```env
NODE_ENV=development
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=hoseo_db
DB_CONNECTION_LIMIT=10
ALLOWED_HOSTS=localhost,127.0.0.1,rukeras.com
ENABLE_HSTS=false
```

### 3. 데이터베이스 설정

```bash
# MySQL 데이터베이스 생성 후 스키마 적용
mysql -u username -p database_name < DBSetting.sql
```

### 4. 서버 실행

#### 개발 모드
```bash
npm run dev
# 또는
nodemon ./bin/www
```

#### 운영 모드
```bash
npm start
# 또는
node ./bin/www
```

## 📊 API 엔드포인트

### 🔔 공지사항 API
> 📖 **상세 문서**: [공지사항 API 문서](./rest_api_docs/notice.md)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notice/list` | 공지사항 목록 (페이징) |
| GET | `/notice/idx/:chidx` | 공지사항 상세 조회 |
| GET | `/notice/type/:type` | 카테고리별 공지사항 |
| GET | `/notice/types` | 공지사항 카테고리 목록 |
| GET | `/notice/search` | 공지사항 검색 |

#### 예시 요청
```javascript
// 공지사항 목록 조회
GET /notice/list?page=1&pageSize=20

// 공지사항 상세 조회 (자동 크롤링 포함)
GET /notice/idx/12345

// 카테고리별 조회
GET /notice/type/CTG_17082400011?page=1&pageSize=10

// 검색
GET /notice/search?title=휴강&author=교무처&type=CTG_17082400011
```

### 🍽️ 식단표 API
> 📖 **상세 문서**: [식단표 API 문서](./rest_api_docs/menu.md)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/menu/list` | 식단표 목록 |
| GET | `/menu/happy_dorm` | 행복생활관 식단 |
| GET | `/menu/detail/:date` | 특정 날짜 식단 상세 |

### 🚌 셔틀버스 API
> 📖 **상세 문서**: [셔틀버스 API 문서](./rest_api_docs/shuttle.md)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/shuttle/schedule` | 셔틀버스 시간표 |
| GET | `/shuttle/workday` | 평일 운행 시간 |
| GET | `/shuttle/saturday` | 토요일 운행 시간 |
| GET | `/shuttle/sunday` | 일요일/공휴일 운행 시간 |

### 🏫 학과 정보 API
> 📖 **상세 문서**: [학과 정보 API 문서](./rest_api_docs/departments.md)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/departments/list` | 학과 목록 |
| GET | `/departments/:id` | 특정 학과 정보 |

### 🗺️ 캠퍼스 맵 API
> 📖 **상세 문서**: [캠퍼스 맵 API 문서](./rest_api_docs/campus_map.md)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/campus_map/asan` | 아산캠퍼스 지도 정보 |
| GET | `/campus_map/cheonan` | 천안캠퍼스 지도 정보 |

### 📚 교육과정 API
> 📖 **상세 문서**: [교육과정 API 문서](./rest_api_docs/eduguide.md)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/eduguide/curriculum` | 교육과정 정보 |
| GET | `/eduguide/schedule` | 학사일정 |

### 📝 로그 조회 API
> 📖 **상세 문서**: [로그 API 문서](./rest_api_docs/logs.md)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/logs/access` | 접속 로그 조회 |
| GET | `/logs/error` | 에러 로그 조회 |

## ⚙️ 자동 스케줄링 시스템

프로젝트에는 `node-cron`을 사용한 자동 스케줄링 시스템이 구현되어 있습니다.

### 스케줄링 대상
- **매시간 정각 실행**: 3개의 주요 크롤링 스크립트가 순차적으로 실행됩니다.

```javascript
// 실행되는 스크립트들 (순서대로)
1. process/1_notice/get_notice_list.js       // 공지사항 목록 크롤링
2. process/4_menu/get_menu_list.js           // 식단표 크롤링
3. process/4_menu/get_menu_list(happy_dorm).js // 기숙사 식단표 크롤링
```

### 스케줄러 특징
- **순차 실행**: 스크립트들이 동시에 실행되지 않고 하나씩 차례대로 실행
- **에러 처리**: 한 스크립트가 실패해도 다음 스크립트는 계속 실행
- **로깅**: 모든 실행 과정이 상세하게 로그로 기록
- **자동 재시작**: 서버 재시작 시 자동으로 스케줄러도 함께 시작

## 🔒 보안 기능

### 호스트 검증
```javascript
// 허용된 호스트만 접근 가능
const allowedHosts = ["localhost", "127.0.0.1", "rukeras.com"];
```

### 보안 헤더
- **Helmet** 미들웨어를 통한 보안 헤더 자동 설정
- **HSTS** 지원 (운영환경에서 활성화)
- **CORS** 정책 적용

### 접속 모니터링
- 외부 IP에서의 모든 접속을 실시간 로깅
- 차단된 접속 시도도 별도 기록

## 📁 데이터 저장 구조

### 크롤링된 데이터 저장
```
download_notice/[chidx]/
├── [chidx]_detail.json      # 공지사항 상세 내용
├── [chidx]_files/           # 첨부파일들
└── [chidx]_images/          # 이미지 파일들

download_menu/
├── menu_[date].json         # 일반 식단표
└── happy_dorm_[date].json   # 기숙사 식단표

download_happy_dorm/
└── [date]_menu.json         # 행복생활관 식단
```

### 로그 파일 구조
```
logs/
├── YYYY-MM-DD-crawler.log   # 일별 크롤링 로그
├── YYYY-MM-DD-access.log    # 일별 접속 로그
├── crawler.log              # 일반 크롤링 로그
├── error.log                # 에러 로그
└── access.log               # 접속 로그
```

## 🔧 개발 도구 및 설정

### 코드 포맷팅
```json
// .prettierrc.json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": false,
  "printWidth": 120,
  "tabWidth": 2
}
```

### 모듈 별칭
```json
// jsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@root/*": ["./*"]
    }
  }
}
```

### Nodemon 설정
```json
// package.json의 nodemonConfig
{
  "watch": ["process/", "routes/", "utils/", "app.js"],
  "ext": "js,json"
}
```

## 🛠️ 주요 의존성

### 운영 의존성
```json
{
  "axios": "^1.9.0",           // HTTP 클라이언트
  "cheerio": "^1.0.0",         // HTML 파싱
  "express": "^4.21.2",        // 웹 프레임워크
  "mysql2": "^3.14.1",         // MySQL 드라이버
  "winston": "^3.17.0",        // 로깅
  "node-cron": "^3.0.3",       // 스케줄링
  "helmet": "^8.1.0",          // 보안
  "cors": "^2.8.5"             // CORS
}
```

### 개발 의존성
```json
{
  "nodemon": "^3.1.10",        // 개발 서버
  "prettier": "^3.0.0"         // 코드 포맷팅
}
```

## 🚨 자동 크롤링하지 않는 정보

일부 정보는 수동으로 관리되거나 정적 데이터로 제공됩니다:

- **셔틀버스 시간표**: 변경이 적어 수동 업데이트
- **캠퍼스 맵**: 정적 JSON 파일로 관리
- **학과 정보**: 주기적으로 수동 업데이트

## 📈 성능 최적화

### 데이터베이스 연결 풀
- **Connection Limit**: 개발환경 10개, 운영환경 20개
- **Queue Limit**: 무제한 (0)
- **Wait for Connections**: 활성화

### 로그 로테이션
- **파일 크기**: 최대 20MB
- **보관 기간**: 14일
- **압축**: 자동 압축 활성화

### 메모리 관리
- 서버 시작 시 `assets/static` 폴더 자동 정리
- 임시 파일 주기적 삭제

## 🐛 트러블슈팅

### 일반적인 문제들

1. **데이터베이스 연결 실패**
   ```bash
   # 환경변수 확인
   echo $NODE_ENV
   # .env 파일 존재 여부 확인
   ls -la .env.*
   ```

2. **크롤링 실패**
   ```bash
   # 로그 확인
   tail -f logs/error.log
   # 네트워크 연결 확인
   ping www.hoseo.edu
   ```

3. **스케줄러 동작 안함**
   ```bash
   # 서버 로그 확인
   tail -f logs/crawler.log | grep "스케줄러"
   ```

4. **포트 충돌**
   ```bash
   # 포트 사용 확인 (기본 3000)
   netstat -an | grep 3000
   lsof -i :3000
   ```

## 📞 지원 및 문의

- **작성자**: jhkim (runedia@naver.com)
- **Discord**: 루네디아#0560
- **프로젝트 버전**: 1.0.0
- **Node.js 버전**: 22.15.x 권장

## 📄 라이센스

이 프로젝트는 [MIT License](LICENSE)로 배포됩니다.

---
