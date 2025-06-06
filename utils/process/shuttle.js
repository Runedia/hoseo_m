/**
 * 셔틀버스 시간표 파싱 유틸리티
 *
 * 호서대학교 셔틀버스 시간표 HTML을 파싱하여 JSON 형태로 변환하는 공통 함수들을 제공합니다.
 *
 */

require("module-alias/register");

const path = require("path");
const { readFileSafe, saveJsonFile, ensureDirectoryExists } = require("@root/utils/process/file");

/**
 * 시간 형식 체크 함수
 * @param {string} text - 체크할 텍스트
 * @returns {boolean} 시간 형식 여부 (12:34 또는 09:26(KTX캠퍼스09:26) 등)
 */
function isTimeFormat(text) {
  return /^\d{1,2}:\d{2}(\([^)]+\))?$/.test(text.trim());
}

/**
 * 셔틀버스 시간표 파싱 공통 함수
 *
 * HTML 테이블에서 셔틀버스 시간표를 파싱하여 JSON 파일로 저장합니다.
 * 아산캠퍼스 ↔ 천안캠퍼스 양방향 시간표를 각각 생성합니다.
 *
 * @param {string} htmlFilePath - HTML 파일 경로
 * @param {string} tableSelector - 파싱할 테이블의 CSS 선택자
 * @param {string} outputDir - 출력 디렉토리 경로
 * @param {string} filePrefix - 출력 파일명 접두사 (예: "월금", "토요일")
 * @returns {Promise<Object>} 파싱 결과 정보
 */
async function parseShuttleSchedule(htmlFilePath, tableSelector, outputDir, filePrefix) {
  try {
    console.log(`🚌 셔틀 시간표 파싱 시작: ${path.basename(htmlFilePath)}`);

    // HTML 파일 읽기
    const html = await readFileSafe(htmlFilePath);
    if (!html) {
      throw new Error(`HTML 파일을 읽을 수 없습니다: ${htmlFilePath}`);
    }

    const cheerio = require("cheerio");
    const $ = cheerio.load(html);

    // 테이블 선택
    const table = $(tableSelector);
    if (!table.length) {
      throw new Error(`테이블을 찾을 수 없습니다: ${tableSelector}`);
    }

    const rows = table.find("tr").slice(2); // 앞 2줄은 헤더
    console.log(`📊 처리할 행 수: ${rows.length}개`);

    const asanToCheonan = {}; // 아산캠퍼스 → 천안캠퍼스
    const cheonanToAsan = {}; // 천안캠퍼스 → 아산캠퍼스

    rows.each((i, row) => {
      const cells = $(row).find("td");
      if (!cells.length) return;

      const count = $(cells[0]).text().trim();

      // 아산 → 천안 (2~8번째 컬럼, pos1~pos7)
      asanToCheonan[count] = {};
      let asanPosIndex = 1;

      for (let j = 1; j <= 7 && j < cells.length; j++) {
        const cell = $(cells[j]);
        const colspan = parseInt(cell.attr("colspan") || "1");
        let value = cell.text().replace(/\s+/g, "").trim();

        // colspan이 1이면 정상적인 시간 데이터
        if (colspan === 1) {
          if (asanPosIndex <= 7) {
            asanToCheonan[count][`pos${asanPosIndex}`] = isTimeFormat(value) ? value : "";
            asanPosIndex++;
          }
        } else {
          // colspan이 1보다 크면 비어있는 cell로 처리
          for (let k = 0; k < colspan && asanPosIndex <= 7; k++) {
            asanToCheonan[count][`pos${asanPosIndex}`] = "";
            asanPosIndex++;
          }
        }
      }

      // 나머지 위치들을 빈 문자열로 채우기
      for (let k = asanPosIndex; k <= 7; k++) {
        asanToCheonan[count][`pos${k}`] = "";
      }

      // 천안 → 아산 (9~15번째 컬럼, pos1~pos7)
      cheonanToAsan[count] = {};
      let cheonanPosIndex = 1;

      for (let j = 8; j <= 14 && j < cells.length; j++) {
        const cell = $(cells[j]);
        const colspan = parseInt(cell.attr("colspan") || "1");
        let value = cell.text().replace(/\s+/g, "").trim();

        // colspan이 1이면 정상적인 시간 데이터
        if (colspan === 1) {
          if (cheonanPosIndex <= 7) {
            cheonanToAsan[count][`pos${cheonanPosIndex}`] = isTimeFormat(value) ? value : "";
            cheonanPosIndex++;
          }
        } else {
          // colspan이 1보다 크면 비어있는 cell로 처리
          for (let k = 0; k < colspan && cheonanPosIndex <= 7; k++) {
            cheonanToAsan[count][`pos${cheonanPosIndex}`] = "";
            cheonanPosIndex++;
          }
        }
      }

      // 나머지 위치들을 빈 문자열로 채우기
      for (let k = cheonanPosIndex; k <= 7; k++) {
        cheonanToAsan[count][`pos${k}`] = "";
      }
    });

    // 출력 디렉토리 생성
    await ensureDirectoryExists(outputDir);

    // JSON 파일 저장
    const asanToCheonanPath = path.join(outputDir, `셔틀(아캠_천캠_${filePrefix}).json`);
    const cheonanToAsanPath = path.join(outputDir, `셔틀(천캠_아캠_${filePrefix}).json`);

    await saveJsonFile(asanToCheonanPath, asanToCheonan);
    await saveJsonFile(cheonanToAsanPath, cheonanToAsan);

    console.log(`✅ 완료! JSON 파일 생성:`);
    console.log(`   - ${path.basename(asanToCheonanPath)}`);
    console.log(`   - ${path.basename(cheonanToAsanPath)}`);

    return {
      asanToCheonan: asanToCheonanPath,
      cheonanToAsan: cheonanToAsanPath,
      dataCount: Object.keys(asanToCheonan).length,
    };
  } catch (error) {
    console.error(`❌ 셔틀 시간표 파싱 실패:`, error.message);
    throw error;
  }
}

/**
 * 셔틀버스 시간표 타입별 설정
 */
const SHUTTLE_CONFIGS = {
  workday: {
    htmlFile: "월금.html",
    tableSelector: 'table[summary*="학기중 운행 시간표"]',
    filePrefix: "월금",
    description: "월요일~금요일 시간표",
  },
  saturday: {
    htmlFile: "토요일.html",
    tableSelector: 'table[summary*="토요일 및 국ㆍ공휴일 운행 시간표"]',
    filePrefix: "토요일",
    description: "토요일 시간표",
  },
  sunday: {
    htmlFile: "일요일(공휴일).html",
    tableSelector: 'table[summary*="토요일 및 국ㆍ공휴일 운행 시간표"]',
    filePrefix: "일요일_공휴일",
    description: "일요일/공휴일 시간표",
  },
};

/**
 * 특정 타입의 셔틀 시간표 처리
 *
 * @param {string} scheduleType - 시간표 타입 ("workday", "saturday", "sunday")
 * @param {string} shuttleDir - 셔틀 HTML 파일들이 있는 디렉토리
 * @param {string} outputDir - 출력 디렉토리 (기본값: assets)
 * @returns {Promise<Object>} 처리 결과
 */
async function processShuttleSchedule(scheduleType, shuttleDir, outputDir = "assets") {
  const config = SHUTTLE_CONFIGS[scheduleType];
  if (!config) {
    throw new Error(`지원하지 않는 시간표 타입: ${scheduleType}`);
  }

  console.log(`🚌 ${config.description} 처리 시작`);

  const htmlPath = path.join(shuttleDir, config.htmlFile);
  const finalOutputDir = path.isAbsolute(outputDir) ? outputDir : path.join(process.cwd(), outputDir);

  return await parseShuttleSchedule(htmlPath, config.tableSelector, finalOutputDir, config.filePrefix);
}

/**
 * 모든 셔틀 시간표 일괄 처리
 *
 * @param {string} shuttleDir - 셔틀 HTML 파일들이 있는 디렉토리
 * @param {string} outputDir - 출력 디렉토리 (기본값: assets)
 * @returns {Promise<Object>} 전체 처리 결과
 */
async function processAllShuttleSchedules(shuttleDir, outputDir = "assets") {
  console.log("🚌 모든 셔틀 시간표 일괄 처리 시작");

  const results = {};
  const scheduleTypes = Object.keys(SHUTTLE_CONFIGS);

  for (const scheduleType of scheduleTypes) {
    try {
      results[scheduleType] = await processShuttleSchedule(scheduleType, shuttleDir, outputDir);
      console.log(`✅ ${SHUTTLE_CONFIGS[scheduleType].description} 완료`);
    } catch (error) {
      console.error(`❌ ${SHUTTLE_CONFIGS[scheduleType].description} 실패:`, error.message);
      results[scheduleType] = { error: error.message };
    }
  }

  console.log("🎉 모든 셔틀 시간표 처리 완료");
  return results;
}

module.exports = {
  parseShuttleSchedule,
  processShuttleSchedule,
  processAllShuttleSchedules,
  isTimeFormat,
  SHUTTLE_CONFIGS,
};
