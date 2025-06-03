require("module-alias/register");

const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

// 시간표 데이터를 메모리에 저장할 객체
const scheduleCache = {};

// 파일명 매핑
const getFileName = (route, dayType) => {
  const fileMap = {
    1: {
      // 아캠 → 천캠
      weekday: "셔틀(아캠_천캠_월금).json",
      saturday: "셔틀(아캠_천캠_토요일).json",
      sunday: "셔틀(아캠_천캠_일요일_공휴일).json",
    },
    2: {
      // 천캠 → 아캠
      weekday: "셔틀(천캠_아캠_월금).json",
      saturday: "셔틀(천캠_아캠_토요일).json",
      sunday: "셔틀(천캠_아캠_일요일_공휴일).json",
    },
  };

  return fileMap[route]?.[dayType];
};

// 기본값 데이터 (파일 로딩 실패 시 사용)
const getDefaultSchedule = () => {
  return {
    error: {
      pos1: "",
      pos2: "",
      pos3: "",
      pos4: "",
      pos5: "",
      pos6: "",
      pos7: "",
    },
  };
};

// 모든 시간표 데이터 미리 로딩
const loadAllScheduleData = () => {
  console.log("셔틀 시간표 데이터 로딩 시작...");

  const routes = ["1", "2"];
  const dayTypes = ["weekday", "saturday", "sunday"];
  let successCount = 0;
  let failCount = 0;

  routes.forEach((route) => {
    dayTypes.forEach((dayType) => {
      const fileName = getFileName(route, dayType);
      const cacheKey = `${route}_${dayType}`;

      try {
        const dataPath = path.join(process.cwd(), "assets", fileName);
        const rawData = fs.readFileSync(dataPath, "utf8");
        const jsonData = JSON.parse(rawData);

        scheduleCache[cacheKey] = jsonData;
        console.log(`✅ 로딩 성공: ${fileName}`);
        successCount++;
      } catch (error) {
        console.error(`❌ 로딩 실패: ${fileName}`);
        console.error(`   에러 내용: ${error.message}`);

        // 기본값으로 설정
        scheduleCache[cacheKey] = getDefaultSchedule();
        failCount++;
      }
    });
  });

  console.log(`셔틀 시간표 데이터 로딩 완료 - 성공: ${successCount}개, 실패: ${failCount}개`);

  if (failCount > 0) {
    console.warn(`⚠️  ${failCount}개 파일 로딩에 실패했습니다. 해당 노선은 기본값으로 동작합니다.`);
  }
};

// 서버 시작 시 데이터 로딩
loadAllScheduleData();

// 요일 체크 함수 (월요일=1, 화요일=2, ..., 일요일=0)
const getDayType = (dateString) => {
  const date = new Date(dateString);
  const dayOfWeek = date.getDay();

  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    return "weekday"; // 평일 (월~금)
  } else if (dayOfWeek === 6) {
    return "saturday"; // 토요일
  } else {
    return "sunday"; // 일요일
  }
};

// 캐시에서 시간표 데이터 조회
const getScheduleData = (route, dateString) => {
  const dayType = getDayType(dateString);
  const cacheKey = `${route}_${dayType}`;

  const data = scheduleCache[cacheKey];
  if (!data) {
    console.error(`캐시에서 데이터를 찾을 수 없습니다: ${cacheKey}`);
    return getDefaultSchedule();
  }

  return data;
};

// 시간표 조회 API
router.get("/schedule", (req, res) => {
  try {
    const { date, route } = req.query;

    // 필수 파라미터 체크
    if (!date || !route) {
      return res.status(400).json({
        success: false,
        message: "날짜(date)와 노선 번호(route)가 필요합니다.",
      });
    }

    // 날짜 형식 검증
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        message: "날짜는 YYYY-MM-DD 형식이어야 합니다.",
      });
    }

    // 노선 번호 체크
    if (route !== "1" && route !== "2") {
      return res.status(400).json({
        success: false,
        message: "현재 노선 1번, 2번만 지원됩니다.",
      });
    }

    // 캐시에서 시간표 데이터 조회
    const scheduleData = getScheduleData(route, date);

    const filteredSchedule = {};
    let newBusNumber = 1; // 새로운 연속 번호

    Object.keys(scheduleData).forEach((busNumber) => {
      const busData = scheduleData[busNumber];

      // pos1부터 pos7까지 모든 값이 존재하는지 확인
      const positions = [
        busData.pos1,
        busData.pos2,
        busData.pos3,
        busData.pos4,
        busData.pos5,
        busData.pos6,
        busData.pos7,
      ];

      // 모든 position이 존재하고 비어있지 않은 경우에만 포함
      const allPositionsValid = positions.every((pos) => pos && pos.trim() !== "");

      if (allPositionsValid) {
        // 새로운 연속 번호로 저장
        filteredSchedule[newBusNumber] = {
          origin_idx: busNumber, // 원래 버스 번호 저장
          pos1: busData.pos1,
          pos2: busData.pos2,
          pos3: busData.pos3,
          pos4: busData.pos4,
          pos5: busData.pos5,
          pos6: busData.pos6,
          pos7: busData.pos7,
        };
        newBusNumber++; // 다음 번호로 증가
      }
    });

    // 요일 타입 정보 추가
    const dayType = getDayType(date);

    // 응답
    res.json({
      success: true,
      data: {
        date: date,
        dayType: dayType,
        route: route,
        schedule: filteredSchedule,
      },
      message: "시간표 조회 성공",
    });
  } catch (error) {
    console.error("API 오류:", error);
    res.status(500).json({
      success: false,
      message: "서버 내부 오류가 발생했습니다.",
    });
  }
});

// 시간표 상세 조회 API
router.get("/schedule/detail", (req, res) => {
  try {
    const { date, route, schedule } = req.query;

    // 필수 파라미터 체크
    if (!date || !route || !schedule) {
      return res.status(400).json({
        success: false,
        message: "날짜(date), 노선 번호(route), 스케줄 번호(schedule)가 필요합니다.",
      });
    }

    // 날짜 형식 검증
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        message: "날짜는 YYYY-MM-DD 형식이어야 합니다.",
      });
    }

    // 노선 번호 체크
    if (route !== "1" && route !== "2") {
      return res.status(400).json({
        success: false,
        message: "현재 노선 1번, 2번만 지원됩니다.",
      });
    }

    // 캐시에서 시간표 데이터 조회
    const scheduleData = getScheduleData(route, date);

    // 해당 스케줄이 존재하는지 확인
    if (!scheduleData[schedule]) {
      return res.status(404).json({
        success: false,
        message: `스케줄 번호 ${schedule}을(를) 찾을 수 없습니다.`,
      });
    }

    // 해당 스케줄의 상세 데이터 (pos1~pos7)
    const detailSchedule = scheduleData[schedule];

    // 요일 타입 정보 추가
    const dayType = getDayType(date);

    // 응답
    res.json({
      success: true,
      data: {
        date: date,
        dayType: dayType,
        route: route,
        scheduleNumber: schedule,
        detail: detailSchedule,
      },
      message: "시간표 상세 조회 성공",
    });
  } catch (error) {
    console.error("API 오류:", error);
    res.status(500).json({
      success: false,
      message: "서버 내부 오류가 발생했습니다.",
    });
  }
});

// 캐시 상태 확인 API (디버깅용)
router.get("/cache/status", (req, res) => {
  const cacheStatus = {};

  Object.keys(scheduleCache).forEach((key) => {
    const data = scheduleCache[key];
    cacheStatus[key] = {
      loaded: !!data,
      scheduleCount: Object.keys(data).length,
      isDefault: data.hasOwnProperty("error"),
    };
  });

  res.json({
    success: true,
    data: cacheStatus,
    message: "캐시 상태 조회 성공",
  });
});

module.exports = router;
