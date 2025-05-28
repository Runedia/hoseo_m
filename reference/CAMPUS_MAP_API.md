# 캠퍼스 지도 API 문서

이 문서는 호서대학교 모바일 앱의 캠퍼스 지도 관련 API에 대한 참조 문서입니다.

## 기본 정보

- **기본 URL**: `/api/campus_map`
- **Content-Type**: `application/json`
- **인증**: 인증이 필요하지 않습니다.

## 1. 캠퍼스 정보 조회

캠퍼스의 기본 정보와 JSON 데이터를 조회합니다.

### 요청

- **URL**: `/:campus`
- **Method**: `GET`
- **Path Parameters**:
  - `campus` (필수): 조회할 캠퍼스 (`asan` 또는 `cheonan`)

### 응답

#### 성공 시 (200 OK)

```json
{
  "success": true,
  "campus": "아산캠퍼스",
  "imageUrl": "/campus_map/asan/image",
  "data": {
    // 캠퍼스별 JSON 데이터
  }
}
```

#### 오류 응답

##### 404 Not Found
```json
{
  "success": false,
  "message": "유효하지 않은 캠퍼스입니다. 'asan' 또는 'cheonan'을 입력해주세요."
}
```

##### 500 Internal Server Error
```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다.",
  "error": "에러 상세 내용"
}
```

## 2. 캠퍼스 지도 이미지 조회

캠퍼스의 지도 이미지를 조회합니다.

### 요청

- **URL**: `/:campus/image`
- **Method**: `GET`
- **Path Parameters**:
  - `campus` (필수): 조회할 캠퍼스 (`asan` 또는 `cheonan`)
- **응답 형식**: 이미지 파일 (GIF)

### 응답

#### 성공 시 (200 OK)
- **Content-Type**: `image/gif`
- **Body**: 이미지 바이너리 데이터

#### 오류 응답

##### 404 Not Found
```json
{
  "success": false,
  "message": "이미지를 찾을 수 없습니다."
}
```

##### 500 Internal Server Error
```json
{
  "success": false,
  "message": "이미지 로딩 중 오류가 발생했습니다.",
  "error": "에러 상세 내용"
}
```

## 3. 지원하는 캠퍼스

| 캠퍼스 코드 | 캠퍼스명   |
|------------|-----------|
| asan      | 아산캠퍼스 |
| cheonan   | 천안캠퍼스 |

## 4. 예제

### 아산캠퍼스 정보 조회

**요청**
```
GET /api/campus_map/asan
```

**응답**
```json
{
  "success": true,
  "campus": "아산캠퍼스",
  "imageUrl": "/campus_map/asan/image",
  "data": {
    // 아산캠퍼스 JSON 데이터
  }
}
```

### 천안캠퍼스 이미지 조회

**요청**
```
GET /api/campus_map/cheonan/image
```

**응답**
- **Content-Type**: `image/gif`
- **Body**: 천안캠퍼스 지도 이미지 (GIF)

## 5. 오류 코드

| HTTP 상태 코드 | 설명 |
|--------------|------|
| 200 | 요청 성공 |
| 404 | 요청한 리소스를 찾을 수 없음 |
| 500 | 서버 내부 오류 |
