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
- 상세 정보 캐싱을 통한 빠른 응답
- 구조화된 로깅 및 에러 처리

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

#### Success Response (200) - Standard Format
```json
{
  "success": true,
  "message": null,
  "data": {
    "title": "호서대학교 학부(과) 정보",
    "format": "detailed",
    "generatedAt": "2025-06-06T12:00:00.000Z",
    "description": "대학별 그룹화된 상세 학과 정보",
    "statistics": {
      "totalDepartments": 45,
      "totalColleges": 8,
      "lastUpdated": "2025-06-06T12:00:00.000Z"
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
            }
          ]
        }
      ]
    }
  },
  "metadata": {
    "requestId": "req_abc123",
    "processingTime": 150
  }
}
```

#### Error Response (400) - Invalid Format
```json
{
  "success": false,
  "message": "지원하지 않는 포맷: invalid_format",
  "error": "잘못된 요청입니다",
  "errorCode": "BAD_REQUEST",
  "metadata": {
    "requestId": "req_abc123",
    "processingTime": 5
  }
}
```

#### Error Response (500) - Generation Error
```json
{
  "success": false,
  "message": "학과 정보 JSON을 자동 생성하는 중 오류가 발생했습니다",
  "error": "데이터 생성에 실패했습니다",
  "errorCode": "GENERATION_ERROR",
  "metadata": {
    "requestId": "req_abc123",
    "processingTime": 2000
  }
}
```

---

### 2. 학과 상세 정보 조회

특정 학과의 상세 정보를 조회합니다. 캐시된 정보가 없으면 자동으로 크롤링하여 가져옵니다.

**Endpoint:** `GET /departments/info`

#### Request Parameters (Query String)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dept` | string | ✅ | 조회할 학과명 |

#### Example Request
```bash
GET /departments/info?dept=컴퓨터공학부
```

#### Success Response (200) - Cached Data
```json
{
  "success": true,
  "message": null,
  "data": {
    "message": "학과 정보를 성공적으로 가져왔습니다.",
    "data": {
      "name": "컴퓨터공학부",
      "code": "COMP",
      "campus": "천안",
      "college": "공과대학",
      "type": "학부",
      "description": "컴퓨터 소프트웨어 및 하드웨어 전문 인력을 양성하는 학부입니다.",
      "professor": [
        {
          "name": "홍길동",
          "position": "교수",
          "specialty": "인공지능"
        }
      ],
      "curriculum": [
        "프로그래밍기초",
        "자료구조",
        "알고리즘",
        "데이터베이스"
      ],
      "facilities": [
        "컴퓨터실습실",
        "네트워크실험실",
        "AI연구실"
      ],
      "contact": {
        "phone": "041-560-8000",
        "email": "computer@hoseo.edu",
        "office": "공학관 301호"
      },
      "images": [
        "computer_lab_01.jpg",
        "computer_lab_02.jpg"
      ],
      "crawledAt": "2025-06-06T12:00:00.000Z"
    },
    "cached": true
  },
  "metadata": {
    "requestId": "req_def456",
    "processingTime": 15
  }
}
```

#### Success Response (200) - Newly Crawled Data
```json
{
  "success": true,
  "message": null,
  "data": {
    "message": "학과 정보를 성공적으로 가져왔습니다.",
    "data": {
      // ... 동일한 학과 상세 정보 구조
    },
    "cached": false
  },
  "metadata": {
    "requestId": "req_ghi789",
    "processingTime": 3500
  }
}
```

#### Error Response (400) - Missing Parameter
```json
{
  "success": false,
  "message": "dept 파라미터가 필요합니다",
  "error": "필수 파라미터가 누락되었습니다",
  "errorCode": "MISSING_PARAMETER",
  "example": "/departments/info?dept=컴퓨터공학부",
  "metadata": {
    "requestId": "req_jkl012",
    "processingTime": 2
  }
}
```

#### Error Response (404) - Department Not Found
```json
{
  "success": false,
  "message": "'컴퓨터공학부' 학과를 찾을 수 없습니다",
  "error": "리소스를 찾을 수 없습니다",
  "errorCode": "NOT_FOUND",
  "metadata": {
    "requestId": "req_mno345",
    "processingTime": 25
  }
}
```

#### Error Response (500) - Crawling Failed
```json
{
  "success": false,
  "message": "'컴퓨터공학부' 학과 정보 가져오기 작업에 실패했습니다",
  "error": "내부 서버 오류가 발생했습니다",
  "errorCode": "INTERNAL_ERROR",
  "metadata": {
    "requestId": "req_pqr678",
    "processingTime": 5000
  }
}
```

---

### 3. 학과 이미지 다운로드

학과 관련 이미지 파일을 다운로드합니다.

**Endpoint:** `GET /departments/images/:filename`

#### Request Parameters (Path)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filename` | string | ✅ | 이미지 파일명 |

#### Supported Image Formats
- `.jpg`, `.jpeg` - image/jpeg
- `.png` - image/png  
- `.gif` - image/gif
- `.webp` - image/webp

#### Example Request
```bash
GET /departments/images/computer_lab_01.jpg
```

#### Success Response (200)
- **Content-Type**: 파일 확장자에 따른 적절한 MIME type
- **Body**: 이미지 파일 바이너리 데이터

#### Error Response (404) - Image Not Found
```json
{
  "success": false,
  "message": "'computer_lab_01.jpg' 이미지를 찾을 수 없습니다",
  "error": "리소스를 찾을 수 없습니다",
  "errorCode": "NOT_FOUND",
  "metadata": {
    "requestId": "req_stu901",
    "processingTime": 8
  }
}
```

#### Error Response (500) - Server Error
```json
{
  "success": false,
  "message": "이미지 가져오기 작업에 실패했습니다",
  "error": "내부 서버 오류가 발생했습니다",
  "errorCode": "INTERNAL_ERROR",
  "metadata": {
    "requestId": "req_vwx234",
    "processingTime": 12
  }
}
```

---

## 응답 구조

### 표준 응답 형식

모든 API는 공통 응답 구조를 사용합니다:

```json
{
  "success": true|false,
  "message": "응답 메시지",
  "data": "실제 데이터",
  "metadata": {
    "requestId": "고유 요청 ID",
    "processingTime": "처리 시간(ms)"
  }
}
```

### 에러 응답 형식

```json
{
  "success": false,
  "message": "에러 메시지",
  "error": "에러 유형",
  "errorCode": "에러 코드",
  "metadata": {
    "requestId": "고유 요청 ID",
    "processingTime": "처리 시간(ms)"
  }
}
```

---

## 데이터 구조

### Detailed Format 데이터 구조

```json
{
  "title": "호서대학교 학부(과) 정보",
  "format": "detailed",
  "generatedAt": "2025-06-06T12:00:00.000Z",
  "description": "대학별 그룹화된 상세 학과 정보",
  "statistics": {
    "totalDepartments": 45,
    "totalColleges": 8,
    "lastUpdated": "2025-06-06T12:00:00.000Z"
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
          }
        ]
      }
    ]
  }
}
```

### Simple Format 데이터 구조

```json
{
  "title": "호서대학교 학부(과) 정보",
  "format": "simple",
  "generatedAt": "2025-06-06T12:00:00.000Z",
  "description": "단순 리스트 형태의 학과 정보",
  "data": [
    {
      "name": "기계공학과",
      "code": "MECH",
      "campus": "천안",
      "college": "공과대학",
      "type": "학과"
    }
  ]
}
```

### Department Detail 구조

```json
{
  "name": "컴퓨터공학부",
  "code": "COMP",
  "campus": "천안",
  "college": "공과대학",
  "type": "학부",
  "description": "컴퓨터 소프트웨어 및 하드웨어 전문 인력을 양성하는 학부입니다.",
  "professor": [
    {
      "name": "홍길동",
      "position": "교수",
      "specialty": "인공지능"
    }
  ],
  "curriculum": ["프로그래밍기초", "자료구조", "알고리즘"],
  "facilities": ["컴퓨터실습실", "네트워크실험실"],
  "contact": {
    "phone": "041-560-8000",
    "email": "computer@hoseo.edu",
    "office": "공학관 301호"
  },
  "images": ["computer_lab_01.jpg", "computer_lab_02.jpg"],
  "crawledAt": "2025-06-06T12:00:00.000Z"
}
```

---

## 자동 데이터 생성 및 캐싱

### 자동 생성 프로세스

1. **파일 존재 확인**: 요청된 format에 해당하는 JSON 파일 존재 여부 확인
2. **자동 크롤링**: 파일이 없으면 `ensureDepartmentBasicInfo()` 함수 실행
3. **파일 생성**: 크롤링 결과를 JSON 파일로 저장
4. **응답 반환**: 생성된 데이터로 API 응답

### 상세 정보 캐싱

1. **캐시 확인**: 메모리 캐시에서 해당 학과의 상세 정보 확인
2. **캐시 히트**: 캐시된 데이터가 있으면 즉시 반환 (`cached: true`)
3. **캐시 미스**: 캐시된 데이터가 없으면 크롤링 수행 후 캐시에 저장 (`cached: false`)

### 파일 저장 위치
```
assets/static/
├── departments.json          # Detailed 형식 데이터  
├── departments_simple.json   # Simple 형식 데이터
├── departments_detailed.json # 상세 정보 데이터
└── images/                   # 학과 이미지 파일들
    ├── computer_lab_01.jpg
    ├── computer_lab_02.jpg
    └── ...
```

---

## 에러 코드

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 200 | - | 요청 성공 |
| 400 | BAD_REQUEST | 잘못된 format 파라미터 |
| 400 | MISSING_PARAMETER | 필수 파라미터 누락 |
| 404 | NOT_FOUND | 학과 또는 이미지를 찾을 수 없음 |
| 500 | GENERATION_ERROR | 데이터 자동 생성 실패 |
| 500 | INTERNAL_ERROR | 서버 내부 오류 |

---

## 로깅

API는 구조화된 로깅을 지원합니다:

### 로그 필드
- `module`: "departments"
- `action`: "list", "info", "images"
- `requestId`: 고유 요청 식별자
- `processingTime`: 처리 시간
- `department`: 조회된 학과명 (info API)
- `filename`: 요청된 이미지 파일명 (images API)
- `cached`: 캐시 히트 여부 (info API)

### 로그 레벨
- **INFO**: 정상 요청 및 응답
- **WARN**: 잘못된 파라미터, 파일 없음
- **ERROR**: 서버 오류, 크롤링 실패

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

### 4. 특정 학과 상세 정보 조회
```bash
curl "http://localhost:3000/departments/info?dept=컴퓨터공학부"
```

### 5. 학과 이미지 다운로드
```bash
curl "http://localhost:3000/departments/images/computer_lab_01.jpg" --output computer_lab_01.jpg
```

### 6. 웹 브라우저에서 이미지 보기
```
http://localhost:3000/departments/images/computer_lab_01.jpg
```

---

## 주요 기능

### 🔄 **자동 데이터 생성**
- 첫 번째 요청 시 학과 정보가 없으면 자동 크롤링 실행
- 크롤링 결과를 JSON 파일로 저장하여 재사용

### 💾 **메모리 캐싱**
- 학과 상세 정보를 메모리에 캐싱하여 빠른 응답 제공
- `cached` 필드로 캐시 히트 여부 확인 가능

### 📊 **구조화된 로깅**
- 모든 요청에 대한 상세한 로그 기록
- 요청 ID와 처리 시간 추적

### 🔧 **강화된 에러 처리**
- 표준화된 에러 응답 형식
- 상세한 에러 코드 및 메시지 제공

### 🚀 **성능 최적화**
- 캐싱을 통한 빠른 응답
- 처리 시간 모니터링

---

## 주의사항

1. **자동 생성**: 첫 번째 요청 시 학과 정보가 없으면 크롤링이 실행되어 응답 시간이 길어질 수 있습니다.

2. **캐싱**: 학과 상세 정보는 메모리에 캐싱되어 서버 재시작 전까지 재사용됩니다.

3. **데이터 갱신**: 최신 학과 정보가 필요한 경우 기존 JSON 파일을 삭제하고 서버를 재시작하면 다음 요청 시 자동으로 재생성됩니다.

4. **로깅**: 모든 API 요청은 구조화된 로그로 기록되며, 요청 ID로 추적 가능합니다.

5. **응답 시간**: 캐시된 데이터는 빠르게 응답하지만, 새로운 크롤링은 수 초가 소요될 수 있습니다.

6. **이미지 파일**: 학과 이미지는 서버의 `assets/static/images/` 디렉토리에 저장되며, 적절한 MIME 타입으로 제공됩니다.

---

*Last Updated: 2025-06-06*