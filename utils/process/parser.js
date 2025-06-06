require("module-alias/register");

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
 * 텍스트 정리 함수
 * @param {string} text - 정리할 텍스트
 * @param {Object} options - 옵션
 * @returns {string} 정리된 텍스트
 */
function cleanText(text, options = {}) {
  if (!text) return text;

  const { removeNumbers = false, removeExtraSpaces = true, removeNewlines = false, trim = true } = options;

  let cleaned = text;

  if (removeNumbers) {
    cleaned = removeNumberPrefix(cleaned);
  }

  if (removeExtraSpaces) {
    cleaned = cleaned.replace(/\s+/g, " "); // 연속된 공백을 하나로
  }

  if (removeNewlines) {
    cleaned = cleaned.replace(/\n/g, " "); // 개행을 공백으로
  }

  if (trim) {
    cleaned = cleaned.trim();
  }

  return cleaned;
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
 * 테이블을 파싱하는 함수
 * @param {Object} $table - 테이블 jQuery 요소
 * @param {Object} $ - cheerio 인스턴스
 * @param {Array} excludeItems - 제외할 항목 리스트
 * @returns {Object} 파싱된 테이블 데이터
 */
function parseTable($table, $, excludeItems = []) {
  const tableData = {
    headers: [],
    rows: [],
  };

  function shouldExcludeText(text) {
    return excludeItems.some((excludeItem) => text.toLowerCase().includes(excludeItem.toLowerCase()));
  }

  // 헤더 추출
  $table
    .find("thead tr, tr:first-child")
    .first()
    .find("th, td")
    .each((i, cell) => {
      const text = $(cell).text().trim();
      if (text && !shouldExcludeText(text)) {
        tableData.headers.push(text);
      }
    });

  // 데이터 행 추출
  $table.find("tbody tr, tr:not(:first-child)").each((i, row) => {
    const rowData = [];
    $(row)
      .find("td, th")
      .each((j, cell) => {
        const text = $(cell).text().trim();
        if (text && !shouldExcludeText(text)) {
          rowData.push(text);
        }
      });

    if (rowData.length > 0) {
      tableData.rows.push(rowData);
    }
  });

  return tableData;
}

/**
 * HTML을 구조화된 JSON으로 변환하는 공통 함수
 * @param {string} htmlContent - HTML 콘텐츠
 * @param {string} type - 타입 (제외 설정용)
 * @param {Array} excludeItems - 제외할 항목들
 * @returns {Object} 구조화된 JSON 데이터
 */
function parseToStructuredJSON(htmlContent, type = null, excludeItems = []) {
  const $ = cheerio.load(`<div class="sub-step">${htmlContent}</div>`);
  const result = {};
  let currentIndex = 1;

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
            const tableData = parseTable(currentElem, $, excludeItems);
            if (tableData.rows.length > 0) {
              section.children[childIndex] = {
                type: "table",
                headers: tableData.headers,
                rows: tableData.rows,
              };
              childIndex++;
            }
          }
          // 일반 텍스트 (번호 제거 및 trim 처리)
          else {
            const cleanedText = cleanText(text, { removeNumbers: true });
            if (cleanedText && (excludeItems.length === 0 || !shouldExcludeText(cleanedText))) {
              section.children[childIndex] = cleanedText;
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
            const cleanedText = cleanText(text, { removeNumbers: true });
            if (cleanedText && (excludeItems.length === 0 || !shouldExcludeText(cleanedText))) {
              result[currentIndex] = {
                text: cleanedText,
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
              const tableData = parseTable($elem, $, excludeItems);
              if (tableData.rows.length > 0) {
                result[currentIndex] = {
                  text: "표",
                  children: {
                    1: {
                      type: "table",
                      headers: tableData.headers,
                      rows: tableData.rows,
                    },
                  },
                };
                currentIndex++;
              }
            } else {
              const cleanedText = cleanText(text, { removeNumbers: true });
              if (cleanedText && (excludeItems.length === 0 || !shouldExcludeText(cleanedText))) {
                result[currentIndex] = {
                  text: cleanedText,
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
 * 기본 HTML 요소 추출
 * @param {string} htmlContent - HTML 콘텐츠
 * @param {string} selector - CSS 셀렉터
 * @returns {Array} 추출된 요소 배열
 */
function extractElements(htmlContent, selector) {
  const $ = cheerio.load(htmlContent);
  const elements = [];

  $(selector).each((i, elem) => {
    const $elem = $(elem);
    elements.push({
      tag: elem.tagName.toLowerCase(),
      text: $elem.text().trim(),
      html: $elem.html(),
      attributes: elem.attribs || {},
    });
  });

  return elements;
}

/**
 * 링크 추출
 * @param {string} htmlContent - HTML 콘텐츠
 * @param {string} baseUrl - 기본 URL (상대 경로 처리용)
 * @returns {Array} 링크 배열
 */
function extractLinks(htmlContent, baseUrl = "") {
  const $ = cheerio.load(htmlContent);
  const links = [];

  $("a[href]").each((i, elem) => {
    const $elem = $(elem);
    let href = $elem.attr("href");

    // 상대 경로 처리
    if (baseUrl && href && !href.startsWith("http") && !href.startsWith("//")) {
      href = new URL(href, baseUrl).href;
    }

    links.push({
      text: $elem.text().trim(),
      href: href,
      title: $elem.attr("title") || null,
    });
  });

  return links;
}

/**
 * 이미지 정보 추출
 * @param {string} htmlContent - HTML 콘텐츠
 * @param {string} baseUrl - 기본 URL (상대 경로 처리용)
 * @returns {Array} 이미지 배열
 */
function extractImages(htmlContent, baseUrl = "") {
  const $ = cheerio.load(htmlContent);
  const images = [];

  $("img[src]").each((i, elem) => {
    const $elem = $(elem);
    let src = $elem.attr("src");

    // 상대 경로 처리
    if (baseUrl && src && !src.startsWith("http") && !src.startsWith("//")) {
      src = new URL(src, baseUrl).href;
    }

    images.push({
      src: src,
      alt: $elem.attr("alt") || null,
      title: $elem.attr("title") || null,
      width: $elem.attr("width") || null,
      height: $elem.attr("height") || null,
    });
  });

  return images;
}

module.exports = {
  removeNumberPrefix,
  cleanText,
  parseNestedList,
  parseTable,
  parseToStructuredJSON,
  extractElements,
  extractLinks,
  extractImages,
};
