# Departments API Documentation

호서대학교 학부(과) 정보 관련 REST API 문서입니다.

## Base URL
```
/departments
```

## 개요

호서대학교 학부(과) 정보를 제공하는 API입니다.
- 자동 크롤링을 통한 학과 정보 수집
- 두 가지 형태의 데이터 포맷 지원 (상세/간단)
- 대학별 그룹화된 정보 제공

---

## API Endpoints

### 1. 학과 목록 조회

호서대학교의 모든 학부(과) 정보를 조회합니다.

**Endpoint:** `GET /departments/list`

#### Request Parameters (Query String)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `format` | string | ❌ | detailed | 응답 데이터 형식 |

#### Format Options

| Format | Description |
|--------|-------------|
| `detailed` | 대학별 그룹화된 상세 정보 |
| `simple` | 단순 리스트 형태 |

#### Example Request
```bash
GET /departments/list?format=detailed
```

#### Success Response (200) - Detailed Format
```json
{
  "title": "호서대학교 학부(과) 정보",
  "format": "detailed",
  "generatedAt": "2025-05-31T12:00:00.000Z",
  "description": "대학별 그룹화된 상세 학과 정보",
  "statistics": {
    "totalDepartments": 45,
    "totalColleges": 8,
    "lastUpdated": "2025-05-31T12:00:00.000Z"
  },
  "data": {
    "colleges": [
      {
        "collegeName": "공과대학",
        "departments": [
          {
            "name": "기계공학과",
            "code": "MECH",
            "campus": "천안",
            "type": "학과"
          },
          {
            "name": "전기공학과", 
            "code": "ELEC",
            "campus": "천안",
            "type": "학과"
          }
        ]
      },
      {
        "collegeName": "경상대학",
        "departments": [
          {
            "name": "경영학과",
            "code": "BUS",
            "campus": "아산",
            "type": "학과"
          }
        ]
      }
    ]
  }
}
```

#### Success Response (200) - Simple Format
```json
{
  "title": "호서대학교 학부(과) 정보",
  "format": "simple",
  "generatedAt": "2025-05-31T12:00:00.000Z",
  "description": "단순 리스트 형태의 학과 정보",
  "data": [
    {
      "name": "기계공학과",
      "code": "MECH", 
      "campus": "천안",
      "college": "공과대학",
      "type": "학과"
    },
    {
      "name": "전기공학과",
      "code": "ELEC",
      "campus": "천안", 
      "college": "공과대학",
      "type": "학과"
    },
    {
      "name": "경영학과",
      "code": "BUS",
      "campus": "아산",
      "college": "경상대학",
      "type": "학과"
    }
  ]
}
```

#### Error Response (400) - Invalid Format
```json
{
  "error": "지원하지 않는 포맷: invalid_format",
  "availableFormats": ["detailed", "simple"],
  "description": {
    "detailed": "대학별 그룹화된 상세 정보",
    "simple": "단순 리스트 형태"
  }
}
```

#### Error Response (500) - Auto Generation Failed
```json
{
  "error": "학과 정보 JSON을 자동 생성하는 중 오류가 발생했습니다.",
  "details": "크롤링 서버 연결 실패",
  "suggestion": "잠시 후 다시 시도하거나 관리자에게 문의하세요."
}
```

---

## 데이터 구조

### Detailed Format 응답 구조

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | API 제목 |
| `format` | string | 응답 데이터 형식 |
| `generatedAt` | datetime | 응답 생성 시간 |
| `description` | string | 형식 설명 |
| `statistics` | object | 통계 정보 (detailed에만 포함) |
| `data` | object/array | 학과 데이터 |

### Statistics 구조 (Detailed Format)

```json
{
  "totalDepartments": 45,
  "totalColleges": 8,
  "lastUpdated": "2025-05-31T12:00:00.000Z"
}
```

### College 구조 (Detailed Format)

```json
{
  "collegeName": "공과대학",
  "departments": [
    {
      "name": "기계공학과",
      "code": "MECH",
      "campus": "천안",
      "type": "학과"
    }
  ]
}
```

### Department 구조 (Simple Format)

```json
{
  "name": "기계공학과",
  "code": "MECH",
  "campus": "천안",
  "college": "공과대학", 
  "type": "학과"
}
```

---

## 자동 데이터 생성

API는 학과 정보 JSON 파일이 없을 경우 자동으로 크롤링을 실행합니다.

### 자동 생성 프로세스

1. **파일 존재 확인**: JSON 파일 (`departments.json`, `departments_simple.json`) 존재 여부 확인
2. **자동 크롤링**: 파일이 없으면 `extractDepartmentList()` 함수 실행
3. **파일 생성**: 크롤링 결과를 JSON 파일로 저장
4. **응답 반환**: 생성된 데이터로 API 응답

### 파일 저장 위치
```
assets/static/
├── departments.json          # Detailed 형식 데이터
└── departments_simple.json   # Simple 형식 데이터
```

---

## 에러 코드

| HTTP Status | Error Type | Description |
|-------------|------------|-------------|
| 400 | Bad Request | 지원하지 않는 format 파라미터 |
| 500 | Internal Server Error | JSON 파일 읽기 오류, 자동 생성 실패 등 |

---

## 사용 예시

### 1. 상세 형식으로 학과 정보 조회
```bash
curl "http://localhost:3000/departments/list?format=detailed"
```

### 2. 간단 형식으로 학과 정보 조회  
```bash
curl "http://localhost:3000/departments/list?format=simple"
```

### 3. 기본 형식으로 학과 정보 조회 (detailed)
```bash
curl "http://localhost:3000/departments/list"
```

---

## 주의사항

1. **자동 생성**: 첫 번째 요청 시 학과 정보가 없으면 크롤링이 실행되어 응답 시간이 길어질 수 있습니다.

2. **캐싱**: 한 번 생성된 JSON 파일은 서버 재시작 전까지 재사용됩니다.

3. **데이터 갱신**: 최신 학과 정보가 필요한 경우 기존 JSON 파일을 삭제하면 다음 요청 시 자동으로 재생성됩니다.

4. **에러 핸들링**: 자동 생성 실패 시에도 적절한 에러 메시지와 함께 해결 방안을 제시합니다.

---

*Last Updated: 2025-05-31*
