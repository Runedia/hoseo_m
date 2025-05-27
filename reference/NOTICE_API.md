# Notice REST API 가이드

- **Base URL:** `http://rukeras.com:3000/notice`

## 목차
- [공지 목록 조회](#공지-목록-조회)
- [공지 상세 조회](#공지-상세-조회)
- [카테고리별 공지 목록](#카테고리별-공지-목록)
- [카테고리 목록 조회](#카테고리-목록-조회)
- [공지 검색](#공지-검색)

## 공지 목록 조회 (페이징)
공지사항 목록을 페이징 처리하여 조회합니다.

- **GET** `http://rukeras.com:3000/notice/list`
- **Query Parameters:**
  - `page` (integer, optional, default: 1): 페이지 번호
  - `pageSize` (integer, optional, default: 20): 한 페이지당 항목 수

**예시 요청:**
```
GET http://rukeras.com:3000/notice/list?page=1&pageSize=10
```

**응답 예시:**
```json
[
  {
    "idx": 1,
    "type": "CTG_17082400011",
    "chidx": 12345,
    "title": "공지사항 제목",
    "author": "작성자",
    "create_dt": "2023-01-01T00:00:00.000Z"
  }
]
```

---

## 공지 상세 조회
특정 공지의 상세 내용을 조회합니다.

- **GET** `http://rukeras.com:3000/notice/idx/{chidx}`
- **Path Parameter:**
  - `chidx` (integer, required): 공지 고유 식별자

**예시 요청:**
```
GET http://rukeras.com:3000/notice/idx/12345
```

**응답 예시:**
```json
{
  "idx": 1,
  "type": "CTG_17082400011",
  "chidx": 12345,
  "title": "공지사항 제목",
  "author": "작성자",
  "create_dt": "2023-01-01T00:00:00.000Z",
  "content": "공지사항 상세 내용...",
  "assets": [
    {
      "type": "image",
      "url": "http://example.com/image.jpg",
      "alt": "이미지 설명"
    }
  ],
  "attachments": [
    {
      "file_type": "pdf",
      "file_name": "file123.pdf",
      "origin_name": "공지파일.pdf",
      "file_path": "/path/to/file",
      "file_url": "http://rukeras.com:3000/files/file123.pdf"
    }
  ],
  "isDownloaded": true
}
```

---

## 카테고리별 공지 목록 조회
특정 카테고리의 공지사항 목록을 조회합니다.

- **GET** `http://rukeras.com:3000/notice/type/{type}`
- **Path Parameter:**
  - `type` (string, required): 카테고리 ID
- **Query Parameters:**
  - `page` (integer, optional, default: 1): 페이지 번호
  - `pageSize` (integer, optional, default: 20): 한 페이지당 항목 수

**예시 요청:**
```
GET http://rukeras.com:3000/notice/type/CTG_17082400011?page=1&pageSize=10
```

**응답 예시:**
```json
[
  {
    "idx": 1,
    "type": "CTG_17082400011",
    "chidx": 12345,
    "title": "카테고리별 공지 제목",
    "author": "작성자",
    "create_dt": "2023-01-01T00:00:00.000Z"
  }
]
```

---

## 카테고리 목록 조회
사용 가능한 카테고리 목록을 조회합니다.

- **GET** `http://rukeras.com:3000/notice/types`

**예시 요청:**
```
GET http://rukeras.com:3000/notice/types
```

**응답 예시:**
```json
[
  {
    "type": "CTG_17082400011",
    "name": "일반공지"
  },
  {
    "type": "CTG_17082400012",
    "name": "학사공지"
  }
]
```

---

## 공지 검색
제목, 작성자, 카테고리로 공지사항을 검색합니다. 모든 검색 조건은 AND 연산으로 결합되며, 검색어가 없는 경우 해당 조건은 무시됩니다.

- **GET** `http://rukeras.com:3000/notice/search`
- **Query Parameters:**
  - `title` (string, optional): 제목 검색어
  - `author` (string, optional): 작성자 검색어
  - `type` (string, optional, default: CTG_17082400011): 카테고리 ID
  - `page` (integer, optional, default: 1): 페이지 번호
  - `pageSize` (integer, optional, default: 20): 한 페이지당 항목 수

**예시 요청:**
```
GET http://rukeras.com:3000/notice/search?title=테스트&author=홍길동&type=CTG_17082400011&page=1&pageSize=10
```

**응답 예시:**
```json
[
  {
    "idx": 1,
    "type": "CTG_17082400011",
    "chidx": 12345,
    "title": "검색된 공지사항",
    "author": "작성자",
    "create_dt": "2023-01-01T00:00:00.000Z"
  }
]
```

### 에러 응답
모든 API는 오류 발생 시 다음과 같은 형식으로 응답할 수 있습니다.

```json
{
  "error": "에러 메시지",
  "details": {
    "sql": "실행된 SQL 쿼리",
    "parameters": ["파라미터1", "파라미터2"],
    "errno": 1064,
    "sqlState": "42000"
  }
}
```

### 주의사항
- 모든 날짜는 ISO 8601 형식(UTC)으로 반환됩니다.
- 페이징 파라미터를 지정하지 않으면 기본값이 적용됩니다.
- 검색 시 여러 조건을 조합하여 사용할 수 있습니다.
- `/notice/idx/{chidx}` 엔드포인트는 최초 요청 시 자동으로 공지사항 상세 내용을 다운로드하여 저장합니다.
- `isDownloaded` 필드는 해당 공지사항의 상세 내용이 로컬에 다운로드되어 있는지 여부를 나타냅니다.
