# Eduguide API Documentation

호서대학교 학사정보 관련 REST API 문서입니다.

## Base URL
```
/eduguide
```

## 개요

호서대학교 학사정보를 제공하는 통합 API입니다.
- **학사일정**: 연간 학사일정 정보
- **교육과정**: 기본, 부전공, 복수전공 교육과정 정보  
- **수업**: 수강신청, 계절학기, 출결사항 정보
- **학적**: 시험, 평가, 학사경고, 전공변경 정보

## 특징

- 자동 크롤링 및 JSON 생성 기능
- 구조화된 데이터 제공 (중첩/계층 구조)
- 타입별 맞춤 데이터 제공
- 자동 제외 기능 지원 (특정 항목 필터링)

## 데이터 소스

호서대학교 공식 홈페이지에서 최신 정보를 크롤링하여 구성합니다.

---

# API Endpoints

## 학사일정 API

### 학사일정 조회

학사일정을 JSON 형태로 조회합니다.

**Endpoint:** `GET /eduguide/calendar`

#### Request Parameters
없음

#### Example Request
```bash
GET /eduguide/calendar
```

#### Success Response (200)
```json
{
  "title": "호서대학교 학사일정",
  "generatedAt": "2025-05-30T12:00:00.000Z",
  "description": "년도 > 월 > 일 > 이벤트번호 구조",
  "data": {
    "2025": {
      "1": {
        "2": {
          "1": "신년예배 및 하례식"
        },
        "6": {
          "1": "1학기 복학원서 접수 기간 시작"
        }
      },
      "3": {
        "4": {
          "1": "2025학년도 1학기 개강"
        }
      }
    }
  }
}
```

---

## 교육과정 API

### 교육과정 조회

교육과정 정보를 조회합니다.

**Endpoint:** `GET /eduguide/curriculum`

#### Request Parameters (Query String)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `type` | string | ❌ | `basic` | 교육과정 타입 (`basic`, `minor`, `double`) |

#### Example Requests
```bash
# 기본 교육과정 조회
GET /eduguide/curriculum

# 기본 교육과정 조회 (명시적)
GET /eduguide/curriculum?type=basic

# 부전공 교육과정 조회
GET /eduguide/curriculum?type=minor

# 복수전공 교육과정 조회
GET /eduguide/curriculum?type=double
```

#### Success Response (200)
```json
{
  "title": "호서대학교 교육과정",
  "type": "basic",
  "generatedAt": "2025-05-30T12:00:00.000Z",
  "description": "섹션 > 텍스트 및 하위 내용 구조",
  "data": {
    "1": {
      "text": "교육과정 편성 원칙",
      "children": {
        "1": "대학의 교육목표와 인재상에 부합하는 교육과정 편성",
        "2": "학문의 체계성과 연계성을 고려한 교육과정 구성"
      }
    },
    "2": {
      "text": "전공교육과정",
      "children": {
        "1": "전공기초과목",
        "2": "전공필수과목",
        "3": "전공선택과목"
      }
    }
  }
}
```

### 교육과정 타입 목록 조회

사용 가능한 교육과정 타입 목록을 조회합니다.

**Endpoint:** `GET /eduguide/curriculum/types`

#### Success Response (200)
```json
{
  "title": "호서대학교 교육과정 타입 목록",
  "generatedAt": "2025-05-30T12:00:00.000Z",
  "totalTypes": 3,
  "types": [
    {
      "type": "basic",
      "name": "교육과정",
      "description": "기본 교육과정",
      "url": "http://www.hoseo.ac.kr/Home/Contents.mbz?action=MAPP_1708290175",
      "fileName": "교육과정"
    },
    {
      "type": "minor",
      "name": "부전공",
      "description": "부전공 교육과정",
      "url": "http://www.hoseo.ac.kr/Home/Contents.mbz?action=MAPP_1708230089",
      "fileName": "교육과정_부전공"
    },
    {
      "type": "double",
      "name": "복수전공",
      "description": "복수전공 교육과정",
      "url": "http://www.hoseo.ac.kr/Home/Contents.mbz?action=MAPP_1708230090",
      "fileName": "교육과정_복수전공"
    }
  ],
  "usage": {
    "basicApi": "/eduguide/curriculum?type=basic"
  }
}
```

---

## 수업 API

### 수업 정보 조회

수업 관련 정보를 조회합니다.

**Endpoint:** `GET /eduguide/class`

#### Request Parameters (Query String)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `type` | string | ❌ | `regist` | 수업 타입 (`regist`, `season`, `attendance`) |

#### Example Requests
```bash
# 수강신청 정보 조회
GET /eduguide/class

# 수강신청 정보 조회 (명시적)
GET /eduguide/class?type=regist

# 계절학기 정보 조회
GET /eduguide/class?type=season

# 출결사항점검 정보 조회
GET /eduguide/class?type=attendance
```

#### Success Response (200)
```json
{
  "title": "호서대학교 수강신청",
  "type": "regist",
  "generatedAt": "2025-05-30T12:00:00.000Z",
  "description": "섹션 > 텍스트 및 하위 내용 구조",
  "data": {
    "1": {
      "text": "수강신청 안내",
      "children": {
        "1": "수강신청 기간 및 방법",
        "2": "수강신청 유의사항"
      }
    },
    "2": {
      "text": "수강신청 절차",
      "children": {
        "1": "로그인 후 수강신청 메뉴 접속",
        "2": "희망 강좌 검색 및 선택"
      }
    }
  }
}
```

### 수업 타입 목록 조회

사용 가능한 수업 타입 목록을 조회합니다.

**Endpoint:** `GET /eduguide/class/types`

#### Success Response (200)
```json
{
  "title": "호서대학교 수업 타입 목록",
  "generatedAt": "2025-05-30T12:00:00.000Z",
  "totalTypes": 3,
  "types": [
    {
      "type": "regist",
      "name": "수강신청",
      "description": "수강신청",
      "url": "http://www.hoseo.ac.kr/Home/Contents.mbz?action=MAPP_1708230095",
      "fileName": "수강신청"
    },
    {
      "type": "season",
      "name": "계절학기",
      "description": "계절학기",
      "url": "http://www.hoseo.ac.kr/Home/Contents.mbz?action=MAPP_1708230098",
      "fileName": "계절학기"
    },
    {
      "type": "attendance",
      "name": "학생출결사항점검",
      "description": "학생출결사항점검",
      "url": "http://www.hoseo.ac.kr/Home/Contents.mbz?action=MAPP_1708230097",
      "fileName": "학생출결사항점검"
    }
  ],
  "usage": {
    "basicApi": "/eduguide/class?type=regist"
  }
}
```

---

## 학적 API

### 학적 정보 조회

학적 관련 정보를 조회합니다.

**Endpoint:** `GET /eduguide/record`

#### Request Parameters (Query String)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `type` | string | ❌ | `test` | 학적 타입 (`test`, `evaluation`, `warning`, `change_major`) |

#### Example Requests
```bash
# 시험 정보 조회
GET /eduguide/record

# 시험 정보 조회 (명시적)
GET /eduguide/record?type=test

# 평가 정보 조회 (평균 성적산출 항목 자동 제외)
GET /eduguide/record?type=evaluation

# 학사경고 정보 조회
GET /eduguide/record?type=warning

# 전공변경 정보 조회
GET /eduguide/record?type=change_major
```

#### Success Response (200)
```json
{
  "title": "호서대학교 평가",
  "type": "evaluation",
  "generatedAt": "2025-05-30T12:00:00.000Z",
  "description": "섹션 > 텍스트 및 하위 내용 구조",
  "data": {
    "1": {
      "text": "학업성취도 평가",
      "children": {
        "1": "평가 기준 및 방법",
        "2": "성적 평가 체계"
      }
    },
    "2": {
      "text": "성적 처리",
      "children": {
        "1": "성적 입력 및 확정",
        "2": "성적 공개 및 이의신청"
      }
    }
  }
}
```

### 학적 타입 목록 조회

사용 가능한 학적 타입 목록을 조회합니다.

**Endpoint:** `GET /eduguide/record/types`

#### Success Response (200)
```json
{
  "title": "호서대학교 학적 타입 목록",
  "generatedAt": "2025-05-30T12:00:00.000Z",
  "totalTypes": 4,
  "types": [
    {
      "type": "test",
      "name": "시험",
      "description": "시험",
      "url": "http://www.hoseo.ac.kr/Home/Contents.mbz?action=MAPP_1708230107",
      "fileName": "시험",
      "excludeItems": []
    },
    {
      "type": "evaluation",
      "name": "평가",
      "description": "평가",
      "url": "http://www.hoseo.ac.kr/Home/Contents.mbz?action=MAPP_1708230108",
      "fileName": "평가",
      "excludeItems": ["평균 성적산출"]
    },
    {
      "type": "warning",
      "name": "학사경고",
      "description": "학사경고",
      "url": "http://www.hoseo.ac.kr/Home/Contents.mbz?action=MAPP_1708230109",
      "fileName": "학사경고",
      "excludeItems": []
    },
    {
      "type": "change_major",
      "name": "전공변경",
      "description": "전공변경",
      "url": "http://www.hoseo.ac.kr/Home/Contents.mbz?action=MAPP_1708230110",
      "fileName": "전공변경",
      "excludeItems": []
    }
  ],
  "usage": {
    "basicApi": "/eduguide/record?type=test"
  }
}
```

---

# 데이터 구조

## 공통 응답 구조

모든 API는 다음과 같은 공통 구조를 가집니다:

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | 데이터 제목 |
| `type` | string | 요청된 타입 (해당하는 경우) |
| `generatedAt` | datetime | 생성 시간 (ISO 8601) |
| `description` | string | 데이터 구조 설명 |
| `data` | object | 실제 데이터 |

## 계층형 데이터 구조 (Hierarchical)

교육과정, 수업, 학적 API에서 사용되는 구조입니다:

```json
{
  "1": {
    "text": "섹션 제목",
    "children": {
      "1": "첫 번째 하위 내용",
      "2": "두 번째 하위 내용",
      "3": {
        "text": "중첩된 섹션",
        "children": {
          "1": "중첩된 내용"
        }
      }
    }
  }
}
```

## 중첩형 데이터 구조 (Nested)

학사일정 API에서 사용되는 구조입니다:

```json
{
  "2025": {
    "1": {
      "2": {
        "1": "신년예배 및 하례식"
      }
    }
  }
}
```

---

# 특별 기능

## 자동 제외 기능

특정 API에서는 불필요한 항목을 자동으로 제외합니다:

- **평가 API** (`/api/eduguide/record?type=evaluation`): "평균 성적산출" 항목 자동 제외

## 자동 크롤링

모든 API는 다음과 같은 자동 크롤링 기능을 제공합니다:

1. **파일 존재 확인**: JSON 파일이 있는지 확인
2. **자동 생성**: 파일이 없으면 호서대 홈페이지에서 크롤링
3. **구조화**: HTML을 구조화된 JSON으로 변환
4. **캐싱**: 생성된 파일은 수동 삭제 전까지 재사용

---

# 에러 응답

## 공통 에러 형식

```json
{
  "error": "에러 메시지",
  "details": "상세 에러 정보",
  "suggestion": "해결 방법 제안"
}
```

## HTTP 상태 코드

| Status Code | Description |
|-------------|-------------|
| 200 | 성공 |
| 400 | 잘못된 요청 (잘못된 타입 등) |
| 500 | 서버 오류 (크롤링 실패, 파싱 오류 등) |

---

# 사용 예시

## cURL

```bash
# 교육과정 타입 목록 조회
curl "http://localhost:3000/eduguide/curriculum/types"

# 부전공 교육과정 조회
curl "http://localhost:3000/eduguide/curriculum?type=minor"

# 계절학기 정보 조회
curl "http://localhost:3000/eduguide/class?type=season"

# 학사경고 정보 조회
curl "http://localhost:3000/eduguide/record?type=warning"
```

---

# 주의사항

1. **초기 로딩**: 첫 요청 시 크롤링으로 인해 응답 시간이 길어질 수 있습니다.

2. **데이터 신뢰성**: 호서대학교 홈페이지 구조 변경 시 크롤링이 실패할 수 있습니다.

3. **캐싱**: 생성된 JSON 파일은 수동 삭제 전까지 재사용됩니다.

4. **자동 제외**: 일부 API에서는 특정 항목이 자동으로 제외됩니다.

5. **타입 유효성**: 잘못된 타입 요청 시 400 에러와 함께 사용 가능한 타입 목록을 제공합니다.

---

*Last Updated: 2025-05-30*
