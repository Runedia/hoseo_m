# Shuttle API Documentation

호서대학교 셔틀버스 시간표 관련 REST API 문서입니다.

## Base URL
```
/shuttle
```

## 개요

호서대학교 캠퍼스 간 셔틀버스 시간표 정보를 제공하는 API입니다.
- 요일별 시간표 지원 (평일, 토요일, 일요일/공휴일)
- 메모리 캐싱으로 빠른 응답 속도
- 실시간 시간표 조회 기능

## 지원 노선

| Route Code | 출발지 | 도착지 | 설명 |
|------------|--------|--------|------|
| `1` | 아산캠퍼스 | 천안캠퍼스 | 아산 → 천안 셔틀버스 |
| `2` | 천안캠퍼스 | 아산캠퍼스 | 천안 → 아산 셔틀버스 |

## 요일 분류

| Day Type | 요일 | 설명 |
|----------|------|------|
| `weekday` | 월~금 | 평일 시간표 |
| `saturday` | 토 | 토요일 시간표 |
| `sunday` | 일 | 일요일/공휴일 시간표 |

---

## API Endpoints

### 1. 셔틀버스 시간표 조회

특정 날짜와 노선의 셔틀버스 시간표를 조회합니다.

**Endpoint:** `GET /shuttle/schedule`

#### Request Parameters (Query String)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `date` | string | ✅ | 조회 날짜 (YYYY-MM-DD 형식) |
| `route` | string | ✅ | 노선 번호 (1: 아산→천안, 2: 천안→아산) |

#### Example Request
```bash
GET /shuttle/schedule?date=2025-01-20&route=1
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "date": "2025-01-20",
    "dayType": "weekday",
    "route": "1",
    "schedule": {
      "error": {
        "pos1": "",
        "pos7": ""
      },
      "bus_001": {
        "pos1": "07:30",
        "pos7": "08:15"
      },
      "bus_002": {
        "pos1": "08:30",
        "pos7": "09:15"
      },
      "bus_003": {
        "pos1": "09:30",
        "pos7": "10:15"
      },
      "bus_004": {
        "pos1": "10:30",
        "pos7": "11:15"
      }
    }
  },
  "message": "시간표 조회 성공"
}
```

#### 데이터 구조 설명

- **pos1**: 출발지 시간
- **pos7**: 도착지 시간
- **bus_XXX**: 각 버스 운행 번호
- **error**: 시스템 에러나 운행 중단 정보 (일반적으로 빈 값)

#### Error Response (400)
```json
{
  "success": false,
  "message": "날짜(date)와 노선 번호(route)가 필요합니다."
}
```

#### Error Response (400 - 잘못된 날짜 형식)
```json
{
  "success": false,
  "message": "날짜는 YYYY-MM-DD 형식이어야 합니다."
}
```

#### Error Response (400 - 잘못된 노선)
```json
{
  "success": false,
  "message": "현재 노선 1번, 2번만 지원됩니다."
}
```

---

### 2. 셔틀버스 상세 시간표 조회

특정 버스 운행의 상세 시간표를 조회합니다. (현재 구현 중)

**Endpoint:** `GET /shuttle/schedule/detail`

#### Request Parameters (Query String)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `date` | string | ✅ | 조회 날짜 (YYYY-MM-DD 형식) |
| `route` | string | ✅ | 노선 번호 (1: 아산→천안, 2: 천안→아산) |
| `schedule` | string | ✅ | 버스 운행 번호 (예: bus_001) |

#### Example Request
```bash
GET /shuttle/schedule/detail?date=2025-01-20&route=1&schedule=bus_001
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "date": "2025-01-20",
    "dayType": "weekday",
    "route": "1",
    "scheduleNumber": "bus_001",
    "detail": {
      "pos1": "07:30",
      "pos2": "07:35",
      "pos3": "07:40",
      "pos4": "07:50",
      "pos5": "08:00",
      "pos6": "08:10",
      "pos7": "08:15"
    }
  },
  "message": "시간표 상세 조회 성공"
}
```

#### Error Response (404)
```json
{
  "success": false,
  "message": "스케줄 번호 bus_999을(를) 찾을 수 없습니다."
}
```

---

### 3. 캐시 상태 확인 (디버깅용)

시스템의 시간표 캐시 상태를 확인합니다.

**Endpoint:** `GET /shuttle/cache/status`

#### Example Request
```bash
GET /shuttle/cache/status
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "1_weekday": {
      "loaded": true,
      "scheduleCount": 15,
      "isDefault": false
    },
    "1_saturday": {
      "loaded": true,
      "scheduleCount": 8,
      "isDefault": false
    },
    "1_sunday": {
      "loaded": true,
      "scheduleCount": 5,
      "isDefault": false
    },
    "2_weekday": {
      "loaded": true,
      "scheduleCount": 15,
      "isDefault": false
    },
    "2_saturday": {
      "loaded": true,
      "scheduleCount": 8,
      "isDefault": false
    },
    "2_sunday": {
      "loaded": true,
      "scheduleCount": 5,
      "isDefault": false
    }
  },
  "message": "캐시 상태 조회 성공"
}
```

#### 캐시 상태 필드 설명

| Field | Type | Description |
|-------|------|-------------|
| `loaded` | boolean | 캐시에 데이터가 로드되었는지 여부 |
| `scheduleCount` | number | 로드된 시간표 개수 |
| `isDefault` | boolean | 기본값 데이터인지 여부 (파일 로딩 실패 시 true) |

---

## 데이터 구조

### Schedule Response 구조

```json
{
  "success": boolean,
  "data": {
    "date": "YYYY-MM-DD",
    "dayType": "weekday|saturday|sunday",
    "route": "1|2",
    "schedule": {
      "bus_001": {
        "pos1": "HH:MM",
        "pos7": "HH:MM"
      }
    }
  },
  "message": string
}
```

### Detail Schedule Response 구조

```json
{
  "success": boolean,
  "data": {
    "date": "YYYY-MM-DD",
    "dayType": "weekday|saturday|sunday", 
    "route": "1|2",
    "scheduleNumber": "bus_XXX",
    "detail": {
      "pos1": "HH:MM",  // 출발지
      "pos2": "HH:MM",  // 정거장 2
      "pos3": "HH:MM",  // 정거장 3
      "pos4": "HH:MM",  // 정거장 4
      "pos5": "HH:MM",  // 정거장 5
      "pos6": "HH:MM",  // 정거장 6
      "pos7": "HH:MM"   // 도착지
    }
  },
  "message": string
}
```

### Error Response 구조

```json
{
  "success": false,
  "message": string
}
```

---

## 파일 시스템 구조

### 시간표 데이터 파일

API는 다음 JSON 파일들을 사용합니다:

```
assets/
├── 셔틀(아캠_천캠_월금).json      # 노선1 평일
├── 셔틀(아캠_천캠_토요일).json    # 노선1 토요일  
├── 셔틀(아캠_천캠_일요일_공휴일).json # 노선1 일요일/공휴일
├── 셔틀(천캠_아캠_월금).json      # 노선2 평일
├── 셔틀(천캠_아캠_토요일).json    # 노선2 토요일
└── 셔틀(천캠_아캠_일요일_공휴일).json # 노선2 일요일/공휴일
```

### JSON 파일 구조 예시

```json
{
  "error": {
    "pos1": "",
    "pos2": "",
    "pos3": "",
    "pos4": "",
    "pos5": "",
    "pos6": "",
    "pos7": ""
  },
  "bus_001": {
    "pos1": "07:30",
    "pos2": "07:35", 
    "pos3": "07:40",
    "pos4": "07:50",
    "pos5": "08:00",
    "pos6": "08:10",
    "pos7": "08:15"
  }
}
```

---

## 요일 판별 로직

API는 입력된 날짜를 기준으로 다음과 같이 요일을 판별합니다:

```javascript
// JavaScript Date 객체 기준
// 일요일=0, 월요일=1, 화요일=2, ..., 토요일=6

if (dayOfWeek >= 1 && dayOfWeek <= 5) {
  return "weekday";  // 평일 (월~금)
} else if (dayOfWeek === 6) {
  return "saturday"; // 토요일
} else {
  return "sunday";   // 일요일
}
```

---

## 에러 코드

| HTTP Status | Error Type | Description |
|-------------|------------|-------------|
| 400 | Bad Request | 필수 파라미터 누락, 잘못된 날짜 형식, 잘못된 노선 번호 |
| 404 | Not Found | 요청한 스케줄 번호를 찾을 수 없음 |
| 500 | Internal Server Error | 서버 내부 오류, 파일 읽기 실패 등 |

---

## 사용 예시

### 1. 평일 아산→천안 시간표 조회
```bash
curl "http://localhost:3000/shuttle/schedule?date=2025-01-20&route=1"
```

### 2. 토요일 천안→아산 시간표 조회  
```bash
curl "http://localhost:3000/shuttle/schedule?date=2025-01-25&route=2"
```

### 3. 일요일 아산→천안 시간표 조회
```bash
curl "http://localhost:3000/shuttle/schedule?date=2025-01-26&route=1"
```

### 4. 특정 버스 상세 시간표 조회
```bash
curl "http://localhost:3000/shuttle/schedule/detail?date=2025-01-20&route=1&schedule=bus_001"
```

### 5. 캐시 상태 확인
```bash
curl "http://localhost:3000/shuttle/cache/status"
```

---

## 주요 기능

### 🚌 **실시간 요일 판별**
- 입력된 날짜를 기준으로 자동으로 요일 타입 결정
- 평일, 토요일, 일요일/공휴일별 다른 시간표 제공

### ⚡ **메모리 캐싱**
- 서버 시작 시 모든 시간표 데이터를 메모리에 로드
- 빠른 응답 속도 보장
- 파일 I/O 최소화

### 🛡️ **견고한 에러 처리**
- 파일 로딩 실패 시 기본값 제공
- 상세한 에러 메시지 제공
- 잘못된 파라미터 검증

### 📍 **정거장별 시간 제공**
- pos1 (출발지) ~ pos7 (도착지) 각 정거장별 시간
- 기본 조회는 출발지/도착지만, 상세 조회는 전체 정거장

---

## 주의사항

1. **파일 의존성**: API는 `assets/` 폴더의 JSON 파일에 의존합니다. 파일이 없으면 기본값(빈 시간표)으로 동작합니다.

2. **서버 시작 시 로딩**: 모든 시간표 데이터는 서버 시작 시 메모리에 로드됩니다. 파일 변경 시 서버 재시작이 필요합니다.

3. **날짜 형식**: 날짜는 반드시 `YYYY-MM-DD` 형식이어야 합니다.

4. **노선 제한**: 현재 노선 1번(아산→천안), 2번(천안→아산)만 지원됩니다.

5. **상세 시간표**: 상세 시간표 API는 현재 구현 중인 상태입니다.

---

## 성능 최적화

### **메모리 캐싱**
- 모든 시간표 데이터를 서버 시작 시 메모리에 로드
- 요청당 파일 I/O 없이 즉시 응답
- 6개 파일(노선2개 × 요일3개) 모두 캐싱

### **효율적인 데이터 구조**
- 노선별, 요일별로 분리된 캐시 키 사용
- 필요한 데이터만 추출하여 응답 크기 최소화

---

*Last Updated: 2025-05-29*
