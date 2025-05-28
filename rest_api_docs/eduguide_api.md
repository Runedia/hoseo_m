# Eduguide API Documentation

호서대학교 학사정보 관련 REST API 문서입니다.

## Base URL
```
/eduguide
```

## 개요

호서대학교 학사일정 정보를 제공하는 API입니다.
- 자동 크롤링 및 HTML 생성 기능 지원
- HTML과 JSON 형태 데이터 제공
- 날짜, 월, 연도별 필터링 기능 지원
- 자동 파싱 및 헬퍼 함수 생성

## 데이터 소스

호서대학교 공식 홈페이지에서 학사정보를 크롤링하여 데이터를 구성합니다.

---

## API Endpoints

### 1. 학사일정 HTML 조회

학사일정을 HTML 형태로 조회합니다. 파일이 없으면 자동으로 크롤링하여 생성합니다.

**Endpoint:** `GET /eduguide/calendar`

#### Request Parameters
없음

#### Example Request
```bash
GET /eduguide/calendar
```

#### Success Response (200)
```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>호서대학교 2025학년도 학사일정</title>
  <!-- CSS 파일들 -->
  <link href="/assets/css/resources_css_korean_style_ver_1.2.css" rel="stylesheet" type="text/css" />
  <style>
      /* 추가 스타일링 */
      body {
          font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 20px;
          background-color: #f5f5f5;
      }
  </style>
</head>
<body>
    <div class="container">
      <!-- 학사일정 본문 -->
      <div class="sub-step">
        <h3>2025학년도 학사일정</h3>
        <div id="academic_scd01" class="">
          <ul>
            <li>
              <div class="sc_month">
                <div class="month-box">
                  <p class="box-month">1월</p>
                  <p class="box-year"> January </p>
                </div>
              </div>
              <div class="list-inner">
                <div class="list-box">
                  <p class="list-date"> <em class=""> 2(목)</em> </p>
                  <p class="list-content"> 신년예배 및 하례식</p>
                </div>
                <!-- 더 많은 일정들... -->
              </div>
            </li>
            <!-- 더 많은 월들... -->
          </ul>
        </div>
      </div>
    </div>
</body>
</html>
```

#### Headers
```
Content-Type: text/html; charset=utf-8
```

#### 자동 생성 프로세스

1. **파일 존재 확인**: `assets/학사일정.html` 파일 확인
2. **자동 크롤링**: 파일이 없으면 호서대 홈페이지에서 크롤링
3. **HTML 생성**: CSS 스타일과 함께 완전한 HTML 파일 생성
4. **JSON 파싱**: HTML 생성 후 자동으로 JSON 변환 실행
5. **헬퍼 함수 생성**: 인덱스 및 보조 함수 생성

#### Error Response (500)
```json
{
  "error": "학사일정을 불러오는 중 오류가 발생했습니다.",
  "details": "크롤링 오류 메시지"
}
```

---

### 2. 학사일정 JSON 조회 (필터링 지원)

학사일정을 JSON 형태로 조회합니다. 다양한 필터링 옵션을 제공합니다.

**Endpoint:** `GET /eduguide/calendar/json`

#### Request Parameters (Query String)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `date` | string | ❌ | - | 특정 날짜 (YYYY-MM-DD) |
| `month` | string | ❌ | - | 특정 월 (YYYY-MM) |
| `year` | number | ❌ | - | 특정 연도 (YYYY) |
| `limit` | number | ❌ | - | 결과 개수 제한 |

#### Example Requests
```bash
# 전체 학사일정 조회
GET /eduguide/calendar/json

# 특정 날짜 일정 조회
GET /eduguide/calendar/json?date=2025-03-01

# 특정 월 일정 조회
GET /eduguide/calendar/json?month=2025-03

# 특정 연도 일정 조회
GET /eduguide/calendar/json?year=2025

# 최근 10개 일정 조회
GET /eduguide/calendar/json?limit=10

# 복합 필터링 (2025년 3월 최근 5개)
GET /eduguide/calendar/json?month=2025-03&limit=5
```

#### Success Response (200)
```json
{
  "title": "호서대학교 2025학년도 학사일정",
  "generatedAt": "2025-05-28T18:00:37.784Z",
  "events": [
    {
      "date": "2025-01-02",
      "dateOriginal": "2(목)",
      "event": "신년예배 및 하례식",
      "month": "1월",
      "monthNumber": 1,
      "year": 2025
    },
    {
      "date": "2025-01-06",
      "dateOriginal": "6(월) ~ 10(금)",
      "event": "1학기 복학원서 접수 기간",
      "month": "1월",
      "monthNumber": 1,
      "year": 2025
    },
    {
      "date": "2025-03-04",
      "dateOriginal": "4(화)",
      "event": "2025학년도 1학기 개강",
      "month": "3월",
      "monthNumber": 3,
      "year": 2025
    }
  ],
  "filtered": {
    "totalCount": 45,
    "originalCount": 218,
    "filters": {
      "date": null,
      "month": "2025-03",
      "year": null,
      "limit": null
    }
  },
  "statistics": {
    "totalEvents": 218,
    "eventsByMonth": {
      "2025-01": 6,
      "2025-02": 46,
      "2025-03": 1,
      "2025-04": 5,
      "2025-05": 1,
      "2025-06": 63,
      "2025-07": 5,
      "2025-08": 15,
      "2025-09": 3,
      "2025-10": 3,
      "2025-11": 1,
      "2025-12": 63,
      "2026-01": 6
    },
    "dateRange": {
      "start": "2025-01-01",
      "end": "2026-01-09"
    }
  }
}
```

#### 자동 생성 프로세스

1. **JSON 파일 확인**: `assets/학사일정.json` 파일 존재 여부 확인
2. **HTML 파일 확인**: JSON이 없으면 HTML 파일 존재 여부 확인
3. **HTML 생성**: HTML 파일이 없으면 먼저 크롤링하여 생성
4. **JSON 파싱**: HTML에서 학사일정 데이터 추출 및 JSON 변환
5. **헬퍼 함수 생성**: 인덱스 파일 및 통계 데이터 생성

#### Error Response (500)
```json
{
  "error": "학사일정 JSON을 불러오는 중 오류가 발생했습니다.",
  "details": "파싱 오류 메시지",
  "suggestion": "잠시 후 다시 시도하거나 관리자에게 문의하세요."
}
```

---

## 데이터 구조

### 전체 응답 구조

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | 학사일정 제목 |
| `generatedAt` | datetime | 생성 시간 |
| `events` | array | 학사일정 배열 |
| `filtered` | object | 필터링 정보 |
| `statistics` | object | 통계 정보 |

### Event 구조

| Field | Type | Description |
|-------|------|-------------|
| `date` | string | 날짜 (YYYY-MM-DD) |
| `dateOriginal` | string | 원본 날짜 표현 (예: "2(목)", "6(월) ~ 10(금)") |
| `event` | string | 일정 내용 |
| `month` | string | 월 (한글, 예: "1월", "3월") |
| `monthNumber` | number | 월 (숫자) |
| `year` | number | 연도 |

### Filtered 구조

| Field | Type | Description |
|-------|------|-------------|
| `totalCount` | number | 필터링된 결과 개수 |
| `originalCount` | number | 전체 일정 개수 |
| `filters` | object | 적용된 필터 값들 |

### Statistics 구조

| Field | Type | Description |
|-------|------|-------------|
| `totalEvents` | number | 전체 일정 개수 |
| `eventsByMonth` | object | 월별 일정 개수 |
| `dateRange` | object | 일정 날짜 범위 (start, end) |

---

## 필터링 기능

### 1. 날짜별 필터링
```bash
# 특정 날짜의 일정만 조회
GET /eduguide/calendar/json?date=2025-03-01
```

### 2. 월별 필터링
```bash
# 특정 월의 모든 일정 조회
GET /eduguide/calendar/json?month=2025-03
```

### 3. 연도별 필터링
```bash
# 특정 연도의 모든 일정 조회
GET /eduguide/calendar/json?year=2025
```

### 4. 개수 제한
```bash
# 최신 일정 N개만 조회
GET /eduguide/calendar/json?limit=10
```

### 5. 복합 필터링
```bash
# 2025년 3월 일정 중 최근 5개
GET /eduguide/calendar/json?month=2025-03&limit=5

# 2025년 일정 중 최근 20개
GET /eduguide/calendar/json?year=2025&limit=20
```

---

## 사용 예시

### 1. 학사일정 HTML 페이지 접근
```bash
curl "http://localhost:3000/eduguide/calendar"
```

### 2. 전체 학사일정 JSON 조회
```bash
curl "http://localhost:3000/eduguide/calendar/json"
```

### 3. 개강날 찾기
```bash
curl "http://localhost:3000/eduguide/calendar/json?date=2025-03-03"
```

### 4. 3월 모든 학사일정 조회
```bash
curl "http://localhost:3000/eduguide/calendar/json?month=2025-03"
```

### 5. 최근 학사일정 10개 조회
```bash
curl "http://localhost:3000/eduguide/calendar/json?limit=10"
```

---

## 에러 코드

| HTTP Status | Error Type | Description |
|-------------|------------|-------------|
| 500 | Internal Server Error | 크롤링 실패, 파싱 오류, 파일 I/O 오류 등 |

---

## 자동 크롤링 및 업데이트

### 크롤링 조건
- HTML 파일이 존재하지 않을 때
- JSON 파일이 존재하지 않을 때
- 수동으로 파일을 삭제한 후 첫 요청 시

### 업데이트 주기
- 자동 업데이트는 지원하지 않음
- 필요 시 `assets/학사일정.html`, `assets/학사일정.json` 파일 삭제 후 API 호출

### 크롤링 프로세스
1. 호서대학교 공식 홈페이지 접속
2. 학사일정 페이지 HTML 다운로드
3. CSS 스타일 파일들 다운로드
4. 상대 경로를 절대 경로로 변경
5. 완전한 HTML 파일 생성
6. HTML 파싱하여 JSON 데이터 생성
7. 통계 및 인덱스 데이터 생성

---

## 주의사항

1. **초기 로딩 시간**: 처음 요청 시 크롤링이 실행되어 응답 시간이 길어질 수 있습니다.

2. **데이터 신뢰성**: 호서대학교 공식 홈페이지의 구조 변경 시 크롤링이 실패할 수 있습니다.

3. **캐싱**: 한 번 생성된 파일은 수동으로 삭제하기 전까지 재사용됩니다.

4. **필터링 성능**: 대량의 학사일정 데이터에서 필터링이 수행되므로 적절한 필터 조건 사용을 권장합니다.

5. **날짜 형식**: 모든 날짜는 YYYY-MM-DD 형식을 사용합니다.

---

*Last Updated: 2025-05-29*