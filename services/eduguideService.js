require("module-alias/register");

const fs = require("fs");
const path = require("path");
const { createSimpleId } = require("@root/utils/routes/responseHelper");
const { createLogger } = require("@root/utils/logger");

/**
 * 교육 가이드 관련 공통 서비스
 * JSON 파일 처리, 자동 생성, 타입 관리 등을 담당
 */
class EduguideService {
  /**
   * JSON 파일 경로 생성
   * @param {string} fileName - JSON 파일명
   * @returns {string} 전체 파일 경로
   */
  static getJsonPath(fileName) {
    return path.join(process.cwd(), "assets", "static", `${fileName}.json`);
  }

  /**
   * JSON 파일 존재 여부 확인
   * @param {string} fileName - JSON 파일명
   * @returns {boolean} 파일 존재 여부
   */
  static fileExists(fileName) {
    const jsonPath = this.getJsonPath(fileName);
    return fs.existsSync(jsonPath);
  }

  /**
   * JSON 파일 읽기
   * @param {string} fileName - JSON 파일명
   * @returns {Object} 파싱된 JSON 데이터
   */
  static readJsonFile(fileName) {
    const jsonPath = this.getJsonPath(fileName);
    const jsonContent = fs.readFileSync(jsonPath, "utf-8");
    return JSON.parse(jsonContent);
  }

  /**
   * 자동 생성 및 JSON 파일 처리
   * @param {string} fileName - JSON 파일명
   * @param {string} description - 파일 설명
   * @param {Function} generateFunction - 자동 생성 함수
   * @param {string} type - 타입 (선택사항)
   * @returns {Object} JSON 데이터
   */
  static async processJsonFile(fileName, description, generateFunction, type = null) {
    const requestId = createSimpleId();
    const logger = createLogger("eduguide");

    try {
      // JSON 파일 존재 여부 확인
      if (!this.fileExists(fileName)) {
        logger.info(`[${requestId}] 🔄 ${description} JSON 파일이 없어 자동 생성 시작...`);

        try {
          // 타입이 있으면 타입과 함께 호출, 없으면 단순 호출
          if (type) {
            await generateFunction(type);
          } else {
            await generateFunction();
          }

          logger.info(`[${requestId}] ✅ ${description} 자동 생성 완료`);
        } catch (generateError) {
          logger.error(`[${requestId}] ❌ ${description} JSON 자동 생성 실패:`, generateError);
          throw new Error(`${description} JSON을 자동 생성하는 중 오류가 발생했습니다: ${generateError.message}`);
        }
      }

      // JSON 파일 읽기
      const data = this.readJsonFile(fileName);
      logger.info(`[${requestId}] ✅ ${description} JSON 파일 읽기 완료`);

      return data;
    } catch (error) {
      logger.error(`[${requestId}] ❌ ${description} JSON 처리 실패:`, error);
      throw error;
    }
  }

  /**
   * 표준 응답 객체 생성
   * @param {string} title - 응답 제목
   * @param {Object} data - 응답 데이터
   * @param {string} type - 타입 (선택사항)
   * @param {string} description - 설명 (선택사항)
   * @returns {Object} 표준 응답 객체
   */
  static createResponse(title, data, type = null, description = null) {
    const response = {
      title,
      generatedAt: new Date().toISOString(),
      data,
    };

    if (type) {
      response.type = type;
    }

    if (description) {
      response.description = description;
    }

    return response;
  }

  /**
   * 타입 목록 응답 생성
   * @param {string} title - 응답 제목
   * @param {Object} configs - 설정 객체
   * @param {string} basicApiExample - 기본 API 예시
   * @returns {Object} 타입 목록 응답
   */
  static createTypesResponse(title, configs, basicApiExample) {
    const types = Object.keys(configs).map((key) => ({
      type: key,
      name: configs[key].name,
      description: configs[key].description,
      url: configs[key].url,
      fileName: configs[key].fileName,
      ...(configs[key].excludeItems && { excludeItems: configs[key].excludeItems }),
    }));

    return {
      title,
      generatedAt: new Date().toISOString(),
      totalTypes: types.length,
      types: types,
      usage: {
        basicApi: basicApiExample,
      },
    };
  }

  /**
   * 타입 유효성 검증
   * @param {string} type - 검증할 타입
   * @param {Object} configs - 설정 객체
   * @returns {Object|null} 유효하면 설정 객체, 무효하면 null
   */
  static validateType(type, configs) {
    return configs[type] || null;
  }

  /**
   * 타입 오류 응답 생성
   * @param {string} type - 잘못된 타입
   * @param {Object} configs - 설정 객체
   * @param {string} category - 카테고리명 (교육과정, 수업, 학적 등)
   * @returns {Object} 오류 응답 객체
   */
  static createTypeErrorResponse(type, configs, category) {
    return {
      error: `지원하지 않는 ${category} 타입: ${type}`,
      availableTypes: Object.keys(configs),
      typeDescriptions: Object.keys(configs).map((key) => ({
        type: key,
        name: configs[key].name,
        description: configs[key].description,
      })),
    };
  }
}

module.exports = EduguideService;
