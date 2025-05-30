const cheerio = require("cheerio");

/**
 * HTML 파싱 공통 유틸리티
 */

/**
 * 텍스트에서 앞의 번호를 제거하는 함수
 * @param {string} text - 처리할 텍스트
 * @returns {string} 번호가 제거된 텍스트
 */
function removeNumberPrefix(text) {
  if (!text) return text;

  // 다양한 번호 패턴 제거
  return text
    .replace(/^\d+\.\s*/, "") // "1. " 형태 제거
    .replace(/^\d+\)\s*/, "") // "1) " 형태 제거
    .replace(/^\d+\s+/, "") // "1 " 형태 제거
    .replace(/^\d+/, "") // 맨 앞 숫자만 있는 경우
    .trim(); // 앞뒤 공백 제거
}

/**
 * 중첩된 리스트를 재귀적으로 파싱하는 함수
 * @param {Object} $elem - jQuery 요소
 * @param {Object} $ - cheerio 인스턴스
 * @param {Array} excludeItems - 제외할 항목 리스트 (선택적)
 * @returns {Object} 파싱된 중첩 리스트
 */
function parseNestedList($elem, $, excludeItems = []) {
  const children = {};
  let childIndex = 1;

  /**
   * 텍스트가 제외 대상인지 확인하는 함수
   */
  function shouldExcludeText(text) {
    return excludeItems.some((excludeItem) => text.toLowerCase().includes(excludeItem.toLowerCase()));
  }

  $elem.children("li").each((liIndex, liElem) => {
    const $li = $(liElem);

    // li의 직속 텍스트만 추출 (하위 ul/ol 제외)
    const directText = $li.clone().children("ul, ol").remove().end().text().trim();

    // 번호 제거 및 텍스트 정리
    const cleanText = removeNumberPrefix(directText);

    // 제외 대상인지 확인
    if (excludeItems.length > 0 && shouldExcludeText(cleanText)) {
      console.log(`🚫 제외된 리스트 아이템: ${cleanText}`);
      return; // 이 아이템을 건너뜀
    }

    // 하위 ul/ol 요소가 있는지 확인
    const nestedList = $li.children("ul, ol");

    if (nestedList.length > 0) {
      // 중첩된 리스트가 있는 경우
      const nestedChildren = parseNestedList(nestedList, $, excludeItems);
      children[childIndex] = {
        text: cleanText,
        children: nestedChildren,
      };
    } else {
      // 중첩된 리스트가 없는 경우
      children[childIndex] = cleanText;
    }

    childIndex++;
  });

  return children;
}

/**
 * HTML을 구조화된 JSON으로 변환하는 공통 함수
 * @param {string} htmlContent - HTML 콘텐츠
 * @param {string} type - 타입 (제외 설정용)
 * @param {Object} configs - 설정 객체 (제외 설정용)
 * @returns {Object} 구조화된 JSON 데이터
 */
function parseToStructuredJSON(htmlContent, type = null, configs = null) {
  const $ = cheerio.load(`<div class="sub-step">${htmlContent}</div>`);
  const result = {};
  let currentIndex = 1;

  // 제외할 항목들 가져오기
  const excludeItems = type && configs && configs[type] && configs[type].excludeItems ? configs[type].excludeItems : [];

  if (excludeItems.length > 0) {
    console.log(`🚫 제외할 항목: ${excludeItems.join(", ")}`);
  }

  /**
   * 텍스트가 제외 대상인지 확인하는 함수
   */
  function shouldExcludeText(text) {
    return excludeItems.some((excludeItem) => text.toLowerCase().includes(excludeItem.toLowerCase()));
  }

  // 헤딩 요소들을 찾아서 주요 섹션으로 분류
  const headings = [];
  $(".sub-step")
    .find("h1, h2, h3, h4, h5, h6")
    .each((i, elem) => {
      const $elem = $(elem);
      const level = parseInt(elem.tagName.charAt(1)); // h1->1, h2->2 등
      const text = $elem.text().trim();

      if (text) {
        headings.push({
          element: $elem,
          level: level,
          text: text,
          index: i,
        });
      }
    });

  console.log(`📋 발견된 헤딩: ${headings.length}개`);

  // 헤딩이 있는 경우: 헤딩별로 섹션 구성
  if (headings.length > 0) {
    headings.forEach((heading, index) => {
      // 헤딩 제목이 제외 대상인지 확인
      if (excludeItems.length > 0 && shouldExcludeText(heading.text)) {
        console.log(`🚫 제외된 섹션: ${heading.text}`);
        return; // 이 섹션 전체를 건너뜀
      }

      const section = {
        text: heading.text,
        children: {},
      };

      let childIndex = 1;
      let currentElem = heading.element.next();

      // 다음 헤딩까지의 모든 내용을 children으로 수집
      while (currentElem.length > 0) {
        const tagName = currentElem[0].tagName.toLowerCase();

        // 같은 레벨 이상의 헤딩을 만나면 중단
        if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tagName)) {
          const elemLevel = parseInt(tagName.charAt(1));
          if (elemLevel <= heading.level) {
            break;
          }
        }

        const text = currentElem.text().trim();
        if (text && (excludeItems.length === 0 || !shouldExcludeText(text))) {
          // 중첩 리스트 처리
          if (tagName === "ul" || tagName === "ol") {
            const nestedChildren = parseNestedList(currentElem, $, excludeItems);
            Object.keys(nestedChildren).forEach((key) => {
              // 중첩 리스트의 아이템도 제외 체크
              const childItem = nestedChildren[key];
              const childText = typeof childItem === "string" ? childItem : childItem.text;
              if (excludeItems.length === 0 || !shouldExcludeText(childText)) {
                section.children[childIndex] = nestedChildren[key];
                childIndex++;
              }
            });
          }
          // 테이블 처리
          else if (tagName === "table") {
            currentElem.find("tr").each((trIndex, trElem) => {
              const $tr = $(trElem);
              const cells = [];
              $tr.find("td, th").each((cellIndex, cellElem) => {
                const cellText = $(cellElem).text().trim();
                if (cellText) cells.push(cellText);
              });
              if (cells.length > 0) {
                const rowText = cells.join(" | ");
                if (excludeItems.length === 0 || !shouldExcludeText(rowText)) {
                  section.children[childIndex] = rowText;
                  childIndex++;
                }
              }
            });
          }
          // 일반 텍스트 (번호 제거 및 trim 처리)
          else {
            const cleanText = removeNumberPrefix(text);
            if (cleanText && (excludeItems.length === 0 || !shouldExcludeText(cleanText))) {
              section.children[childIndex] = cleanText;
              childIndex++;
            }
          }
        }

        currentElem = currentElem.next();
      }

      result[currentIndex] = section;
      currentIndex++;
    });
  }
  // 헤딩이 없는 경우: 모든 요소를 순차적으로 처리
  else {
    console.log("📝 헤딩이 없어 순차적 파싱 진행");

    $(".sub-step")
      .contents()
      .each((i, elem) => {
        if (elem.nodeType === 3) {
          // 텍스트 노드
          const text = $(elem).text().trim();
          if (text && (excludeItems.length === 0 || !shouldExcludeText(text))) {
            const cleanText = removeNumberPrefix(text);
            if (cleanText && (excludeItems.length === 0 || !shouldExcludeText(cleanText))) {
              result[currentIndex] = {
                text: cleanText,
                children: {},
              };
              currentIndex++;
            }
          }
        } else if (elem.nodeType === 1) {
          // 요소 노드
          const $elem = $(elem);
          const tagName = elem.tagName.toLowerCase();
          const text = $elem.text().trim();

          if (text && (excludeItems.length === 0 || !shouldExcludeText(text))) {
            if (tagName === "ul" || tagName === "ol") {
              const section = {
                text: `목록 (${tagName.toUpperCase()})`,
                children: {},
              };

              const nestedChildren = parseNestedList($elem, $, excludeItems);
              section.children = nestedChildren;

              if (Object.keys(nestedChildren).length > 0) {
                result[currentIndex] = section;
                currentIndex++;
              }
            } else if (tagName === "table") {
              const section = {
                text: "표",
                children: {},
              };
              let childIndex = 1;

              $elem.find("tr").each((trIndex, trElem) => {
                const $tr = $(trElem);
                const cells = [];
                $tr.find("td, th").each((cellIndex, cellElem) => {
                  const cellText = $(cellElem).text().trim();
                  if (cellText) cells.push(cellText);
                });
                if (cells.length > 0) {
                  const rowText = cells.join(" | ");
                  if (excludeItems.length === 0 || !shouldExcludeText(rowText)) {
                    section.children[childIndex] = rowText;
                    childIndex++;
                  }
                }
              });

              if (Object.keys(section.children).length > 0) {
                result[currentIndex] = section;
                currentIndex++;
              }
            } else {
              const cleanText = removeNumberPrefix(text);
              if (cleanText && (excludeItems.length === 0 || !shouldExcludeText(cleanText))) {
                result[currentIndex] = {
                  text: cleanText,
                  children: {},
                };
                currentIndex++;
              }
            }
          }
        }
      });
  }

  console.log(`✅ 구조화 완료: ${Object.keys(result).length}개 섹션`);
  return result;
}

/**
 * 기존 파싱 함수 (호환성 유지)
 * @param {string} htmlContent - HTML 콘텐츠
 * @returns {Object} 파싱된 데이터
 */
function parseBasicData(htmlContent) {
  const $ = cheerio.load(htmlContent);

  const sections = [];
  $(".sub-step")
    .find("h1, h2, h3, h4, h5, h6")
    .each((i, elem) => {
      sections.push({
        level: elem.tagName.toLowerCase(),
        text: $(elem).text().trim(),
        html: $(elem).html(),
      });
    });

  return {
    sections,
    totalSections: sections.length,
  };
}

module.exports = {
  removeNumberPrefix,
  parseNestedList,
  parseToStructuredJSON,
  parseBasicData,
};
