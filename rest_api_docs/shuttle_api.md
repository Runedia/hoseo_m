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
- **불완전한 시간표 자동 필터링** (pos1~pos7 중 하나라도 비어있으면 제외)
- **연속 버스 번호 자동 할당** (1부터 시작하는 연속 번호)

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
      "1": {
        "origin_idx": "1",
        "pos1": "07:30",
        "pos2": "07:35",
        "pos3": "07:40",
        "pos4": "07:50",
        "pos5": "08:00",
        "pos6": "08:10",
        "pos7": "08:15"
      },
      "2": {
        "origin_idx": "3",
        "pos1": "08:30",
        "pos2": "08:35",
        "pos3": "08:40",
        "pos4": "08:50",
        "pos5": "09:00",
        "pos6": "09:10",
        "pos7": "09:15"
      },
      "3": {
        "origin_idx": "5",
        "pos1": "09:30",
        "pos2": "09:35",
        "pos3": "09:40",
        "pos4": "09:50",
        "pos5": "10:00",
        "pos6": "10:10",
        "pos7": "10:15"
      }
    }
  },
  "message": "시간표 조회 성공"
}
```

#### 데이터 구조 설명

- **Key (1, 2, 3...)**: 연속된 버스 번호 (1부터 자동 할당)
- **origin_idx**: 원본 데이터의 버스 번호 (detail API에서 사용)
- **pos1**: 출발지 시간
- **pos2~pos6**: 중간 정거장 시간
- **pos7**: 도착지 시간

#### 필터링 로직

⚠️ **중요**: pos1부터 pos7까지 모든 시간이 입력된 시간표만 응답에 포함됩니다.
- 하나라도 비어있거나 공백인 시간표는 자동으로 제외
- 연속된 번호(1, 2, 3...)로 자동 재할당

**예시 필터링:**
```json
// 원본 데이터
{
  "bus_001": { "pos1": "07:30", "pos2": "07:35", ..., "pos7": "08:15" }, // ✅ 모든 pos 완성
  "bus_002": { "pos1": "", "pos2": "08:35", ..., "pos7": "09:15" },      // ❌ pos1 비어있음 → 제외
  "bus_003": { "pos1": "08:30", "pos2": "08:35", ..., "pos7": "09:15" }, // ✅ 모든 pos 완성
  "bus_004": { "pos1": "09:30", "pos2": "", ..., "pos7": "10:15" }       // ❌ pos2 비어있음 → 제외
}

// 필터링 후 응답
{
  "1": { "origin_idx": "1", "pos1": "07:30", ..., "pos7": "08:15" },
  "2": { "origin_idx": "3", "pos1": "08:30", ..., "pos7": "09:15" }
}
```

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

특정 버스 운행의 상세 시간표를 조회합니다.

**Endpoint:** `GET /shuttle/schedule/detail`

#### Request Parameters (Query String)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `date` | string | ✅ | 조회 날짜 (YYYY-MM-DD 형식) |
| `route` | string | ✅ | 노선 번호 (1: 아산→천안, 2: 천안→아산) |
| `schedule` | string | ✅ | **원본 버스 번호** (origin_idx 값 사용) |

⚠️ **중요**: `schedule` 파라미터는 `/schedule` API 응답의 `origin_idx` 값을 사용해야 합니다.

#### Example Request
```bash
# /schedule에서 응답받은 origin_idx 값 사용
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
| `scheduleCount` | number | 로드된 시간표 개수 (필터링 전 전체 개수) |
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
      "1": {
        "origin_idx": "원본_버스_번호",
        "pos1": "HH:MM",
        "pos2": "HH:MM",
        "pos3": "HH:MM",
        "pos4": "HH:MM",
        "pos5": "HH:MM",
        "pos6": "HH:MM",
        "pos7": "HH:MM"
      },
      "2": {
        "origin_idx": "원본_버스_번호",
        "pos1": "HH:MM",
        "pos2": "HH:MM",
        "pos3": "HH:MM",
        "pos4": "HH:MM",
        "pos5": "HH:MM",
        "pos6": "HH:MM",
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
    "scheduleNumber": "원본_버스_번호",
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
  },
  "bus_002": {
    "pos1": "",      // ❌ 비어있음 → 필터링으로 제외됨
    "pos2": "08:35", 
    "pos3": "08:40",
    "pos4": "08:50",
    "pos5": "09:00",
    "pos6": "09:10",
    "pos7": "09:15"
  }
}
```

---

## 프론트엔드 연동 가이드

### 1. 시간표 목록 표시

```javascript
// 1. 시간표 조회
const response = await fetch('/shuttle/schedule?date=2025-01-20&route=1');
const data = await response.json();

// 2. 연속된 번호로 표시
Object.entries(data.data.schedule).forEach(([busNumber, schedule]) => {
  console.log(`버스 ${busNumber}번: ${schedule.pos1} → ${schedule.pos7}`);
  // 출력: "버스 1번: 07:30 → 08:15"
  //      "버스 2번: 08:30 → 09:15"
});
```

### 2. 상세 시간표 조회

```javascript
// 3. 상세 조회 시 origin_idx 사용
const busNumber = "1"; // 사용자가 선택한 연속 번호
const originIdx = data.data.schedule[busNumber].origin_idx; // "bus_001"

const detailResponse = await fetch(
  `/shuttle/schedule/detail?date=2025-01-20&route=1&schedule=${originIdx}`
);
const detailData = await detailResponse.json();

console.log('상세 시간표:', detailData.data.detail);
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
# origin_idx 값 사용
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

### 🔍 **자동 필터링**
- pos1~pos7 중 하나라도 비어있는 시간표 자동 제외
- 완전한 시간표만 응답에 포함
- 데이터 품질 보장

### 📊 **연속 번호 할당**
- 필터링 후 1부터 시작하는 연속된 번호 자동 할당
- origin_idx로 원본 데이터 추적 가능
- 프론트엔드에서 일관된 번호 사용 가능

### 🛡️ **견고한 에러 처리**
- 파일 로딩 실패 시 기본값 제공
- 상세한 에러 메시지 제공
- 잘못된 파라미터 검증

### 📍 **정거장별 시간 제공**
- pos1 (출발지) ~ pos7 (도착지) 각 정거장별 시간
- 기본 조회와 상세 조회 모두 전체 정거장 정보 제공

---

## 주의사항

1. **파일 의존성**: API는 `assets/` 폴더의 JSON 파일에 의존합니다. 파일이 없으면 기본값(빈 시간표)으로 동작합니다.

2. **서버 시작 시 로딩**: 모든 시간표 데이터는 서버 시작 시 메모리에 로드됩니다. 파일 변경 시 서버 재시작이 필요합니다.

3. **날짜 형식**: 날짜는 반드시 `YYYY-MM-DD` 형식이어야 합니다.

4. **노선 제한**: 현재 노선 1번(아산→천안), 2번(천안→아산)만 지원됩니다.

5. **detail API 파라미터**: detail API의 `schedule` 파라미터는 연속 번호가 아닌 `origin_idx` 값을 사용해야 합니다.

6. **필터링 로직**: 불완전한 시간표는 자동으로 제외되므로, 원본 데이터와 응답 데이터의 개수가 다를 수 있습니다.

---

## 성능 최적화

### **메모리 캐싱**
- 모든 시간표 데이터를 서버 시작 시 메모리에 로드
- 요청당 파일 I/O 없이 즉시 응답
- 6개 파일(노선2개 × 요일3개) 모두 캐싱

### **효율적인 데이터 구조**
- 노선별, 요일별로 분리된 캐시 키 사용
- 필터링을 통한 불필요한 데이터 제거
- 연속 번호로 일관된 인터페이스 제공

### **병렬 처리**
- `Promise.all()`을 사용한 비동기 처리 (필요시)
- 캐시 기반 즉시 응답

---

*Last Updated: 2025-06-03*
