require("module-alias/register");

const fs = require("fs");
const path = require("path");

/**
 * 파일 시스템 공통 유틸리티
 */

/**
 * 파일명을 안전하게 변환하는 함수
 * @param {string} name - 원본 파일명
 * @param {string} fallbackExt - 기본 확장자
 * @returns {string} 안전한 파일명
 */
function safeFilename(name, fallbackExt = ".bin") {
  if (!name || name.trim() === "") {
    return `file_${Date.now()}${fallbackExt}`;
  }

  let ext = path.extname(name);
  if (!ext) ext = fallbackExt;

  let base = name.replace(/[\\/:*?"<>|]+/g, "_").trim();
  if (!base.endsWith(ext)) base += ext;

  return base;
}

/**
 * 디렉토리가 존재하지 않으면 생성
 * @param {string} dirPath - 디렉토리 경로
 * @returns {boolean} 생성 성공 여부
 */
function ensureDirectoryExists(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`📁 디렉토리 생성: ${dirPath}`);
      return true;
    }
    return true;
  } catch (error) {
    console.error(`❌ 디렉토리 생성 실패: ${dirPath}`, error.message);
    return false;
  }
}

/**
 * HTML 파일 생성 및 저장
 * @param {string} content - HTML 콘텐츠
 * @param {string} title - 페이지 제목
 * @param {string} outputPath - 출력 파일 경로
 * @param {Object} options - 옵션
 */
function saveHtmlFile(content, title, outputPath, options = {}) {
  const {
    charset = "utf-8",
    viewport = "width=device-width, initial-scale=1.0",
    includeStyles = true,
    customStyles = "",
    createDir = true,
  } = options;

  // 디렉토리 생성
  if (createDir) {
    const dir = path.dirname(outputPath);
    ensureDirectoryExists(dir);
  }

  const defaultStyles = `
    body {
      font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #0066cc;
    }
    .header h1 {
      color: #0066cc;
      margin: 0;
      font-size: 2.2em;
    }
    .generated-info {
      text-align: right;
      color: #999;
      font-size: 0.9em;
      margin-bottom: 20px;
    }
  `;

  const styles = includeStyles ? `<style>${defaultStyles}${customStyles}</style>` : "";

  const fullHtml = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="${charset}" />
  <meta name="viewport" content="${viewport}" />
  <title>호서대학교 ${title}</title>
  ${styles}
</head>
<body>
    <div class="sub-step">
        ${content}
    </div>
</body>
</html>`;

  fs.writeFileSync(outputPath, fullHtml, "utf-8");
  console.log(`💾 HTML 파일 저장 완료: ${outputPath}`);
}

/**
 * JSON 파일 저장
 * @param {Object} data - 저장할 데이터
 * @param {string} outputPath - 출력 파일 경로
 * @param {Object} options - 옵션
 */
function saveJsonFile(data, outputPath, options = {}) {
  const { indent = 2, createDir = true, logName = null } = options;

  // 디렉토리 생성
  if (createDir) {
    const dir = path.dirname(outputPath);
    ensureDirectoryExists(dir);
  }

  const jsonString = JSON.stringify(data, null, indent);
  fs.writeFileSync(outputPath, jsonString, "utf-8");

  const fileName = logName || path.basename(outputPath);
  console.log(`💾 ${fileName} 파일 저장 완료: ${outputPath}`);
}

/**
 * 에러 정보 저장
 * @param {Error} error - 에러 객체
 * @param {string} type - 타입
 * @param {Object} config - 설정 객체
 * @param {string} url - URL
 * @param {string} outputDir - 출력 디렉토리
 */
function saveErrorInfo(error, type, config, url, outputDir) {
  const errorData = {
    type: type,
    config: config,
    error: true,
    message: error.message,
    url: url,
    timestamp: new Date().toISOString(),
    stack: error.stack,
  };

  const errorFile = path.join(outputDir, `${config.fileName}_error.json`);

  ensureDirectoryExists(outputDir);
  fs.writeFileSync(errorFile, JSON.stringify(errorData, null, 2), "utf-8");
  console.log(`💾 에러 정보 저장: ${errorFile}`);
}

/**
 * 파일 존재 확인
 * @param {string} filePath - 파일 경로
 * @returns {boolean} 파일 존재 여부
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * 파일 읽기 (안전)
 * @param {string} filePath - 파일 경로
 * @param {string} encoding - 인코딩
 * @returns {string|null} 파일 내용 또는 null
 */
function readFileSafe(filePath, encoding = "utf-8") {
  try {
    if (!fileExists(filePath)) {
      return null;
    }
    return fs.readFileSync(filePath, encoding);
  } catch (error) {
    console.error(`❌ 파일 읽기 실패: ${filePath}`, error.message);
    return null;
  }
}

/**
 * 파일 쓰기 (안전)
 * @param {string} filePath - 파일 경로
 * @param {string} data - 데이터
 * @param {Object} options - 옵션
 * @returns {boolean} 성공 여부
 */
function writeFileSafe(filePath, data, options = {}) {
  const { encoding = "utf-8", createDir = true } = options;

  try {
    if (createDir) {
      const dir = path.dirname(filePath);
      ensureDirectoryExists(dir);
    }

    fs.writeFileSync(filePath, data, encoding);
    return true;
  } catch (error) {
    console.error(`❌ 파일 쓰기 실패: ${filePath}`, error.message);
    return false;
  }
}

/**
 * 파일 복사
 * @param {string} sourcePath - 원본 파일 경로
 * @param {string} destPath - 대상 파일 경로
 * @param {Object} options - 옵션
 * @returns {boolean} 성공 여부
 */
function copyFile(sourcePath, destPath, options = {}) {
  const { createDir = true } = options;

  try {
    if (!fileExists(sourcePath)) {
      console.error(`❌ 원본 파일이 존재하지 않습니다: ${sourcePath}`);
      return false;
    }

    if (createDir) {
      const dir = path.dirname(destPath);
      ensureDirectoryExists(dir);
    }

    fs.copyFileSync(sourcePath, destPath);
    console.log(`📋 파일 복사 완료: ${sourcePath} → ${destPath}`);
    return true;
  } catch (error) {
    console.error(`❌ 파일 복사 실패: ${sourcePath} → ${destPath}`, error.message);
    return false;
  }
}

/**
 * 파일 삭제
 * @param {string} filePath - 파일 경로
 * @returns {boolean} 성공 여부
 */
function deleteFile(filePath) {
  try {
    if (fileExists(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ 파일 삭제 완료: ${filePath}`);
      return true;
    }
    return true; // 파일이 없으면 삭제 성공으로 간주
  } catch (error) {
    console.error(`❌ 파일 삭제 실패: ${filePath}`, error.message);
    return false;
  }
}

/**
 * 디렉토리 내 파일 목록 조회
 * @param {string} dirPath - 디렉토리 경로
 * @param {Object} options - 옵션
 * @returns {Array} 파일 목록
 */
function getFileList(dirPath, options = {}) {
  const { extension = null, recursive = false, includeStats = false } = options;

  try {
    if (!fs.existsSync(dirPath)) {
      return [];
    }

    let files = [];

    if (recursive) {
      const walkDir = (dir) => {
        const items = fs.readdirSync(dir);
        items.forEach((item) => {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            walkDir(fullPath);
          } else if (stat.isFile()) {
            if (!extension || path.extname(item).toLowerCase() === extension.toLowerCase()) {
              files.push(includeStats ? { path: fullPath, stats: stat } : fullPath);
            }
          }
        });
      };
      walkDir(dirPath);
    } else {
      const items = fs.readdirSync(dirPath);
      files = items
        .map((item) => path.join(dirPath, item))
        .filter((fullPath) => {
          const stat = fs.statSync(fullPath);
          return stat.isFile() && (!extension || path.extname(fullPath).toLowerCase() === extension.toLowerCase());
        })
        .map((fullPath) => (includeStats ? { path: fullPath, stats: fs.statSync(fullPath) } : fullPath));
    }

    return files;
  } catch (error) {
    console.error(`❌ 파일 목록 조회 실패: ${dirPath}`, error.message);
    return [];
  }
}

/**
 * 상대 경로를 URL 경로로 변환
 * @param {string} filePath - 파일 경로
 * @param {string} basePath - 기준 경로
 * @returns {string} URL 경로
 */
function pathToUrl(filePath, basePath = process.cwd()) {
  const relativePath = path.relative(basePath, filePath);
  return relativePath.replace(/\\/g, "/");
}

module.exports = {
  safeFilename,
  ensureDirectoryExists,
  saveHtmlFile,
  saveJsonFile,
  saveErrorInfo,
  fileExists,
  readFileSafe,
  writeFileSafe,
  copyFile,
  deleteFile,
  getFileList,
  pathToUrl,
};
