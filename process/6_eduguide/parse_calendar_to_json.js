const cheerio = require("cheerio");
const fs = require("fs-extra");
const path = require("path");

const INPUT_HTML = path.resolve(process.cwd(), "assets", "학사일정.html");
const OUTPUT_JSON = path.resolve(process.cwd(), "assets", "학사일정_인덱스.json");

// 날짜 파싱 함수 (기존과 동일)
function parseDate(dateStr, year = 2025) {
  dateStr = dateStr.trim();
  
  if (dateStr.includes("2026")) {
    year = 2026;
    dateStr = dateStr.replace("2026.", "");
  }
  
  const results = [];
  
  if (dateStr.includes("~")) {
    const [startPart, endPart] = dateStr.split("~").map(s => s.trim());
    
    const startMatch = startPart.match(/(\d+)\([^)]+\)/);
    if (startMatch) {
      const startDay = parseInt(startMatch[1]);
      
      let endDay, endMonth;
      
      const crossMonthMatch = endPart.match(/(\d+)\.\s*(\d+)\.\([^)]+\)/);
      if (crossMonthMatch) {
        endMonth = parseInt(crossMonthMatch[1]);
        endDay = parseInt(crossMonthMatch[2]);
      } else {
        const endMatch = endPart.match(/(\d+)\([^)]+\)/);
        if (endMatch) {
          endDay = parseInt(endMatch[1]);
          endMonth = null;
        }
      }
      
      if (endDay) {
        const currentMonth = getCurrentMonth(dateStr);
        const targetEndMonth = endMonth || currentMonth;
        
        if (endMonth && endMonth !== currentMonth) {
          const daysInCurrentMonth = getDaysInMonth(year, currentMonth);
          for (let day = startDay; day <= daysInCurrentMonth; day++) {
            results.push({ year, month: currentMonth, day });
          }
          for (let day = 1; day <= endDay; day++) {
            results.push({ year, month: targetEndMonth, day });
          }
        } else {
          for (let day = startDay; day <= endDay; day++) {
            results.push({ year, month: currentMonth, day });
          }
        }
      }
    }
  } else {
    const singleMatch = dateStr.match(/(\d+)\([^)]+\)/);
    if (singleMatch) {
      const day = parseInt(singleMatch[1]);
      const month = getCurrentMonth(dateStr);
      results.push({ year, month, day });
    }
  }
  
  return results;
}

let currentProcessingMonth = 1;

function getCurrentMonth(dateStr) {
  return currentProcessingMonth;
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function getMonthNumber(monthText) {
  const monthMap = {
    "1월": 1, "2월": 2, "3월": 3, "4월": 4, "5월": 5, "6월": 6,
    "7월": 7, "8월": 8, "9월": 9, "10월": 10, "11월": 11, "12월": 12,
  };
  
  if (monthText.includes("2026")) {
    const match = monthText.match(/(\d+)월/);
    return match ? parseInt(match[1]) : 1;
  }
  
  return monthMap[monthText] || 1;
}

// 새로운 구조로 데이터 변환
async function parseCalendarToNestedStructure() {
  try {
    console.log("📅 학사일정 HTML 파싱 시작 (중첩 구조)...");
    
    if (!fs.existsSync(INPUT_HTML)) {
      throw new Error(`학사일정 HTML 파일을 찾을 수 없습니다: ${INPUT_HTML}`);
    }
    
    const htmlContent = fs.readFileSync(INPUT_HTML, "utf-8");
    const $ = cheerio.load(htmlContent);
    
    // 년도별 데이터 구조: { 2025: { 1: { 1: { 1: {event, dateOriginal}, 2: {...} } } } }
    const calendarData = {};
    
    // 각 월별 일정 파싱
    $('#academic_scd01 ul > li').each((index, element) => {
      const $li = $(element);
      
      // 월 정보 추출
      const monthText = $li.find('.box-month').text().trim();
      currentProcessingMonth = getMonthNumber(monthText);
      const year = monthText.includes("2026") ? 2026 : 2025;
      
      console.log(`📌 ${monthText} 처리 중...`);
      
      // 해당 월의 일정들 처리
      $li.find('.list-box').each((i, listBox) => {
        const $box = $(listBox);
        const dateText = $box.find('.list-date em').text().trim();
        const eventText = $box.find('.list-content').text().trim();
        
        if (dateText && eventText) {
          // 날짜 파싱
          const dates = parseDate(dateText, year);
          
          // 각 날짜에 대해 이벤트 추가
          dates.forEach(dateInfo => {
            const { year: eventYear, month, day } = dateInfo;
            
            // 년도 초기화
            if (!calendarData[eventYear]) {
              calendarData[eventYear] = {};
            }
            
            // 월 초기화
            if (!calendarData[eventYear][month]) {
              calendarData[eventYear][month] = {};
            }
            
            // 일 초기화
            if (!calendarData[eventYear][month][day]) {
              calendarData[eventYear][month][day] = {};
            }
            
            // 해당 날짜의 이벤트 개수 확인 후 인덱스 할당
            const existingEvents = Object.keys(calendarData[eventYear][month][day]);
            const eventIndex = existingEvents.length + 1;
            
            // 이벤트 추가
            calendarData[eventYear][month][day][eventIndex] = {
              dateOriginal: dateText,
              event: eventText
            };
          });
          
          console.log(`  ✅ ${dateText} → ${eventText} (${dates.length}개 날짜)`);
        }
      });
    });
    
    // JSON 파일로 저장
    await fs.writeFile(OUTPUT_JSON, JSON.stringify(calendarData, null, 2), "utf-8");
    
    console.log("\\n🎉 학사일정 중첩 구조 JSON 변환 완료!");
    console.log(`📁 저장 위치: ${OUTPUT_JSON}`);
    
    // 통계 정보 출력
    let totalEvents = 0;
    let totalDays = 0;
    
    Object.keys(calendarData).forEach(year => {
      Object.keys(calendarData[year]).forEach(month => {
        Object.keys(calendarData[year][month]).forEach(day => {
          totalDays++;
          totalEvents += Object.keys(calendarData[year][month][day]).length;
        });
      });
    });
    
    console.log(`📊 총 이벤트 수: ${totalEvents}개`);
    console.log(`📅 총 날짜 수: ${totalDays}개`);
    
    // 샘플 데이터 출력
    console.log("\\n📋 샘플 데이터 구조:");
    const sampleYear = Object.keys(calendarData)[0];
    const sampleMonth = Object.keys(calendarData[sampleYear])[0];
    const sampleDay = Object.keys(calendarData[sampleYear][sampleMonth])[0];
    
    console.log(`${sampleYear}년 ${sampleMonth}월 ${sampleDay}일:`, 
      JSON.stringify(calendarData[sampleYear][sampleMonth][sampleDay], null, 2));
    
    return calendarData;
    
  } catch (error) {
    console.error("❌ 오류 발생:", error.message);
    throw error;
  }
}

// 실행
async function main() {
  await parseCalendarToNestedStructure();
}

// 모듈로 export
module.exports = {
  parseCalendarToNestedStructure
};

// 직접 실행 시
if (require.main === module) {
  main().catch(console.error);
}
