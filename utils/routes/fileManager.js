require("module-alias/register");

const fs = require("fs");
const path = require("path");
const { createLogger } = require("@root/utils/logger");

const logger = createLogger("FILE");

/**
 * JSON 파일 관리자 - 캐싱 및 자동 생성 기능 포함
 */
class FileManager {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5분 캐시
  }

  /**
   * JSON 파일 읽기 (캐싱 포함)
   * @param {string} filePath - 파일 경로
   * @param {Object} options - 옵션
   * @returns {Object|null} JSON 데이터 또는 null
   */
  readJSON(filePath, options = {}) {
    const { useCache = true, defaultData = null } = options;
    const cacheKey = filePath;

    // 캐시 확인
    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      const now = Date.now();

      if (now - cached.timestamp < this.cacheTimeout) {
        logger.cache("hit", path.basename(filePath));
        return cached.data;
      } else {
        // 캐시 만료
        this.cache.delete(cacheKey);
        logger.cache("miss", path.basename(filePath) + " (expired)");
      }
    }

    try {
      // 파일 존재 여부 확인
      if (!fs.existsSync(filePath)) {
        logger.file("not_found", path.basename(filePath), "warn");
        return defaultData;
      }

      // JSON 파일 읽기
      const rawData = fs.readFileSync(filePath, "utf8");
      const jsonData = JSON.parse(rawData);

      // 캐시에 저장
      if (useCache) {
        this.cache.set(cacheKey, {
          data: jsonData,
          timestamp: Date.now(),
        });
        logger.cache("set", path.basename(filePath));
      }

      logger.file("load", path.basename(filePath), "success");
      return jsonData;
    } catch (error) {
      logger.file("load", path.basename(filePath), "error");
      logger.error(`JSON 파일 읽기 실패: ${filePath}`, error);
      return defaultData;
    }
  }

  /**
   * JSON 파일 쓰기
   * @param {string} filePath - 파일 경로
   * @param {Object} data - 저장할 데이터
   * @param {Object} options - 옵션
   * @returns {boolean} 성공 여부
   */
  writeJSON(filePath, data, options = {}) {
    const { createDir = true, updateCache = true } = options;

    try {
      // 디렉토리 생성
      if (createDir) {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          logger.file("create", `directory: ${path.basename(dir)}`, "info");
        }
      }

      // JSON 파일 쓰기
      const jsonString = JSON.stringify(data, null, 2);
      fs.writeFileSync(filePath, jsonString, "utf8");

      // 캐시 업데이트
      if (updateCache) {
        this.cache.set(filePath, {
          data: data,
          timestamp: Date.now(),
        });
        logger.cache("set", path.basename(filePath));
      }

      logger.file("save", path.basename(filePath), "success");
      return true;
    } catch (error) {
      logger.file("save", path.basename(filePath), "error");
      logger.error(`JSON 파일 쓰기 실패: ${filePath}`, error);
      return false;
    }
  }

  /**
   * 조건부 JSON 파일 읽기 (없으면 생성 함수 실행)
   * @param {string} filePath - 파일 경로
   * @param {Function} generateFunction - 파일이 없을 때 실행할 생성 함수
   * @param {Object} options - 옵션
   * @returns {Object|null} JSON 데이터
   */
  async readOrGenerate(filePath, generateFunction, options = {}) {
    const { forceRegenerate = false } = options;

    // 강제 재생성이 아니고 파일이 존재하면 읽기
    if (!forceRegenerate && fs.existsSync(filePath)) {
      return this.readJSON(filePath, options);
    }

    // 파일이 없거나 강제 재생성인 경우
    logger.loading(`자동 생성 시작: ${path.basename(filePath)}`);

    try {
      // 생성 함수 실행
      const generatedData = await generateFunction();

      if (generatedData) {
        // 생성된 데이터를 파일에 저장
        const saved = this.writeJSON(filePath, generatedData, options);
        if (saved) {
          logger.success(`자동 생성 완료: ${path.basename(filePath)}`);
          return generatedData;
        }
      }

      logger.error(`자동 생성 실패: ${path.basename(filePath)}`);
      return options.defaultData || null;
    } catch (error) {
      logger.error(`자동 생성 중 오류: ${path.basename(filePath)}`, error);
      return options.defaultData || null;
    }
  }

  /**
   * 캐시 클리어
   * @param {string} filePath - 특정 파일 경로 (없으면 전체 클리어)
   */
  clearCache(filePath = null) {
    if (filePath) {
      this.cache.delete(filePath);
      logger.cache("clear", path.basename(filePath));
    } else {
      const size = this.cache.size;
      this.cache.clear();
      logger.cache("clear", `전체 (${size}개)`);
    }
  }

  /**
   * 캐시 상태 확인
   * @returns {Object} 캐시 통계
   */
  getCacheStats() {
    const stats = {
      size: this.cache.size,
      files: [],
    };

    this.cache.forEach((value, key) => {
      stats.files.push({
        file: path.basename(key),
        timestamp: new Date(value.timestamp).toISOString(),
        age: Date.now() - value.timestamp,
      });
    });

    return stats;
  }

  /**
   * 여러 파일 병렬 로딩
   * @param {Array} filePaths - 파일 경로 배열
   * @param {Object} options - 옵션
   * @returns {Object} 파일명을 키로 하는 데이터 객체
   */
  async loadMultiple(filePaths, options = {}) {
    const results = {};
    const promises = filePaths.map(async (filePath) => {
      const fileName = path.basename(filePath, path.extname(filePath));
      results[fileName] = this.readJSON(filePath, options);
    });

    await Promise.all(promises);
    return results;
  }
}

// 싱글톤 인스턴스 생성
const fileManager = new FileManager();

/**
 * 빠른 사용을 위한 헬퍼 함수들
 */
const readJSON = (filePath, options = {}) => fileManager.readJSON(filePath, options);
const writeJSON = (filePath, data, options = {}) => fileManager.writeJSON(filePath, data, options);
const readOrGenerate = (filePath, generateFunction, options = {}) =>
  fileManager.readOrGenerate(filePath, generateFunction, options);

module.exports = {
  FileManager,
  fileManager,
  readJSON,
  writeJSON,
  readOrGenerate,
};
