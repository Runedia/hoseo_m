require("module-alias/register");

const fs = require("fs");
const path = require("path");

/**
 * 학과 정보 관련 서비스
 * JSON 파일 처리, 학과 데이터 조회, 캐싱 등을 담당
 */
class DepartmentService {
  constructor() {
    this.basePath = path.join(process.cwd(), "assets", "static");
    this.imagesPath = path.join(this.basePath, "images");

    // 파일 경로들
    this.files = {
      simple: path.join(this.basePath, "departments_simple.json"),
      detailed: path.join(this.basePath, "departments.json"),
      cache: path.join(this.basePath, "departments_detailed.json"),
    };

    // 지원하는 포맷들
    this.validFormats = ["detailed", "simple"];

    // 이미지 MIME 타입들
    this.mimeTypes = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
    };
  }

  /**
   * 포맷 유효성 검사
   * @param {string} format - 검사할 포맷
   * @returns {boolean} 유효 여부
   */
  isValidFormat(format) {
    return this.validFormats.includes(format);
  }

  /**
   * 포맷에 따른 파일 경로 반환
   * @param {string} format - 포맷 (detailed/simple)
   * @returns {string} 파일 경로
   */
  getFilePathByFormat(format) {
    return format === "simple" ? this.files.simple : this.files.detailed;
  }

  /**
   * JSON 파일 존재 여부 확인
   * @param {string} filePath - 확인할 파일 경로
   * @returns {boolean} 존재 여부
   */
  fileExists(filePath) {
    return fs.existsSync(filePath);
  }

  /**
   * JSON 파일 읽기
   * @param {string} filePath - 읽을 파일 경로
   * @returns {Object} 파싱된 JSON 데이터
   * @throws {Error} 파일 읽기 실패 시
   */
  readJsonFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`JSON 파일 읽기 실패: ${error.message}`);
    }
  }

  /**
   * JSON 파일 쓰기
   * @param {string} filePath - 쓸 파일 경로
   * @param {Object} data - 저장할 데이터
   * @throws {Error} 파일 쓰기 실패 시
   */
  writeJsonFile(filePath, data) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (error) {
      throw new Error(`JSON 파일 쓰기 실패: ${error.message}`);
    }
  }

  /**
   * 학과 목록 데이터 조회
   * @param {string} format - 포맷 (detailed/simple)
   * @returns {Object} 학과 목록 데이터
   */
  async getDepartmentList(format = "detailed") {
    const filePath = this.getFilePathByFormat(format);

    if (!this.fileExists(filePath)) {
      throw new Error(`${format} 포맷의 학과 정보 파일이 존재하지 않습니다.`);
    }

    return this.readJsonFile(filePath);
  }

  /**
   * 학과 목록 응답 데이터 생성
   * @param {Object} departmentData - 학과 데이터
   * @param {string} format - 포맷
   * @returns {Object} 응답용 데이터
   */
  createListResponse(departmentData, format) {
    const response = {
      title: "호서대학교 학부(과) 정보",
      format: format,
      generatedAt: new Date().toISOString(),
      description: format === "simple" ? "단순 리스트 형태의 학과 정보" : "대학별 그룹화된 상세 학과 정보",
    };

    // detailed 포맷이고 통계 정보가 있으면 포함
    if (format === "detailed" && departmentData.statistics) {
      response.statistics = departmentData.statistics;
    }

    // 모든 포맷에서 data 필드에 실제 데이터 포함
    response.data = departmentData;

    return response;
  }

  /**
   * 캐시된 학과 상세 정보 조회
   * @param {string} deptName - 학과명
   * @returns {Object|null} 캐시된 학과 정보 또는 null
   */
  getCachedDepartmentInfo(deptName) {
    if (!this.fileExists(this.files.cache)) {
      return null;
    }

    try {
      const cachedData = this.readJsonFile(this.files.cache);
      return cachedData.find((dept) => dept.name === deptName) || null;
    } catch (error) {
      console.warn("캐시 파일 읽기 실패:", error.message);
      return null;
    }
  }

  /**
   * 학과 기본 정보에서 특정 학과 찾기
   * @param {string} deptName - 학과명
   * @returns {Object|null} 학과 기본 정보 또는 null
   */
  findDepartmentInSimpleList(deptName) {
    if (!this.fileExists(this.files.simple)) {
      throw new Error("학과 기본 정보 파일이 존재하지 않습니다.");
    }

    const simpleData = this.readJsonFile(this.files.simple);
    return simpleData.find((dept) => dept.name === deptName) || null;
  }

  /**
   * 학과 상세 정보를 캐시에 저장
   * @param {Object} departmentInfo - 저장할 학과 상세 정보
   */
  cacheDepartmentInfo(departmentInfo) {
    let cachedData = [];

    // 기존 캐시 파일이 있으면 읽기
    if (this.fileExists(this.files.cache)) {
      try {
        cachedData = this.readJsonFile(this.files.cache);
      } catch (error) {
        console.warn("기존 캐시 파일 읽기 실패, 새로 생성:", error.message);
        cachedData = [];
      }
    }

    // 새 데이터 추가
    cachedData.push(departmentInfo);

    // 캐시 파일에 저장
    this.writeJsonFile(this.files.cache, cachedData);
  }

  /**
   * 이미지 파일 경로 반환
   * @param {string} filename - 이미지 파일명
   * @returns {string} 이미지 파일 전체 경로
   */
  getImagePath(filename) {
    return path.join(this.imagesPath, filename);
  }

  /**
   * 이미지 파일 존재 여부 확인
   * @param {string} filename - 이미지 파일명
   * @returns {boolean} 존재 여부
   */
  imageExists(filename) {
    return this.fileExists(this.getImagePath(filename));
  }

  /**
   * 파일 확장자로 MIME 타입 반환
   * @param {string} filename - 파일명
   * @returns {string|null} MIME 타입 또는 null
   */
  getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    return this.mimeTypes[ext] || null;
  }

  /**
   * 포맷 검증 에러 정보 반환
   * @returns {Object} 에러 응답 객체
   */
  getFormatValidationError(format) {
    return {
      error: `지원하지 않는 포맷: ${format}`,
      availableFormats: this.validFormats,
      description: {
        detailed: "대학별 그룹화된 상세 정보",
        simple: "단순 리스트 형태",
      },
    };
  }
}

module.exports = DepartmentService;
