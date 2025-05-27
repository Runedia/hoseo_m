# 셔틀버스 API 가이드

- **Base URL:** `http://rukeras.com:3000/shuttle`

## 목차
- [셔틀버스 시간표 조회](#셔틀버스-시간표-조회)
- [셔틀버스 상세 시간표 조회](#셔틀버스-상세-시간표-조회)
- [셔틀버스 노선 정보](#셔틀버스-노선-정보)

## 셔틀버스 시간표 조회
지정된 날짜와 노선의 셔틀버스 시간표를 조회합니다.

- **GET** `http://rukeras.com:3000/shuttle/schedule`
- **Query Parameters:**
  - `date` (string, required): 조회할 날짜 (YYYY-MM-DD 형식)
  - `route` (string, required): 노선 번호 ("1" 또는 "2")
    - 1: 아산캠퍼스 → 천안캠퍼스
    - 2: 천안캠퍼스 → 아산캠퍼스

**예시 요청:**
```
GET http://rukeras.com:3000/shuttle/schedule?date=2023-01-01&route=1
```

**응답 예시 (성공 시):**
```json
{
  "success": true,
  "data": {
    "date": "2023-01-01",
    "dayType": "weekday",
    "route": "1",
    "schedule": {
      "1": {
        "pos1": "08:00",
        "pos7": "08:30"
      },
      "2": {
        "pos1": "09:00",
        "pos7": "09:30"
      }
    }
  },
  "message": "시간표 조회 성공"
}
```

**에러 응답 예시:**
```json
{
  "success": false,
  "message": "날짜(date)와 노선 번호(route)가 필요합니다."
}
```

---

## 셔틀버스 상세 시간표 조회
지정된 날짜, 노선, 스케줄 번호에 대한 상세 시간표를 조회합니다.

- **GET** `http://rukeras.com:3000/shuttle/schedule/detail`
- **Query Parameters:**
  - `date` (string, required): 조회할 날짜 (YYYY-MM-DD 형식)
  - `route` (string, required): 노선 번호 ("1" 또는 "2")
  - `schedule` (string, required): 스케줄 번호 (예: "1", "2")

**예시 요청:**
```
GET http://rukeras.com:3000/shuttle/schedule/detail?date=2023-01-01&route=1&schedule=1
```

**응답 예시 (성공 시):**
```json
{
  "success": true,
  "data": {
    "date": "2023-01-01",
    "dayType": "weekday",
    "route": "1",
    "scheduleNumber": "1",
    "stops": {
      "pos1": "08:00",
      "pos2": "08:05",
      "pos3": "08:10",
      "pos4": "08:15",
      "pos5": "08:20",
      "pos6": "08:25",
      "pos7": "08:30"
    }
  },
  "message": "상세 시간표 조회 성공"
}
```

---

## 셔틀버스 노선 정보

### 노선 정보

#### 노선 1: 아산캠퍼스 → 천안캠퍼스
- **pos1**: 아산캠퍼스 (출발지)
- **pos7**: 천안캠퍼스 (도착지)

#### 노선 2: 천안캠퍼스 → 아산캠퍼스
- **pos1**: 천안캠퍼스 (출발지)
- **pos7**: 아산캠퍼스 (도착지)

### 요일 타입
- **weekday**: 월요일 ~ 금요일
- **saturday**: 토요일
- **sunday**: 일요일 및 공휴일

### 오류 코드
- **400**: 잘못된 요청 (필수 파라미터 누락, 잘못된 형식 등)
- **500**: 서버 내부 오류

### 참고사항
- 모든 시간은 24시간 형식(HH:MM)으로 표시됩니다.
- 서버 시작 시 모든 시간표 데이터가 메모리에 로드됩니다.
- 파일 로딩에 실패한 경우 기본값으로 동작합니다.
