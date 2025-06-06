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
- **교육가이드**: 학사일정, 교육과정, 수업, 학적 정보
- **자동 스케줄링**: 주기적으로 자동으로 최신 정보 업데이트

## 🛠️ 기술 스택

### Backend Framework
- **Node.js** (22.15.x) - JavaScript 런타임
- **Express.js** (4.21.x) - 웹 프레임워크
- **MySQL2** (3.14.x) - 데이터베이스 연결

### 크롤링 & 데이터 처리
- **Axios** (1.9.x) - HTTP 클라이언트
- **Cheerio** (1.0.x) - HTML 파싱 및 DOM 조작
- **node-cron** (4.1.x) - 스케줄링 시스템
- **fs-extra** (11.3.x) - 파일 시스템 확장

### 보안 & 미들웨어
- **Helmet** (8.1.x) - 보안 헤더 설정
- **CORS** (2.8.x) - Cross-Origin Resource Sharing
- **Morgan** (1.9.x) - HTTP 요청 로깅
- **Cookie Parser** (1.4.x) - 쿠키 파싱

### 로깅 & 모니터링
- **Winston** (3.17.x) - 로깅 시스템
- **Winston Daily Rotate File** (5.0.x) - 로그 파일 로테이션

### 개발 도구
- **Nodemon** (3.1.x) - 개발 서버 자동 재시작
- **Prettier** - 코드 포맷팅
- **Module Alias** (2.2.x) - 경로 별칭
- **dotenv** (16.5.x) - 환경변수 관리

## 📂 프로젝트 구조

```
hoseo_m/
├── 📁 assets/                      # 정적 자산 및 크롤링된 데이터
│   ├── 📁 static/                 # 임시 정적 파일
│   ├── Asan_Campus.json           # 아산캠퍼스 정보
│   ├── Cheonan_Campus.json        # 천안캠퍼스 정보
│   └── 📁 [셔틀 시간표 JSON 파일들]
├── 📁 bin/                        # 실행 스크립트
│   └── www                        # 서버 시작점
├── 📁 download_menu/              # 식단표 다운로드 파일
├── 📁 download_notice/            # 공지사항 다운로드 파일
├── 📁 download_happy_dorm/        # 기숙사 관련 다운로드 파일
├── 📁 logs/                       # 로그 파일
├── 📁 process/                    # 크롤링 프로세스
│   ├── 📁 1_notice/              # 공지사항 크롤링
│   ├── 📁 2_shuttle/             # 셔틀버스 정보 크롤링
│   ├── 📁 4_menu/                # 식단표 크롤링
│   ├── 📁 5_department/          # 학과 정보 크롤링
│   └── 📁 6_eduguide/            # 교육과정 크롤링
├── 📁 routes/                     # API 라우트
│   ├── campus_map.js             # 캠퍼스 맵 API
│   ├── departments.js            # 학과 정보 API
│   ├── eduguide.js              # 교육과정 API
│   │   └── 📁 eduguide/         # 교육과정 하위 라우터
│   │       ├── calendar.js      # 학사일정
│   │       ├── curriculum.js    # 교육과정
│   │       ├── class.js         # 수업
│   │       └── record.js        # 학적
│   ├── menu.js                  # 식단표 API
│   ├── notice.js                # 공지사항 API
│   └── shuttle.js               # 셔틀버스 API
├── 📁 services/                   # 서비스 레이어
│   ├── databaseService.js        # 데이터베이스 헬퍼
│   ├── departmentService.js      # 학과 서비스
│   ├── eduguideService.js        # 교육가이드 서비스
│   ├── paginationService.js      # 페이징 서비스
│   └── searchService.js          # 검색 서비스
├── 📁 utils/                      # 유틸리티 모듈
│   ├── config.js                 # 환경설정
│   ├── db.js                     # 데이터베이스 연결
│   ├── logger.js                 # 로깅 설정
│   ├── 📁 routes/               # 라우트 유틸리티
│   │   ├── errorHandler.js      # 에러 처리
│   │   ├── fileManager.js       # 파일 관리
│   │   ├── responseHelper.js    # 응답 헬퍼
│   │   └── validators.js        # 검증 함수
│   └── 📁 process/              # 프로세스 유틸리티
│       ├── crawler.js           # 크롤링 공통
│       ├── file.js              # 파일 처리
│       ├── parser.js            # 파싱 함수
│       ├── process.js           # 프로세스 관리
│       ├── scheduler.js         # 스케줄러
│       └── shuttle.js           # 셔틀 관련
├── 📁 rest_api_docs/             # API 문서
│   ├── campus_map.md            # 캠퍼스 맵 API 문서
│   ├── departments_api.md       # 학과 정보 API 문서
│   ├── eduguide_api.md         # 교육가이드 API 문서
│   ├── menu_api.md             # 식단표 API 문서
│   ├── notice_api.md           # 공지사항 API 문서
│   └── shuttle_api.md          # 셔틀버스 API 문서
├── 📄 app.js                     # Express 앱 설정
├── 📄 package.json              # 프로젝트 의존성
├── 📄 DBSetting.sql             # 데이터베이스 스키마
├── 📄 .env.development          # 개발환경 설정
├── 📄 .env.production           # 운영환경 설정
├── 📄 .prettierrc.json          # Prettier 설정
├── 📄 .gitignore               # Git 무시 파일
└── 📄 jsconfig.json            # 모듈 별칭 설정
```

## 🚀 설치 및 실행

### 1. 시스템 요구사항

- **Node.js**: 22.15.x 이상
- **MySQL**: 8.0 이상
- **운영체제**: Windows, Linux, macOS

### 2. 프로젝트 클론 및 의존성 설치

```bash
git clone [repository-url]
cd hoseo_m
npm install
```

### 3. 환경 변수 설정

#### 개발환경 (`.env.development`)
```env
# 데이터베이스 설정
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=hoseo_m
DB_CONNECTION_LIMIT=10

# 보안 설정
ALLOWED_HOSTS=rukeras.com,localhost,127.0.0.1,10.0.2.2
ENABLE_HSTS=false

# 포트 설정
HTTP_PORT=3000
HTTPS_PORT=4000
```

#### 운영환경 (`.env.production`)
```env
# 데이터베이스 설정
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=hoseo_m
DB_CONNECTION_LIMIT=10

# 보안 설정 (더 엄격)
ALLOWED_HOSTS=rukeras.com
ENABLE_HSTS=true

# 포트 설정
HTTP_PORT=80
HTTPS_PORT=443
```

### 4. 데이터베이스 설정

```bash
# MySQL 데이터베이스 생성 후 스키마 적용
mysql -u username -p database_name < DBSetting.sql
```

### 5. 서버 실행

#### 개발 모드
```bash
npm run dev
# 또는
nodemon ./bin/www
```

#### 운영 모드
```bash
NODE_ENV=production npm start
# 또는
NODE_ENV=production node ./bin/www
```

## 🛠️ 주요 의존성

### 운영 의존성
```json
{
  "axios": "^1.9.0",                    // HTTP 클라이언트
  "cheerio": "^1.0.0",                  // HTML 파싱
  "express": "^4.21.2",                 // 웹 프레임워크
  "mysql2": "^3.14.1",                  // MySQL 드라이버
  "winston": "^3.17.0",                 // 로깅 시스템
  "winston-daily-rotate-file": "^5.0.0", // 로그 로테이션
  "node-cron": "^4.1.0",                // 스케줄링
  "helmet": "^8.1.0",                   // 보안 헤더
  "cors": "^2.8.5",                     // CORS 정책
  "dotenv": "^16.5.0",                  // 환경변수
  "fs-extra": "^11.3.0",                // 파일 시스템 확장
  "module-alias": "^2.2.3",             // 모듈 별칭
  "morgan": "~1.9.1",                   // HTTP 로깅
  "cookie-parser": "~1.4.4",            // 쿠키 파싱
  "http-errors": "~1.6.3",              // HTTP 에러
  "debug": "~2.6.9"                     // 디버깅
}
```

### 개발 의존성
```json
{
  "nodemon": "^3.1.10"                  // 개발 서버 자동 재시작
}
```
## 📊 API 엔드포인트

### 🔔 공지사항 API
> 📖 **상세 문서**: [공지사항 API 문서](./rest_api_docs/notice_api.md)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notice/list` | 공지사항 목록 (페이징) |
| GET | `/notice/idx/:chidx` | 공지사항 상세 조회 (자동 다운로드) |
| GET | `/notice/types` | 공지사항 카테고리 목록 |
| GET | `/notice/search` | 공지사항 검색 |

#### 예시 요청
```javascript
// 공지사항 목록 조회
GET /notice/list?page=1&pageSize=20

// 공지사항 상세 조회 (자동 크롤링 포함)
GET /notice/idx/89756

// 카테고리 목록 조회
GET /notice/types

// 검색 (기본 카테고리: CTG_17082400011)
GET /notice/search?title=수강신청&author=학사팀
```

### 🍽️ 식단표 API
> 📖 **상세 문서**: [식단표 API 문서](./rest_api_docs/menu_api.md)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/menu/list` | 식단표 목록 (기본) |
| GET | `/menu/list2` | 식단표 목록 (페이징 정보 포함) |
| GET | `/menu/idx/:chidx/:action` | 식단표 상세 조회 (자동 다운로드) |
| GET | `/menu/actions` | 캠퍼스/식당 목록 |
| GET | `/menu/search` | 식단표 검색 |

#### 예시 요청
```javascript
// 천안캠퍼스 식단표 목록
GET /menu/list?action=MAPP_2312012408&page=1&pageSize=10

// 식단표 상세 조회 (자동 크롤링 포함)
GET /menu/idx/87864/MAPP_2312012408

// 행복기숙사 식단표 상세 조회
GET /menu/idx/87865/HAPPY_DORM_NUTRITION

// 지원 캠퍼스 목록
GET /menu/actions
```

### 🚌 셔틀버스 API
> 📖 **상세 문서**: [셔틀버스 API 문서](./rest_api_docs/shuttle_api.md)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/shuttle/schedule` | 셔틀버스 시간표 (자동 필터링) |
| GET | `/shuttle/schedule/detail` | 셔틀버스 상세 시간표 |

#### 예시 요청
```javascript
// 평일 아산→천안 시간표
GET /shuttle/schedule?date=2025-01-20&route=1

// 토요일 천안→아산 시간표
GET /shuttle/schedule?date=2025-01-25&route=2

// 특정 버스 상세 시간표
GET /shuttle/schedule/detail?date=2025-01-20&route=1&schedule=1
```

### 🏫 학과 정보 API
> 📖 **상세 문서**: [학과 정보 API 문서](./rest_api_docs/departments_api.md)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/departments/list` | 학과 목록 (detailed/simple) |
| GET | `/departments/info` | 학과 상세 정보 (자동 크롤링) |
| GET | `/departments/images/:filename` | 학과 이미지 다운로드 |

#### 예시 요청
```javascript
// 상세 형식 학과 목록
GET /departments/list?format=detailed

// 간단 형식 학과 목록
GET /departments/list?format=simple

// 학과 상세 정보 (캐싱 지원)
GET /departments/info?dept=컴퓨터공학부

// 학과 이미지
GET /departments/images/computer_lab_01.jpg
```

### 🗺️ 캠퍼스 맵 API
> 📖 **상세 문서**: [캠퍼스 맵 API 문서](./rest_api_docs/campus_map.md)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/campus_map/:campus` | 캠퍼스 정보 조회 |
| GET | `/campus_map/:campus/image` | 캠퍼스 이미지 조회 |

#### 예시 요청
```javascript
// 아산캠퍼스 정보
GET /campus_map/asan

// 천안캠퍼스 정보
GET /campus_map/cheonan

// 캠퍼스 이미지
GET /campus_map/asan/image
```

### 📚 교육가이드 API
> 📖 **상세 문서**: [교육가이드 API 문서](./rest_api_docs/eduguide_api.md)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/eduguide/` | API 정보 및 사용 가능한 엔드포인트 |
| GET | `/eduguide/calendar` | 학사일정 |
| GET | `/eduguide/curriculum` | 교육과정 (type별) |
| GET | `/eduguide/curriculum/types` | 교육과정 타입 목록 |
| GET | `/eduguide/class` | 수업 정보 (type별) |
| GET | `/eduguide/class/types` | 수업 타입 목록 |
| GET | `/eduguide/record` | 학적 정보 (type별) |
| GET | `/eduguide/record/types` | 학적 타입 목록 |

#### 예시 요청
```javascript
// API 정보
GET /eduguide/

// 학사일정
GET /eduguide/calendar

// 기본 교육과정
GET /eduguide/curriculum?type=basic

// 부전공 교육과정
GET /eduguide/curriculum?type=minor

// 수강신청 정보
GET /eduguide/class?type=regist

// 시험 정보
GET /eduguide/record?type=test
```

## ⚙️ 아키텍처 및 디자인 패턴

### 서비스 레이어 패턴

프로젝트는 3계층 아키텍처를 따릅니다:

```
📁 routes/           # 프레젠테이션 레이어 (API 엔드포인트)
📁 services/         # 비즈니스 로직 레이어
📁 utils/           # 데이터 액세스 및 유틸리티 레이어
```

### 주요 서비스 모듈

#### 1. DatabaseService (`services/databaseService.js`)
- **NoticeHelper**: 공지사항 데이터베이스 작업
- **MenuHelper**: 식단표 데이터베이스 작업
- 공통 CRUD 패턴 및 페이징 지원

#### 2. DepartmentService (`services/departmentService.js`)
- 학과 정보 관리 및 캐싱
- 파일 시스템 관리
- 포맷 검증 및 변환

#### 3. EduguideService (`services/eduguideService.js`)
- 교육가이드 공통 로직
- 타입 검증 및 응답 생성
- JSON 파일 처리

#### 4. SearchService (`services/searchService.js`)
- 검색 조건 생성 및 최적화
- SQL 쿼리 빌더

#### 5. PaginationService (`services/paginationService.js`)
- 페이징 로직 및 메타데이터 생성

### 유틸리티 모듈

#### Routes 유틸리티 (`utils/routes/`)
- **responseHelper.js**: 표준화된 API 응답 생성
- **errorHandler.js**: 일관된 에러 처리
- **fileManager.js**: 파일 시스템 관리
- **validators.js**: 입력 검증 함수

#### Process 유틸리티 (`utils/process/`)
- **crawler.js**: 크롤링 공통 로직
- **parser.js**: HTML 파싱 함수
- **scheduler.js**: 스케줄링 관리
- **file.js**: 파일 처리 유틸리티

### 모듈 별칭 시스템

```javascript
// jsconfig.json을 통한 별칭 설정
require("module-alias/register");

// 사용 예시
const { createLogger } = require("@root/utils/logger");
const DepartmentService = require("@root/services/departmentService");
```

## 🔒 보안 및 인증

### 호스트 기반 접근 제어

```javascript
// 환경별 허용 호스트 설정
// 개발환경
ALLOWED_HOSTS=rukeras.com,localhost,127.0.0.1,10.0.2.2

// 운영환경 (더 엄격)
ALLOWED_HOSTS=rukeras.com
```

### 보안 헤더 및 미들웨어

- **Helmet**: 다양한 보안 헤더 자동 설정
- **HSTS**: 운영환경에서 HTTPS 강제 (ENABLE_HSTS=true)
- **CORS**: Origin 기반 접근 제어
- **Morgan**: 모든 HTTP 요청 로깅

### 접속 모니터링

```javascript
// 외부 IP 접속 실시간 모니터링
if (!isLocalRequest && !isAllowedHost) {
  logger.warn(`차단된 접속: ${clientIP} -> ${req.method} ${req.url}`);
  return res.status(403).json({ error: "Access denied" });
}
```

## 📁 데이터 저장 및 관리

### 크롤링 데이터 구조

#### 공지사항 (`download_notice/`)
```
download_notice/{chidx}/
├── {chidx}_detail.json      # 메타데이터 및 파싱된 내용
├── {chidx}.html            # 원본 HTML
├── 📁 images/              # 다운로드된 이미지
└── 📁 files/               # 첨부파일
```

#### 식단표 (`download_menu/`, `download_happy_dorm/`)
```
download_menu/{chidx}/
├── {chidx}_detail.json      # 메타데이터
├── {chidx}.html            # 원본 HTML
└── 📁 [다운로드된 파일들]

download_happy_dorm/{chidx}/
├── {chidx}_detail.json      # 기숙사 전용 구조
├── {chidx}.html
└── 📁 [관련 파일들]
```

### 로그 관리 시스템

#### 로그 분류 및 로테이션
```
logs/
├── YYYY-MM-DD-access.log    # 일별 접속 로그 (자동 로테이션)
├── YYYY-MM-DD-error.log     # 일별 에러 로그
├── YYYY-MM-DD-crawler.log   # 일별 크롤링 로그
├── access.log               # 현재 접속 로그
├── error.log                # 현재 에러 로그
└── crawler.log              # 현재 크롤링 로그
```

#### 로그 설정
- **파일 크기**: 최대 20MB
- **보관 기간**: 14일
- **압축**: 자동 압축 (gzip)
- **포맷**: 타임스탬프 + 레벨 + 메시지
## 🐛 트러블슈팅

### 일반적인 문제들

#### 1. 데이터베이스 연결 실패
```bash
# 환경변수 확인
echo $NODE_ENV

# .env 파일 존재 여부 확인
ls -la .env.*

# MySQL 서비스 상태 확인
systemctl status mysql
# 또는 Windows에서
net start mysql
```

#### 2. 크롤링 실패
```bash
# 로그 확인
tail -f logs/error.log

# 네트워크 연결 확인
ping www.hoseo.ac.kr

# 크롤링 프로세스 수동 실행
node process/1_notice/get_notice_list.js
```

#### 3. 스케줄러 동작 안함
```bash
# 서버 로그 확인
tail -f logs/crawler.log | grep "스케줄러"

# 프로세스 확인
ps aux | grep node
```

#### 4. 포트 충돌
```bash
# 포트 사용 확인 (기본 3000)
netstat -an | grep 3000
lsof -i :3000

# Windows에서
netstat -ano | findstr :3000
```

#### 5. 권한 문제 (Linux/macOS)
```bash
# 로그 디렉토리 권한 설정
chmod 755 logs/
chmod 644 logs/*.log

# 다운로드 디렉토리 권한 설정
chmod -R 755 download_*/
```

#### 6. 메모리 부족
```bash
# Node.js 메모리 제한 증가
node --max-old-space-size=4096 ./bin/www

# PM2 사용 시
pm2 start ecosystem.config.js --node-args="--max-old-space-size=4096"
```

### 로그 분석

#### 에러 로그 패턴
```bash
# 크롤링 관련 에러
grep "크롤링" logs/error.log

# 데이터베이스 관련 에러
grep "MySQL\|DB" logs/error.log

# 네트워크 관련 에러
grep "ECONNREFUSED\|timeout" logs/error.log
```

#### 성능 모니터링
```bash
# 응답 시간이 긴 요청 찾기
grep "처리 시간" logs/access.log | awk '$NF > 1000'

# 에러율 확인
grep "500\|404" logs/access.log | wc -l
```

## 🔧 배포 및 운영

### PM2를 이용한 프로덕션 배포

#### 1. PM2 설치
```bash
npm install -g pm2
```

#### 2. PM2 설정 파일 (`ecosystem.config.js`)
```javascript
module.exports = {
  apps: [{
    name: 'hoseo-m',
    script: './bin/www',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 80
    },
    log_file: './logs/pm2.log',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=2048'
  }]
};
```

#### 3. 배포 명령어
```bash
# 개발환경
pm2 start ecosystem.config.js

# 운영환경
pm2 start ecosystem.config.js --env production

# 모니터링
pm2 monit

# 로그 확인
pm2 logs hoseo-m

# 재시작
pm2 restart hoseo-m

# 정지
pm2 stop hoseo-m
```

### Docker를 이용한 컨테이너 배포

#### Dockerfile
```dockerfile
FROM node:22-alpine

WORKDIR /app

# 의존성 설치
COPY package*.json ./
RUN npm ci --only=production

# 소스 코드 복사
COPY . .

# 포트 노출
EXPOSE 3000

# 로그 및 다운로드 디렉토리 생성
RUN mkdir -p logs download_notice download_menu download_happy_dorm

# 사용자 권한 설정
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001
RUN chown -R nodeuser:nodejs /app
USER nodeuser

# 서버 시작
CMD ["node", "./bin/www"]
```

#### docker-compose.yml
```yaml
version: '3.8'

services:
  hoseo-api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    volumes:
      - ./logs:/app/logs
      - ./download_notice:/app/download_notice
      - ./download_menu:/app/download_menu
      - ./download_happy_dorm:/app/download_happy_dorm
    depends_on:
      - mysql
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: your_password
      MYSQL_DATABASE: hoseo_m
    volumes:
      - mysql_data:/var/lib/mysql
      - ./DBSetting.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "3306:3306"
    restart: unless-stopped

volumes:
  mysql_data:
```

### Nginx 리버스 프록시 설정

#### nginx.conf
```nginx
server {
    listen 80;
    server_name rukeras.com;

    # HTTPS로 리디렉션
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name rukeras.com;

    # SSL 설정
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;

    # API 프록시
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # 정적 파일 캐싱
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 📊 모니터링 및 로깅

### 로그 레벨 및 분류

#### Winston 로그 레벨
```javascript
const levels = {
  error: 0,    // 에러 (크롤링 실패, DB 오류 등)
  warn: 1,     // 경고 (차단된 접속, 파일 없음 등)
  info: 2,     // 정보 (API 요청, 성공적인 크롤링 등)
  debug: 3     // 디버그 (개발 중에만 사용)
};
```

#### 로그 카테고리
- **access.log**: HTTP 요청 로그
- **error.log**: 애플리케이션 에러
- **crawler.log**: 크롤링 관련 로그

### 성능 메트릭

#### 주요 모니터링 지표
```javascript
// API 응답 시간
const processingTime = Date.now() - startTime;
logger.info(`API 응답 완료: ${req.method} ${req.url} (${processingTime}ms)`);

// 메모리 사용량
const memUsage = process.memoryUsage();
logger.debug(`메모리 사용량: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);

// 데이터베이스 연결 상태
logger.info(`DB 연결 풀: 활성 ${pool.config.connectionLimit} / 대기 ${pool._freeConnections.length}`);
```

## 🔐 환경변수 가이드

### 필수 환경변수

| 변수명 | 타입 | 설명 | 예시값 |
|--------|------|------|--------|
| `NODE_ENV` | string | 실행 환경 | `development`, `production` |
| `DB_HOST` | string | 데이터베이스 호스트 | `localhost` |
| `DB_USER` | string | 데이터베이스 사용자 | `root` |
| `DB_PASSWORD` | string | 데이터베이스 비밀번호 | `your_password` |
| `DB_NAME` | string | 데이터베이스 이름 | `hoseo_m` |

### 선택적 환경변수

| 변수명 | 타입 | 기본값 | 설명 |
|--------|------|--------|------|
| `DB_CONNECTION_LIMIT` | number | `10` | 데이터베이스 연결 풀 크기 |
| `HTTP_PORT` | number | `3000` | HTTP 포트 |
| `HTTPS_PORT` | number | `4000` | HTTPS 포트 |
| `ALLOWED_HOSTS` | string | `localhost` | 허용된 호스트 (쉼표 구분) |
| `ENABLE_HSTS` | boolean | `false` | HSTS 헤더 활성화 |

### 환경별 설정 권장사항

#### 개발환경
```env
NODE_ENV=development
DB_CONNECTION_LIMIT=5
ALLOWED_HOSTS=localhost,127.0.0.1,10.0.2.2
ENABLE_HSTS=false
HTTP_PORT=3000
```

#### 운영환경
```env
NODE_ENV=production
DB_CONNECTION_LIMIT=20
ALLOWED_HOSTS=rukeras.com
ENABLE_HSTS=true
HTTP_PORT=80
HTTPS_PORT=443
```

## 📞 지원 및 문의

- **작성자**: jhkim (runedia@naver.com)
- **Discord**: 루네디아#0560
- **프로젝트 버전**: 1.0.0
- **Node.js 버전**: 22.15.x 권장

## 📄 라이센스

이 프로젝트는 [MIT License](LICENSE)로 배포됩니다.

---

*Last Updated: 2025-06-06*
