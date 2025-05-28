const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

// 캠퍼스 정보
const CAMPUS_INFO = {
  asan: {
    name: "아산캠퍼스",
    imagePath: path.join(process.cwd(), "assets", "Asan_campus.gif"),
    jsonPath: path.join(process.cwd(), "assets", "Asan_Campus.json"),
  },
  cheonan: {
    name: "천안캠퍼스",
    imagePath: path.join(process.cwd(), "assets", "Cheonan_Campus.gif"),
    jsonPath: path.join(process.cwd(), "assets", "Cheonan_Campus.json"),
  },
};

// 캠퍼스 JSON 데이터를 메모리에 저장할 객체
const campusDataCache = {};

// 기본값 데이터 (파일 로딩 실패 시 사용)
const getDefaultCampusData = () => {
  return {
    error: "캠퍼스 데이터를 로딩할 수 없습니다.",
    buildings: [],
    facilities: [],
  };
};

// 모든 캠퍼스 JSON 데이터 미리 로딩
const loadAllCampusData = () => {
  console.log("캠퍼스 데이터 로딩 시작...");

  const campusKeys = Object.keys(CAMPUS_INFO);
  let successCount = 0;
  let failCount = 0;

  campusKeys.forEach((campusKey) => {
    const campusInfo = CAMPUS_INFO[campusKey];

    try {
      const rawData = fs.readFileSync(campusInfo.jsonPath, "utf8");
      const jsonData = JSON.parse(rawData);

      campusDataCache[campusKey] = jsonData;
      console.log(`✅ 로딩 성공: ${campusInfo.name} (${path.basename(campusInfo.jsonPath)})`);
      successCount++;
    } catch (error) {
      console.error(`❌ 로딩 실패: ${campusInfo.name} (${path.basename(campusInfo.jsonPath)})`);
      console.error(`   에러 내용: ${error.message}`);

      // 기본값으로 설정
      campusDataCache[campusKey] = getDefaultCampusData();
      failCount++;
    }
  });

  console.log(`캠퍼스 데이터 로딩 완료 - 성공: ${successCount}개, 실패: ${failCount}개`);

  if (failCount > 0) {
    console.warn(`⚠️  ${failCount}개 파일 로딩에 실패했습니다. 해당 캠퍼스는 기본값으로 동작합니다.`);
  }
};

// 서버 시작 시 데이터 로딩
loadAllCampusData();

// 캐시에서 캠퍼스 데이터 조회
const getCampusData = (campusKey) => {
  const data = campusDataCache[campusKey];
  if (!data) {
    console.error(`캐시에서 데이터를 찾을 수 없습니다: ${campusKey}`);
    return getDefaultCampusData();
  }
  return data;
};

// 캠퍼스 정보 조회 API
router.get("/:campus", (req, res) => {
  try {
    const { campus } = req.params;
    const campusKey = campus.toLowerCase();
    const campusInfo = CAMPUS_INFO[campusKey];

    if (!campusInfo) {
      return res.status(404).json({
        success: false,
        message: "유효하지 않은 캠퍼스입니다. 'asan' 또는 'cheonan'을 입력해주세요.",
      });
    }

    // 캐시에서 JSON 데이터 조회
    const jsonData = getCampusData(campusKey);

    res.json({
      success: true,
      campus: campusInfo.name,
      imageUrl: `/campus_map/${campus}/image`,
      data: jsonData,
    });
  } catch (error) {
    console.error(`캠퍼스 정보 조회 중 오류 발생: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
      error: error.message,
    });
  }
});

// 캠퍼스 이미지 조회 API
router.get("/:campus/image", (req, res) => {
  try {
    const { campus } = req.params;
    const campusData = CAMPUS_INFO[campus.toLowerCase()];

    if (!campusData) {
      return res.status(404).json({
        success: false,
        message: "유효하지 않은 캠퍼스입니다.",
      });
    }

    // 이미지 파일이 존재하는지 확인
    if (!fs.existsSync(campusData.imagePath)) {
      return res.status(404).json({
        success: false,
        message: "이미지를 찾을 수 없습니다.",
      });
    }

    // 이미지 파일 전송
    res.sendFile(campusData.imagePath);
  } catch (error) {
    console.error(`이미지 조회 중 오류 발생: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "이미지 로딩 중 오류가 발생했습니다.",
      error: error.message,
    });
  }
});

// 캐시 상태 확인 API (디버깅용)
router.get("/cache/status", (req, res) => {
  const cacheStatus = {};

  Object.keys(CAMPUS_INFO).forEach((campusKey) => {
    const data = campusDataCache[campusKey];
    const campusInfo = CAMPUS_INFO[campusKey];

    cacheStatus[campusKey] = {
      campusName: campusInfo.name,
      loaded: !!data,
      isDefault: data && data.hasOwnProperty("error"),
      dataKeys: data ? Object.keys(data) : [],
    };
  });

  res.json({
    success: true,
    data: cacheStatus,
    message: "캠퍼스 데이터 캐시 상태 조회 성공",
  });
});

module.exports = router;
