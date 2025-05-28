# 메뉴 API 문서

## 목차
- [메뉴 목록 조회](#메뉴-목록-조회)
- [메뉴 상세 조회](#메뉴-상세-조회)
- [액션 목록 조회](#액션-목록-조회)
- [메뉴 검색](#메뉴-검색)

## 메뉴 목록 조회

메뉴 목록을 페이지네이션으로 조회합니다.

### 요청

```
GET /menu/list?page=1&pageSize=20&action={action}
```

### 파라미터

| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|---------|------|------|------|------|
| page | number | 아니오 | 페이지 번호 (기본값: 1) | 1 |
| pageSize | number | 아니오 | 페이지당 항목 수 (기본값: 20) | 20 |
| action | string | 예 | 메뉴 타입 (필수) | MAPP_2312012408 (천안), MAPP_2312012409 (아산), MAPP_2312012410 (당진), HAPPY_DORM_NUTRITION (행복기숙사) |

### 응답 예시

```json
[
  {
    "idx": 1,
    "type": "MAPP_2312012408",
    "chidx": "123",
    "title": "5월 3주차 식단",
    "author": "관리자",
    "create_dt": "2023-05-15T00:00:00.000Z"
  },
  ...
]
```

## 메뉴 상세 조회

특정 메뉴의 상세 내용을 조회합니다. 필요한 경우 자동으로 메뉴 내용을 다운로드합니다.

### 요청

```
GET /menu/idx/{chidx}/{action}
```

### 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| chidx | string | 예 | 메뉴 고유 식별자 |
| action | string | 예 | 메뉴 타입 |

### 응답 예시

```json
{
  "idx": 1,
  "type": "MAPP_2312012408",
  "chidx": "123",
  "title": "5월 3주차 식단",
  "author": "관리자",
  "create_dt": "2023-05-15T00:00:00.000Z",
  "content": "<div>메뉴 상세 내용...</div>",
  "assets": [],
  "attachments": [
    {
      "file_type": "pdf",
      "file_name": "menu_123.pdf",
      "origin_name": "5월3주차_식단표.pdf",
      "file_path": "/download_menu/123/menu_123.pdf",
      "file_url": "https://example.com/download_menu/123/menu_123.pdf"
    }
  ],
  "isDownloaded": true,
  "downloadPath": "download_menu"
}
```

## 액션 목록 조회

사용 가능한 액션(메뉴 타입) 목록을 조회합니다.

### 요청

```
GET /menu/actions
```

### 응답 예시

```json
[
  {
    "action": "MAPP_2312012408",
    "name": "천안",
    "category": "general"
  },
  {
    "action": "MAPP_2312012409",
    "name": "아산",
    "category": "general"
  },
  {
    "action": "MAPP_2312012410",
    "name": "당진",
    "category": "general"
  },
  {
    "action": "HAPPY_DORM_NUTRITION",
    "name": "행복기숙사",
    "category": "happy_dorm"
  }
]
```

## 메뉴 검색

메뉴를 검색합니다.

### 요청

```
GET /menu/search?title={제목}&author={작성자}&action={액션}&page=1&pageSize=20
```

### 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| title | string | 아니오 | 제목 검색어 |
| author | string | 아니오 | 작성자 검색어 |
| action | string | 아니오 | 메뉴 타입 필터링 |
| page | number | 아니오 | 페이지 번호 (기본값: 1) |
| pageSize | number | 아니오 | 페이지당 항목 수 (기본값: 20) |

### 응답 예시

```json
{
  "total": 42,
  "page": 1,
  "pageSize": 20,
  "data": [
    {
      "idx": 1,
      "type": "MAPP_2312012408",
      "chidx": "123",
      "title": "5월 3주차 식단",
      "author": "관리자",
      "create_dt": "2023-05-15T00:00:00.000Z"
    },
    ...
  ]
}
```

### 에러 응답

에러가 발생한 경우 다음 형식으로 응답합니다.

```json
{
  "error": "에러 메시지",
  "details": {
    "sql": "실행된 SQL 쿼리",
    "parameters": ["파라미터1", "파라미터2"],
    "errno": "에러 번호",
    "sqlState": "SQL 상태 코드"
  }
}
```

## 메뉴 타입 안내

| action | 설명 | 카테고리 |
|--------|------|----------|
| MAPP_2312012408 | 천안 캠퍼스 | general |
| MAPP_2312012409 | 아산 캠퍼스 | general |
| MAPP_2312012410 | 당진 캠퍼스 | general |
| HAPPY_DORM_NUTRITION | 행복기숙사 | happy_dorm |
