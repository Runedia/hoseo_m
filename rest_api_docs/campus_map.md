# Campus Map API Documentation

호서대학교 캠퍼스 맵 관련 REST API 문서입니다.

## Base URL
```
/campus_map
```

## 개요

호서대학교 각 캠퍼스의 건물 및 시설 정보를 제공하는 API입니다.
- 캠퍼스 맵 이미지 제공
- 건물/시설 번호-명칭 매핑 데이터 제공
- 메모리 캐싱으로 빠른 응답 제공

## 지원 캠퍼스

| Campus Code | 이름 | 설명 |
|-------------|------|------|
| `asan` | 아산캠퍼스 | 아산캠퍼스 건물 정보 (44개) |
| `cheonan` | 천안캠퍼스 | 천안캠퍼스 건물 정보 |

---

## API Endpoints

### 1. 캠퍼스 정보 조회

지정된 캠퍼스의 건물/시설 정보를 조회합니다.

**Endpoint:** `GET /campus_map/:campus`

#### Request Parameters (Path)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campus` | string | ✅ | 캠퍼스 코드 (`asan` 또는 `cheonan`) |

#### Example Request
```bash
GET /campus_map/asan
```

#### Success Response (200)
```json
{
  "success": true,
  "campus": "아산캠퍼스",
  "imageUrl": "/campus_map/asan/image",
  "data": {
    "1": "대학교회",
    "2": "대학본부",
    "3": "학생회관",
    "4": "학술지원동",
    "5": "가공학및발효실험동",
    "6": "소프트볼장",
    "7": "운동장",
    "8": "학군단",
    "9": "자동차공학전공 실습장",
    "10": "테니스장",
    "11": "체육관",
    "12": "산업안전동",
    "13": "자연과학관",
    "14": "학생창업보육센터",
    "15": "건축학부실험동",
    "16": "골프전공 실습장",
    "17": "교직원회관",
    "18": "제2공학관",
    "19": "제1공학관",
    "20": "보건과학관",
    "21": "조형과학관",
    "22": "강석규교육관",
    "23": "예술관",
    "24": "산학협동 1호관",
    "25": "산학협동 2호관",
    "26": "학생식당",
    "27": "안전성평가센터(GLP)",
    "28": "호서벤처벨리",
    "29": "후생관",
    "30": "생활관 G동",
    "31": "생활관 F동",
    "32": "생활관 E동",
    "33": "생활관 D동",
    "34": "생화관 C동",
    "35": "외국인교수 사택",
    "36": "생활관 B동",
    "37": "생활관 A동",
    "38": "학생벤처창업관",
    "39": "벤처창업기업관",
    "40": "벤처창조융합관",
    "41": "벤처산학협력관",
    "42": "교육문화관",
    "43": "학술정보관",
    "44": "행복기숙사"
  }
}
```

#### Error Response (404)
```json
{
  "success": false,
  "message": "유효하지 않은 캠퍼스입니다. 'asan' 또는 'cheonan'을 입력해주세요."
}
```

#### Error Response (500)
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다.",
  "error": "Error details"
}
```

---

### 2. 캠퍼스 이미지 조회

캠퍼스 맵 이미지를 조회합니다.

**Endpoint:** `GET /campus_map/:campus/image`

#### Request Parameters (Path)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campus` | string | ✅ | 캠퍼스 코드 (`asan` 또는 `cheonan`) |

#### Example Request
```bash
GET /campus_map/asan/image
```

#### Success Response (200)
- **Content-Type**: `image/gif`
- **Body**: 이미지 바이너리 데이터

#### Error Response (404)
```json
{
  "success": false,
  "message": "유효하지 않은 캠퍼스입니다."
}
```

또는

```json
{
  "success": false,
  "message": "이미지를 찾을 수 없습니다."
}
```

#### Error Response (500)
```json
{
  "success": false,
  "message": "이미지 로딩 중 오류가 발생했습니다.",
  "error": "Error details"
}
```

---

### 3. 캐시 상태 확인 (디버깅용)

서버 내부 캠퍼스 데이터 캐시 상태를 확인합니다.

**Endpoint:** `GET /campus_map/cache/status`

#### Example Request
```bash
GET /campus_map/cache/status
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "asan": {
      "campusName": "아산캠퍼스",
      "loaded": true,
      "isDefault": false,
      "dataKeys": ["1", "2", "3", "...", "44"]
    },
    "cheonan": {
      "campusName": "천안캠퍼스",
      "loaded": true,
      "isDefault": false,
      "dataKeys": ["1", "2", "3", "..."]
    }
  },
  "message": "캠퍼스 데이터 캐시 상태 조회 성공"
}
```

---

## 데이터 구조

### 캠퍼스 데이터 구조

캠퍼스 데이터는 간단한 **번호-건물명 매핑** 구조로 제공됩니다.

```json
{
  "1": "대학교회",
  "2": "대학본부",
  "3": "학생회관",
  "4": "학술지원동",
  "...": "...",
  "44": "행복기숙사"
}
```

#### 데이터 특징
- **Key**: 문자열 형태의 순차 번호 ("1", "2", "3", ...)
- **Value**: 건물/시설의 한글 명칭
- **아산캠퍼스**: 44개 건물/시설
- **천안캠퍼스**: 비슷한 구조로 예상됨

#### 주요 건물/시설 유형
- **교육 시설**: 대학본부, 학술정보관, 각종 학관
- **연구 시설**: 자연과학관, 다양한 실험동
- **생활 시설**: 생활관, 학생식당, 후생관
- **체육 시설**: 체육관, 운동장, 테니스장
- **산학 협력**: 벤처 관련 건물들

---

## 파일 저장 경로

### 캠퍼스 데이터 파일
```
assets/
├── Asan_Campus.json          # 아산캠퍼스 건물 데이터
├── Asan_Campus.gif           # 아산캠퍼스 맵 이미지
├── Cheonan_Campus.json       # 천안캠퍼스 건물 데이터
└── Cheonan_Campus.gif        # 천안캠퍼스 맵 이미지
```

---

## 에러 코드

| HTTP Status | Error Type | Description |
|-------------|------------|-------------|
| 200 | OK | 요청 성공 |
| 404 | Not Found | 유효하지 않은 캠퍼스 또는 리소스를 찾을 수 없음 |
| 500 | Internal Server Error | 서버 내부 오류 |

---

## 사용 예시

### 1. 아산캠퍼스 정보 조회
```bash
curl "http://localhost:3000/campus_map/asan"
```

### 2. 천안캠퍼스 정보 조회
```bash
curl "http://localhost:3000/campus_map/cheonan"
```

### 3. 아산캠퍼스 이미지 다운로드
```bash
curl "http://localhost:3000/campus_map/asan/image" -o asan_campus.gif
```

### 4. 천안캠퍼스 이미지 다운로드
```bash
curl "http://localhost:3000/campus_map/cheonan/image" -o cheonan_campus.gif
```

### 5. 캐시 상태 확인
```bash
curl "http://localhost:3000/campus_map/cache/status"
```

### 6. 브라우저에서 직접 이미지 조회
```
http://localhost:3000/campus_map/asan/image
http://localhost:3000/campus_map/cheonan/image
```

---

## 주요 기능

### 💾 **메모리 캐싱**
- 서버 시작 시 모든 캠퍼스 데이터를 메모리에 로딩
- 빠른 응답 속도 제공
- 파일 읽기 오버헤드 최소화

### 🗺️ **이미지 제공**
- GIF 형식의 캠퍼스 맵 이미지 제공
- 브라우저에서 직접 조회 가능
- 다운로드 지원

### 🏢 **건물 정보**
- 번호 기반 건물/시설 매핑
- 교육, 연구, 생활, 체육, 산학협력 시설 분류
- 한글 명칭 제공

### 🔧 **디버깅 지원**
- 캐시 상태 확인 API
- 로딩 상태 및 오류 정보 제공
- 개발 및 운영 환경 모니터링

---

## 주의사항

1. **캐싱**: 서버 시작 시 모든 캠퍼스 데이터를 메모리에 로딩하여 빠른 응답 제공합니다.

2. **이미지 형식**: 캠퍼스 맵 이미지는 GIF 형식으로 제공됩니다.

3. **데이터 파일**: 
   - 아산캠퍼스: `assets/Asan_Campus.json`, `assets/Asan_Campus.gif`
   - 천안캠퍼스: `assets/Cheonan_Campus.json`, `assets/Cheonan_Campus.gif`

4. **파일 의존성**: JSON 또는 이미지 파일이 없으면 기본값 또는 오류 응답이 반환됩니다.

---

*Last Updated: 2025-05-29*
