# Menu API Documentation

호서대학교 식당 메뉴 관련 REST API 문서입니다.

## Base URL
```
/menu
```

## 개요

호서대학교 각 캠퍼스(천안, 아산) 및 행복기숙사의 식당 메뉴 정보를 제공하는 API입니다.
- 자동 크롤링 및 다운로드 기능 지원
- 이미지 및 첨부파일 자동 처리
- 페이징 및 검색 기능 제공
- 구조화된 로깅 및 성능 모니터링

## 지원 캠퍼스/식당

| Action Code | 이름 | 설명 |
|-------------|------|------|
| `MAPP_2312012408` | 천안 | 천안캠퍼스 식당 |
| `MAPP_2312012409` | 아산 | 아산캠퍼스 식당 |
| `HAPPY_DORM_NUTRITION` | 행복기숙사 | 행복기숙사 영양정보 |

---

## API Endpoints

### 1. 메뉴 목록 조회 (기본)

특정 캠퍼스/식당의 메뉴 목록을 조회합니다. (데이터만 반환)

**Endpoint:** `GET /menu/list`

#### Request Parameters (Query String)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `action` | string | ✅ | - | 캠퍼스/식당 코드 |
| `page` | number | ❌ | 1 | 페이지 번호 |
| `pageSize` | number | ❌ | 20 | 페이지당 항목 수 |

#### Example Request
```bash
GET /menu/list?action=MAPP_2312012408&page=1&pageSize=10
```

#### Success Response (200)
```json
[
  {
    "idx": 12345,
    "type": "MAPP_2312012408",
    "chidx": 87864,
    "title": "2025년 1월 첫째주 메뉴",
    "author": "관리자",
    "create_dt": "2025-01-01T00:00:00.000Z"
  },
  {
    "idx": 12344,
    "type": "MAPP_2312012408", 
    "chidx": 87863,
    "title": "2024년 12월 마지막주 메뉴",
    "author": "관리자",
    "create_dt": "2024-12-25T00:00:00.000Z"
  }
]
```

#### Error Response (400)
```json
{
  "error": "action 파라미터는 필수입니다.",
  "details": {
    "required": true,
    "parameter": "action",
    "example": "MAPP_2312012408 (천안), MAPP_2312012409 (아산), HAPPY_DORM_NUTRITION (행복기숙사)"
  }
}
```

#### Error Response (500)
```json
{
  "error": "Database query failed",
  "details": {
    "errno": -4077,
    "sqlState": "HY000"
  }
}
```

---

### 2. 메뉴 목록 조회 (페이징 정보 포함)

특정 캠퍼스/식당의 메뉴 목록을 조회합니다. (데이터 + 페이징 정보 반환)

**Endpoint:** `GET /menu/list2`

#### Request Parameters (Query String)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `action` | string | ✅ | - | 캠퍼스/식당 코드 |
| `page` | number | ❌ | 1 | 페이지 번호 |
| `pageSize` | number | ❌ | 20 | 페이지당 항목 수 |

#### Example Request
```bash
GET /menu/list2?action=MAPP_2312012408&page=1&pageSize=10
```

#### Success Response (200)
```json
{
  "data": [
    {
      "idx": 12345,
      "type": "MAPP_2312012408",
      "chidx": 87864,
      "title": "2025년 1월 첫째주 메뉴",
      "author": "관리자",
      "create_dt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "totalCount": 156,
  "currentPage": 1,
  "pageSize": 10,
  "totalPages": 16
}
```

---

### 3. 메뉴 상세 조회 (자동 다운로드)

특정 메뉴의 상세 내용을 조회합니다. 파일이 없으면 자동으로 크롤링하여 다운로드합니다.

**Endpoint:** `GET /menu/idx/:chidx/:action`

#### Request Parameters (Path)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `chidx` | number | ✅ | 메뉴 고유 번호 |
| `action` | string | ✅ | 캠퍼스/식당 코드 |

#### Example Request
```bash
GET /menu/idx/87864/MAPP_2312012408
```

#### Success Response (200) - 기존 데이터
```json
{
  "idx": 12345,
  "type": "MAPP_2312012408",
  "chidx": 87864,
  "title": "2025년 1월 첫째주 메뉴",
  "author": "관리자",
  "create_dt": "2025-01-01T00:00:00.000Z",
  "download_completed": 1,
  "download_date": "2025-01-01T10:30:00.000Z",
  "download_error": null,
  "content": "download_menu/87864/87864.html",
  "assets": [
    {
      "localPath": "download_menu/87864/menu_image_1.jpg",
      "fileName": "menu_image_1.jpg"
    }
  ],
  "attachments": [
    {
      "originUrl": "http://www.hoseo.ac.kr/File/Download.do?file=menu.pdf",
      "originName": "주간메뉴표.pdf",
      "localPath": "download_menu/87864/주간메뉴표.pdf",
      "fileName": "주간메뉴표.pdf"
    }
  ],
  "isDownloaded": true,
  "downloadPath": "download_menu"
}
```

#### Success Response (200) - 새로 다운로드된 데이터
```json
{
  "idx": 12346,
  "type": "HAPPY_DORM_NUTRITION",
  "chidx": 87865,
  "title": "2025년 1월 행복기숙사 영양정보",
  "author": "행복기숙사",
  "create_dt": "2025-01-01T00:00:00.000Z",
  "download_completed": 1,
  "download_date": "2025-06-06T15:30:00.000Z",
  "download_error": null,
  "content": {
    "content": "parsed HTML content",
    "assets": [],
    "attachments": []
  },
  "assets": [],
  "attachments": [],
  "isDownloaded": true,
  "downloadPath": "download_happy_dorm"
}
```

#### 자동 다운로드 프로세스

1. **메뉴 정보 조회**: DB에서 기본 메뉴 정보 확인
2. **JSON 파일 확인**: 해당 chidx의 JSON 파일 존재 여부 확인
3. **자동 크롤링**: 파일이 없거나 읽기 실패 시 타입별 크롤링 실행
   - **일반 캠퍼스**: `parseAndSaveCampusMenu()` 함수 사용
   - **행복기숙사**: `parseAndSaveHappyDormMenu()` 함수 사용
4. **이미지/파일 처리**: 메뉴 이미지 및 첨부파일 다운로드
5. **DB 업데이트**: 다운로드 상태 및 파일 정보 갱신

#### Error Response (404)
```json
{
  "error": "메뉴를 찾을 수 없습니다.",
  "details": {
    "chidx": 87864,
    "action": "MAPP_2312012408"
  }
}
```

#### Error Response (500)
```json
{
  "error": "Internal server error message"
}
```

---

### 4. 캠퍼스/식당 목록 조회

지원하는 모든 캠퍼스/식당 목록을 조회합니다.

**Endpoint:** `GET /menu/actions`

#### Example Request
```bash
GET /menu/actions
```

#### Success Response (200)
```json
[
  {
    "action": "MAPP_2312012408",
    "name": "천안"
  },
  {
    "action": "MAPP_2312012409", 
    "name": "아산"
  },
  {
    "action": "HAPPY_DORM_NUTRITION",
    "name": "행복기숙사"
  }
]
```

---

### 5. 메뉴 검색

제목, 작성자, 캠퍼스별로 메뉴를 검색합니다.

**Endpoint:** `GET /menu/search`

#### Request Parameters (Query String)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `title` | string | ❌ | - | 제목 검색어 (부분 일치) |
| `author` | string | ❌ | - | 작성자 검색어 (부분 일치) |
| `action` | string | ❌ | - | 캠퍼스/식당 코드 |
| `page` | number | ❌ | 1 | 페이지 번호 |
| `pageSize` | number | ❌ | 20 | 페이지당 항목 수 |

#### Example Request
```bash
GET /menu/search?title=1월&action=MAPP_2312012408&page=1&pageSize=10
```

#### Success Response (200)
```json
[
  {
    "idx": 12345,
    "type": "MAPP_2312012408",
    "chidx": 87864,
    "title": "2025년 1월 첫째주 메뉴",
    "author": "관리자",
    "create_dt": "2025-01-01T00:00:00.000Z",
    "type_name": "천안"
  }
]
```

---

## 데이터 구조

### Menu 기본 정보

| Field | Type | Description |
|-------|------|-------------|
| `idx` | number | DB 인덱스 |
| `type` | string | 캠퍼스/식당 코드 |
| `chidx` | number | 메뉴 고유 번호 |
| `title` | string | 메뉴 제목 |
| `author` | string | 작성자 |
| `create_dt` | datetime | 생성일시 |
| `download_completed` | number | 다운로드 완료 여부 (0/1) |
| `download_date` | datetime | 다운로드 완료 시간 |
| `download_error` | string | 다운로드 오류 메시지 |

### Content 정보 (상세 조회 시)

| Field | Type | Description |
|-------|------|-------------|
| `content` | string/object | HTML 파일 경로 또는 파싱된 내용 |
| `assets` | array | 이미지 파일 목록 |
| `attachments` | array | 첨부파일 목록 |
| `isDownloaded` | boolean | 다운로드 완료 여부 |
| `downloadPath` | string | 다운로드 기본 경로 |

### Asset 구조

```json
{
  "localPath": "download_menu/87864/image.jpg",
  "fileName": "image.jpg"
}
```

### Attachment 구조

```json
{
  "originUrl": "http://www.hoseo.ac.kr/File/Download.do?file=menu.pdf",
  "originName": "주간메뉴표.pdf", 
  "localPath": "download_menu/87864/주간메뉴표.pdf",
  "fileName": "주간메뉴표.pdf"
}
```

---

## 서비스 아키텍처

### 사용된 서비스 모듈

- **MenuHelper**: 데이터베이스 관련 작업 처리
- **SearchService**: 검색 기능 제공
- **fileManager**: 파일 시스템 관리
- **Logger**: 구조화된 로깅

### 로깅 시스템

API는 구조화된 로깅을 지원합니다:

```javascript
// API 요청 로깅
logger.api("GET", "/menu/list", 200, "150ms");

// 파일 작업 로깅  
logger.file("load", "87864_detail.json", "info");
logger.file("not_found", "87864_detail.json", "warn");

// 다운로드 상태 로깅
logger.loading("[87864] 세부 내용 다운로드 시작");
logger.success("[87864] 캠퍼스 메뉴 다운로드 완료");
logger.error("[87864] 다운로드 실패", error);
```

---

## 파일 다운로드 경로

### 일반 캠퍼스 (천안, 아산)
```
download_menu/{chidx}/
├── {chidx}.html              # 메뉴 HTML 내용
├── {chidx}_detail.json       # 메타데이터
├── {이미지파일명}.jpg         # 다운로드된 이미지들  
└── {첨부파일명}.pdf          # 다운로드된 첨부파일들
```

### 행복기숙사
```
download_happy_dorm/{chidx}/
├── {chidx}.html
├── {chidx}_detail.json
├── {이미지파일명}.jpg
└── {첨부파일명}.pdf
```

---

## 에러 코드

| HTTP Status | Error Type | Description |
|-------------|------------|-------------|
| 200 | OK | 요청 성공 |
| 400 | Bad Request | 필수 파라미터 누락 |
| 404 | Not Found | 메뉴를 찾을 수 없음 |
| 500 | Internal Server Error | 서버 내부 오류, 다운로드 실패, DB 오류 등 |

---

## 사용 예시

### 1. 천안캠퍼스 최신 메뉴 10개 조회 (기본)
```bash
curl "http://localhost:3000/menu/list?action=MAPP_2312012408&page=1&pageSize=10"
```

### 2. 천안캠퍼스 최신 메뉴 10개 조회 (페이징 정보 포함)
```bash
curl "http://localhost:3000/menu/list2?action=MAPP_2312012408&page=1&pageSize=10"
```

### 3. 특정 메뉴 상세 내용 조회 (자동 다운로드)
```bash
curl "http://localhost:3000/menu/idx/87864/MAPP_2312012408"
```

### 4. 행복기숙사 메뉴 상세 조회
```bash
curl "http://localhost:3000/menu/idx/87865/HAPPY_DORM_NUTRITION"
```

### 5. "1월" 키워드로 천안캠퍼스 메뉴 검색
```bash
curl "http://localhost:3000/menu/search?title=1월&action=MAPP_2312012408"
```

### 6. 지원 캠퍼스 목록 확인
```bash
curl "http://localhost:3000/menu/actions"
```

### 7. 전체 캠퍼스에서 "영양" 키워드 검색
```bash
curl "http://localhost:3000/menu/search?title=영양"
```

---

## 주요 기능

### 🔄 **자동 다운로드**
- 상세 조회 시 해당 메뉴가 처음 요청되면 자동으로 크롤링 실행
- 캠퍼스별로 다른 크롤링 로직 적용

### 📊 **구조화된 로깅**
- 모든 API 요청에 대한 상세한 로그 기록
- 처리 시간 및 상태 모니터링
- 파일 작업 및 다운로드 상태 추적

### 💾 **파일 캐싱**
- 한 번 다운로드된 메뉴는 로컬에 캐시되어 빠른 응답 제공
- JSON 형태로 메타데이터 저장

### 🔍 **고급 검색**
- 제목, 작성자, 캠퍼스별 검색 지원
- 부분 일치 검색 및 페이징 지원

### 🏗️ **서비스 기반 아키텍처**
- MenuHelper를 통한 데이터베이스 작업 추상화
- fileManager를 통한 파일 시스템 관리
- 모듈화된 구조로 유지보수성 향상

---

## 주의사항

1. **자동 다운로드**: 상세 조회 시 해당 메뉴가 처음 요청되면 크롤링이 실행되어 응답 시간이 길어질 수 있습니다.

2. **파일 저장 위치**: 다운로드된 파일들은 서버의 로컬 파일시스템에 저장됩니다.

3. **캐싱**: 한 번 다운로드된 메뉴는 로컬에 캐시되어 이후 요청 시 빠르게 응답됩니다.

4. **에러 핸들링**: 크롤링 실패 시에도 기본 메뉴 정보는 반환되며, `isDownloaded: false`로 표시됩니다.

5. **행복기숙사 특별 처리**: 행복기숙사는 별도의 크롤링 로직과 저장 경로를 사용합니다.

6. **데이터베이스 의존성**: 모든 API는 데이터베이스 연결이 필요하며, 연결 실패 시 적절한 에러 메시지를 반환합니다.

7. **기존 API 호환성**: 기존 API 구조를 유지하여 클라이언트 호환성을 보장합니다.

---

*Last Updated: 2025-06-06*