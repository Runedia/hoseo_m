# Campus Map API Documentation

호서대학교 캠퍼스 맵 관련 REST API 문서입니다.

## Base URL
```
/campus_map
```

## 개요

호서대학교 각 캠퍼스의 건물 및 시설 정보를 제공하는 API입니다.
- 캠퍼스 맵 이미지 제공
- 건물/시설 정보 데이터 제공
- 메모리 캐싱으로 빠른 응답 제공

## 지원 캠퍼스

| Campus Code | 이름 | 설명 |
|-------------|------|------|
| `asan` | 아산캠퍼스 | 아산캠퍼스 건물 및 시설 정보 |
| `cheonan` | 천안캠퍼스 | 천안캠퍼스 건물 및 시설 정보 |

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
    "buildings": [...],
    "facilities": [...]
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

## 데이터 구조

### 캠퍼스 데이터 구조

캠퍼스 데이터는 JSON 형태로 제공되며, 구체적인 구조는 각 캠퍼스 JSON 파일에 정의됩니다.

#### 기본 구조
```json
{
  "buildings": [...],
  "facilities": [...]
}
```

#### 에러 발생 시 기본값
```json
{
  "error": "캠퍼스 데이터를 로딩할 수 없습니다.",
  "buildings": [],
  "facilities": []
}
```

---

## 파일 저장 경로

### 캠퍼스 데이터 파일
```
assets/
├── Asan_Campus.json          # 아산캠퍼스 건물 데이터
├── Asan_campus.gif           # 아산캠퍼스 맵 이미지
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

### 5. 브라우저에서 직접 이미지 조회
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
- JSON 형태의 캠퍼스 건물 및 시설 정보
- 구조화된 데이터 제공
- 로딩 실패 시 기본값 제공

### 🔧 **오류 처리**
- 파일 로딩 실패 시 기본값 제공
- 상세한 에러 메시지 제공
- 로딩 상태 콘솔 출력

---

## 주요 변경사항

### 제거된 기능
- **캐시 상태 확인 API** (`/cache/status`): 디버깅용으로 미사용 처리됨

### 개선된 기능
- **에러 처리**: 파일 로딩 실패 시 기본값 데이터 제공
- **로딩 상태**: 서버 시작 시 로딩 성공/실패 상태 콘솔 출력
- **데이터 구조**: 유연한 JSON 구조 지원

---

## 주의사항

1. **캐싱**: 서버 시작 시 모든 캠퍼스 데이터를 메모리에 로딩하여 빠른 응답 제공합니다.

2. **이미지 형식**: 캠퍼스 맵 이미지는 GIF 형식으로 제공됩니다.

3. **데이터 파일**: 
   - 아산캠퍼스: `assets/Asan_Campus.json`, `assets/Asan_campus.gif`
   - 천안캠퍼스: `assets/Cheonan_Campus.json`, `assets/Cheonan_Campus.gif`

4. **파일 의존성**: JSON 또는 이미지 파일이 없으면 기본값 또는 오류 응답이 반환됩니다.

5. **디버깅 API**: 캐시 상태 확인 API는 제거되어 더 이상 사용할 수 없습니다.

---

*Last Updated: 2025-06-06*