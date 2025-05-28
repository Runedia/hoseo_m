# Notice API Documentation

호서대학교 공지사항 관련 REST API 문서입니다.

## Base URL
```
/notice
```

## 개요

호서대학교 공지사항 정보를 제공하는 API입니다.
- 자동 크롤링 및 다운로드 기능 지원
- 이미지 및 첨부파일 자동 처리
- 카테고리별 분류 및 검색 기능 제공
- 페이징 기능 지원

## 주요 카테고리

| Category Code | 이름 | 설명 |
|---------------|------|------|
| `CTG_17082400011` | 일반공지 | 기본 공지사항 카테고리 |
| 기타 카테고리 | 다양한 분류 | `/notice/types`에서 전체 목록 확인 가능 |

---

## API Endpoints

### 1. 공지사항 목록 조회 (페이징)

전체 공지사항 목록을 최신순으로 페이징하여 조회합니다.

**Endpoint:** `GET /notice/list`

#### Request Parameters (Query String)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | ❌ | 1 | 페이지 번호 |
| `pageSize` | number | ❌ | 20 | 페이지당 항목 수 |

#### Example Request
```bash
GET /notice/list?page=1&pageSize=10
```

#### Success Response (200)
```json
[
  {
    "idx": 12345,
    "type": "CTG_17082400011",
    "chidx": 89756,
    "title": "2025학년도 1학기 수강신청 안내",
    "author": "학사팀",
    "create_dt": "2025-01-15T00:00:00.000Z"
  },
  {
    "idx": 12344,
    "type": "CTG_17082400011",
    "chidx": 89755,
    "title": "코로나19 방역지침 안내",
    "author": "보건센터",
    "create_dt": "2025-01-14T00:00:00.000Z"
  }
]
```

#### Error Response (500)
```json
{
  "error": "Database connection error",
  "details": {
    "sql": "SELECT idx, type, chidx, title, author, create_dt FROM tbl_notice ORDER BY chidx DESC LIMIT ? OFFSET ?",
    "parameters": ["10", "0"],
    "errno": 1234,
    "sqlState": "42000"
  }
}
```

---

### 2. 공지사항 상세 조회 (자동 다운로드)

특정 공지사항의 상세 내용을 조회합니다. 파일이 없으면 자동으로 크롤링하여 다운로드합니다.

**Endpoint:** `GET /notice/idx/:chidx`

#### Request Parameters (Path)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `chidx` | number | ✅ | 공지사항 고유 번호 |

#### Example Request
```bash
GET /notice/idx/89756
```

#### Success Response (200)
```json
{
  "idx": 12345,
  "type": "CTG_17082400011",
  "chidx": 89756,
  "title": "2025학년도 1학기 수강신청 안내",
  "author": "학사팀",
  "create_dt": "2025-01-15T00:00:00.000Z",
  "download_completed": 1,
  "download_date": "2025-01-15T10:30:00.000Z",
  "download_error": null,
  "content": "download_notice/89756/89756.html",
  "assets": [
    {
      "localPath": "download_notice/89756/수강신청_일정표.jpg",
      "fileName": "수강신청_일정표.jpg"
    }
  ],
  "attachments": [
    {
      "originUrl": "http://www.hoseo.ac.kr/File/Download.do?file=guide.pdf",
      "originName": "수강신청가이드.pdf",
      "localPath": "download_notice/89756/수강신청가이드.pdf",
      "fileName": "수강신청가이드.pdf"
    }
  ],
  "isDownloaded": true
}
```

#### 자동 다운로드 프로세스

1. **파일 존재 확인**: JSON 파일이 있는지 확인
2. **자동 크롤링**: 파일이 없으면 해당 공지사항 페이지 크롤링
3. **이미지 처리**: 공지사항 내 이미지 다운로드 및 경로 수정
4. **첨부파일 처리**: PDF 등 첨부파일 다운로드
5. **DB 업데이트**: 다운로드 상태 및 파일 정보 저장

#### Error Response (404)
```json
{
  "error": "공지사항을 찾을 수 없습니다."
}
```

---

### 3. 카테고리별 공지사항 조회

특정 카테고리의 공지사항 목록을 조회합니다.

**Endpoint:** `GET /notice/type/:type`

#### Request Parameters (Path & Query String)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `type` | string | ✅ | - | 카테고리 코드 |
| `page` | number | ❌ | 1 | 페이지 번호 |
| `pageSize` | number | ❌ | 20 | 페이지당 항목 수 |

#### Example Request
```bash
GET /notice/type/CTG_17082400011?page=1&pageSize=5
```

#### Success Response (200)
```json
[
  {
    "idx": 12345,
    "type": "CTG_17082400011",
    "chidx": 89756,
    "title": "2025학년도 1학기 수강신청 안내",
    "author": "학사팀",
    "create_dt": "2025-01-15T00:00:00.000Z"
  }
]
```

---

### 4. 카테고리 목록 조회

사용 가능한 모든 공지사항 카테고리 목록을 조회합니다.

**Endpoint:** `GET /notice/types`

#### Example Request
```bash
GET /notice/types
```

#### Success Response (200)
```json
[
  {
    "idx": 1,
    "code": "CTG_17082400011",
    "name": "일반공지",
    "description": "일반적인 공지사항",
    "sort_order": 1,
    "is_active": 1
  },
  {
    "idx": 2,
    "code": "CTG_17082400012",
    "name": "학사공지",
    "description": "학사 관련 공지사항",
    "sort_order": 2,
    "is_active": 1
  }
]
```

---

### 5. 공지사항 검색

제목, 작성자, 카테고리별로 공지사항을 검색합니다.

**Endpoint:** `GET /notice/search`

#### Request Parameters (Query String)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `title` | string | ❌ | - | 제목 검색어 (부분 일치) |
| `author` | string | ❌ | - | 작성자 검색어 (부분 일치) |
| `type` | string | ❌ | `CTG_17082400011` | 카테고리 코드 |
| `page` | number | ❌ | 1 | 페이지 번호 |
| `pageSize` | number | ❌ | 20 | 페이지당 항목 수 |

#### Example Request
```bash
GET /notice/search?title=수강신청&author=학사팀&type=CTG_17082400011&page=1&pageSize=10
```

#### Success Response (200)
```json
[
  {
    "idx": 12345,
    "type": "CTG_17082400011",
    "chidx": 89756,
    "title": "2025학년도 1학기 수강신청 안내",
    "author": "학사팀",
    "create_dt": "2025-01-15T00:00:00.000Z"
  }
]
```

---

## 데이터 구조

### Notice 기본 정보

| Field | Type | Description |
|-------|------|-------------|
| `idx` | number | DB 인덱스 |
| `type` | string | 카테고리 코드 |
| `chidx` | number | 공지사항 고유 번호 |
| `title` | string | 공지사항 제목 |
| `author` | string | 작성자 |
| `create_dt` | datetime | 생성일시 |
| `download_completed` | number | 다운로드 완료 여부 (0/1) |
| `download_date` | datetime | 다운로드 완료 시간 |
| `download_error` | string | 다운로드 오류 메시지 |

### Content 정보 (상세 조회 시)

| Field | Type | Description |
|-------|------|-------------|
| `content` | string | HTML 파일 경로 |
| `assets` | array | 이미지 파일 목록 |
| `attachments` | array | 첨부파일 목록 |
| `isDownloaded` | boolean | 다운로드 완료 여부 |

### Asset 구조

```json
{
  "localPath": "download_notice/89756/image.jpg",
  "fileName": "image.jpg"
}
```

### Attachment 구조

```json
{
  "originUrl": "http://www.hoseo.ac.kr/File/Download.do?file=document.pdf",
  "originName": "공지문서.pdf",
  "localPath": "download_notice/89756/공지문서.pdf",
  "fileName": "공지문서.pdf"
}
```

### Notice Type 구조

```json
{
  "idx": 1,
  "code": "CTG_17082400011",
  "name": "일반공지",
  "description": "일반적인 공지사항",
  "sort_order": 1,
  "is_active": 1
}
```

---

## 파일 다운로드 경로

### 공지사항 파일 구조
```
download_notice/{chidx}/
├── {chidx}.html              # 공지사항 HTML 내용
├── {chidx}_detail.json       # 메타데이터
├── {이미지파일명}.jpg         # 다운로드된 이미지들
└── {첨부파일명}.pdf          # 다운로드된 첨부파일들
```

### 예시
```
download_notice/89756/
├── 89756.html                # 공지사항 본문
├── 89756_detail.json         # JSON 메타데이터
├── 수강신청_일정표.jpg        # 이미지 파일
└── 수강신청가이드.pdf         # 첨부파일
```

---

## 에러 코드

| HTTP Status | Error Type | Description |
|-------------|------------|-------------|
| 404 | Not Found | 공지사항을 찾을 수 없음 |
| 500 | Internal Server Error | 서버 내부 오류, DB 연결 실패, 다운로드 실패 등 |

---

## 사용 예시

### 1. 최신 공지사항 10개 조회
```bash
curl "http://localhost:3000/notice/list?page=1&pageSize=10"
```

### 2. 특정 공지사항 상세 내용 조회 (자동 다운로드)
```bash
curl "http://localhost:3000/notice/idx/89756"
```

### 3. 일반공지 카테고리의 공지사항 조회
```bash
curl "http://localhost:3000/notice/type/CTG_17082400011?page=1&pageSize=5"
```

### 4. 카테고리 목록 확인
```bash
curl "http://localhost:3000/notice/types"
```

### 5. "수강신청" 키워드로 공지사항 검색
```bash
curl "http://localhost:3000/notice/search?title=수강신청&page=1&pageSize=10"
```

### 6. 특정 작성자의 공지사항 검색
```bash
curl "http://localhost:3000/notice/search?author=학사팀&type=CTG_17082400011"
```

### 7. 복합 검색 (제목 + 작성자 + 카테고리)
```bash
curl "http://localhost:3000/notice/search?title=안내&author=학사팀&type=CTG_17082400011&page=1&pageSize=5"
```

---

## 주요 기능

### 🔄 **자동 다운로드**
- 상세 조회 시 해당 공지사항이 처음 요청되면 자동으로 크롤링 실행
- 이미지 및 첨부파일 자동 다운로드 및 로컬 저장
- 실패 시에도 기본 공지사항 정보는 반환

### 📁 **파일 관리**
- HTML 본문, 이미지, 첨부파일을 체계적으로 분류 저장
- JSON 메타데이터로 파일 정보 관리
- 로컬 파일시스템 기반 캐싱

### 🔍 **검색 기능**
- 제목, 작성자, 카테고리별 검색 지원
- 부분 일치 검색 (LIKE 연산)
- 복합 검색 조건 지원

### 📄 **페이징**
- 모든 목록 API에서 페이징 지원
- 사용자 정의 페이지 크기 설정 가능
- 최신순 정렬

---

## 주의사항

1. **자동 다운로드**: 상세 조회 시 해당 공지사항이 처음 요청되면 크롤링이 실행되어 응답 시간이 길어질 수 있습니다.

2. **파일 저장 위치**: 다운로드된 파일들은 서버의 로컬 파일시스템에 저장됩니다.

3. **캐싱**: 한 번 다운로드된 공지사항은 로컬에 캐시되어 이후 요청 시 빠르게 응답됩니다.

4. **검색 기본값**: 검색 API에서 `type` 파라미터를 지정하지 않으면 기본적으로 `CTG_17082400011` 카테고리에서 검색됩니다.

5. **에러 핸들링**: 크롤링 실패 시에도 기본 공지사항 정보는 반환되며, `isDownloaded: false`로 표시됩니다.

---

*Last Updated: 2025-05-29*
