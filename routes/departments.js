require("module-alias/register");

const express = require("express");
const router = express.Router();

// 유틸리티 모듈들
const { createResponse, createSimpleId } = require("@root/utils/routes/responseHelper");
const { createLogger } = require("@root/utils/logger");
const { sendError, ErrorTypes } = require("@root/utils/routes/errorHandler");

// 서비스 모듈들
const DepartmentService = require("@root/services/departmentService");

// 학과 정보 크롤링 모듈들
const { extractDepartmentList } = require("@root/process/5_department/get_department_list");
const DepartmentCrawler = require("@root/process/5_department/department_crawler");

// DepartmentService 인스턴스 생성
const departmentService = new DepartmentService();

// 로거 인스턴스 생성
const logger = createLogger("departments");

// ====================
// 헬퍼 함수들
// ====================

/**
 * 학과 기본 정보 자동 생성
 * @returns {Promise<void>}
 */
async function ensureDepartmentBasicInfo() {
  if (!departmentService.fileExists(departmentService.files.simple)) {
    logger.info("학과 기본 정보 파일이 없어 자동 생성 시작", {
      module: "departments",
      action: "auto_generate",
    });

    try {
      await extractDepartmentList();
      logger.info("학과 기본 정보 자동 생성 완료", {
        module: "departments",
        action: "auto_generate",
      });
    } catch (error) {
      logger.error("학과 기본 정보 자동 생성 실패", {
        module: "departments",
        action: "auto_generate",
        error: error.message,
      });
      throw new Error(`학과 기본 정보 자동 생성 실패: ${error.message}`);
    }
  }
}

/**
 * 학과 상세 정보 크롤링 및 캐싱
 * @param {Object} department - 학과 기본 정보
 * @returns {Promise<Object>} 크롤링된 학과 상세 정보
 */
async function crawlAndCacheDepartmentInfo(department) {
  const crawler = new DepartmentCrawler();

  logger.info("학과 상세 정보 크롤링 시작", {
    module: "departments",
    action: "crawl_detail",
    department: department.name,
  });

  const detailedInfo = await crawler.crawlDepartmentDetail(department);

  if (!detailedInfo) {
    throw new Error(`학과 상세 정보 크롤링 실패: ${department.name}`);
  }

  // 캐시에 저장
  departmentService.cacheDepartmentInfo(detailedInfo);

  logger.info("학과 상세 정보 크롤링 및 캐싱 완료", {
    module: "departments",
    action: "crawl_detail",
    department: department.name,
  });

  return detailedInfo;
}

// ====================
// 라우트 핸들러들
// ====================

/**
 * 학과 목록 조회 API
 * GET /departments/list?format=detailed|simple
 */
router.get("/list", async (req, res) => {
  const requestId = createSimpleId();
  const startTime = Date.now();

  try {
    const { format = "detailed" } = req.query;

    logger.info("학과 목록 조회 요청", {
      module: "departments",
      action: "list",
      requestId,
      format,
    });

    // 포맷 유효성 검사
    if (!departmentService.isValidFormat(format)) {
      logger.warn("잘못된 포맷 요청", {
        module: "departments",
        action: "list",
        requestId,
        format,
        validFormats: departmentService.validFormats,
      });

      return sendError(res, ErrorTypes.BAD_REQUEST, `지원하지 않는 포맷: ${format}`);
    }

    // JSON 파일 존재 여부 확인 및 자동 생성
    const filePath = departmentService.getFilePathByFormat(format);
    if (!departmentService.fileExists(filePath)) {
      try {
        await ensureDepartmentBasicInfo();
      } catch (generateError) {
        logger.error("학과 정보 자동 생성 실패", {
          module: "departments",
          action: "list",
          requestId,
          error: generateError.message,
        });

        return sendError(res, ErrorTypes.GENERATION_ERROR, "학과 정보 JSON");
      }
    }

    // 학과 목록 데이터 조회
    const departmentData = await departmentService.getDepartmentList(format);

    // 응답 데이터 생성
    const responseData = departmentService.createListResponse(departmentData, format);

    const processingTime = Date.now() - startTime;
    logger.info("학과 목록 조회 완료", {
      module: "departments",
      action: "list",
      requestId,
      format,
      processingTime: `${processingTime}ms`,
    });

    res.json(createResponse(responseData, null, { requestId, processingTime }));
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error("학과 목록 조회 실패", {
      module: "departments",
      action: "list",
      requestId,
      error: error.message,
      processingTime: `${processingTime}ms`,
    });

    sendError(res, ErrorTypes.INTERNAL_ERROR, "학과 정보 JSON 불러오기");
  }
});

/**
 * 학과 상세 정보 조회 API
 * GET /departments/info?dept=학과명
 */
router.get("/info", async (req, res) => {
  const requestId = createSimpleId();
  const startTime = Date.now();

  try {
    const { dept } = req.query;

    logger.info("학과 상세 정보 조회 요청", {
      module: "departments",
      action: "info",
      requestId,
      department: dept,
    });

    // 학과명 파라미터 검증
    if (!dept) {
      logger.warn("학과명 파라미터 누락", {
        module: "departments",
        action: "info",
        requestId,
      });

      return sendError(res, ErrorTypes.MISSING_PARAMETER, "dept", "/departments/info?dept=컴퓨터공학부");
    }

    // 학과 기본 정보 확보
    try {
      await ensureDepartmentBasicInfo();
    } catch (generateError) {
      logger.error("학과 기본 정보 생성 실패", {
        module: "departments",
        action: "info",
        requestId,
        error: generateError.message,
      });

      return sendError(res, ErrorTypes.GENERATION_ERROR, "학과 기본 정보");
    }

    // 캐시된 상세 정보 확인
    const cachedDepartment = departmentService.getCachedDepartmentInfo(dept);
    if (cachedDepartment) {
      const processingTime = Date.now() - startTime;
      logger.info("캐시된 학과 상세 정보 반환", {
        module: "departments",
        action: "info",
        requestId,
        department: dept,
        cached: true,
        processingTime: `${processingTime}ms`,
      });

      return res.json(
        createResponse(
          {
            message: "학과 정보를 성공적으로 가져왔습니다.",
            data: cachedDepartment,
            cached: true,
          },
          null,
          { requestId, processingTime }
        )
      );
    }

    // 기본 학과 정보에서 검색
    const department = departmentService.findDepartmentInSimpleList(dept);
    if (!department) {
      logger.warn("학과 정보 없음", {
        module: "departments",
        action: "info",
        requestId,
        department: dept,
      });

      return sendError(res, ErrorTypes.NOT_FOUND, `'${dept}' 학과`);
    }

    // 학과 상세 정보 크롤링
    try {
      const detailedInfo = await crawlAndCacheDepartmentInfo(department);

      const processingTime = Date.now() - startTime;
      logger.info("학과 상세 정보 조회 완료", {
        module: "departments",
        action: "info",
        requestId,
        department: dept,
        cached: false,
        processingTime: `${processingTime}ms`,
      });

      res.json(
        createResponse(
          {
            message: "학과 정보를 성공적으로 가져왔습니다.",
            data: detailedInfo,
            cached: false,
          },
          null,
          { requestId, processingTime }
        )
      );
    } catch (crawlError) {
      logger.error("학과 상세 정보 크롤링 실패", {
        module: "departments",
        action: "info",
        requestId,
        department: dept,
        error: crawlError.message,
      });

      return sendError(res, ErrorTypes.INTERNAL_ERROR, `'${dept}' 학과 정보 가져오기`);
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error("학과 상세 정보 조회 실패", {
      module: "departments",
      action: "info",
      requestId,
      error: error.message,
      processingTime: `${processingTime}ms`,
    });

    sendError(res, ErrorTypes.INTERNAL_ERROR, "학과 정보 가져오기");
  }
});

/**
 * 학과 이미지 다운로드 API
 * GET /departments/images/:filename
 */
router.get("/images/:filename", (req, res) => {
  const requestId = createSimpleId();
  const startTime = Date.now();

  try {
    const { filename } = req.params;

    logger.info("학과 이미지 요청", {
      module: "departments",
      action: "images",
      requestId,
      filename,
    });

    // 이미지 파일 존재 여부 확인
    if (!departmentService.imageExists(filename)) {
      logger.warn("이미지 파일 없음", {
        module: "departments",
        action: "images",
        requestId,
        filename,
      });

      return sendError(res, ErrorTypes.NOT_FOUND, `'${filename}' 이미지`);
    }

    // MIME 타입 설정
    const mimeType = departmentService.getMimeType(filename);
    if (mimeType) {
      res.setHeader("Content-Type", mimeType);
    }

    const imagePath = departmentService.getImagePath(filename);

    const processingTime = Date.now() - startTime;
    logger.info("학과 이미지 전송 완료", {
      module: "departments",
      action: "images",
      requestId,
      filename,
      mimeType,
      processingTime: `${processingTime}ms`,
    });

    // 파일 전송
    return res.sendFile(imagePath);
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error("학과 이미지 전송 실패", {
      module: "departments",
      action: "images",
      requestId,
      error: error.message,
      processingTime: `${processingTime}ms`,
    });

    sendError(res, ErrorTypes.INTERNAL_ERROR, "이미지 가져오기");
  }
});

module.exports = router;
