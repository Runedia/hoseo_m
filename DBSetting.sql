-- =====================================================
-- 호서대학교 크롤링 프로그램 DB 초기화 스크립트
-- =====================================================

-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS hoseo_m
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE hoseo_m;

-- =====================================================
-- 1. 공지사항 관련 테이블
-- =====================================================

-- 공지사항 카테고리 테이블
CREATE TABLE TBL_NoticeType (
    categoryCode CHAR(20) NOT NULL PRIMARY KEY COMMENT '카테고리 코드',
    label VARCHAR(100) NOT NULL COMMENT '카테고리 명'
) COMMENT = '공지사항 카테고리';

-- 공지사항 카테고리 초기 데이터
INSERT INTO TBL_NoticeType (categoryCode, label) VALUES
  ('CTG_17082400011', '일반공지'),
  ('CTG_24050300117', '융합교육'),
  ('CTG_17082400012', '학사공지'),
  ('CTG_23120500114', '교직_평생교육사'),
  ('CTG_17082400013', '장학공지'),
  ('CTG_17082400014', '사회봉사'),
  ('CTG_20012200070', '외부공지'),
  ('CTG_20120400086', '취업공지');

-- 공지사항 메인 테이블
CREATE TABLE TBL_Notice (
    idx INT NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '순번',
    type CHAR(20) NOT NULL COMMENT '카테고리 코드',
    chidx VARCHAR(10) NOT NULL UNIQUE COMMENT '게시글 고유번호',
    title VARCHAR(200) NOT NULL COMMENT '제목',
    link VARCHAR(200) NOT NULL COMMENT '링크',
    author VARCHAR(200) DEFAULT NULL COMMENT '작성자',
    create_dt DATE DEFAULT NULL COMMENT '작성일',
    download_completed TINYINT(1) DEFAULT 0 COMMENT '다운로드 완료 여부',
    download_date DATETIME DEFAULT NULL COMMENT '다운로드 완료 시간',
    download_error TEXT DEFAULT NULL COMMENT '다운로드 에러 메시지',
    INDEX idx_type (type),
    INDEX idx_chidx (chidx),
    INDEX idx_create_dt (create_dt),
    FOREIGN KEY (type) REFERENCES TBL_NoticeType(categoryCode)
) COMMENT = '공지사항';

-- 공지사항 첨부파일 테이블
CREATE TABLE TBL_NoticeFile (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '순번',
    notice_num VARCHAR(10) NOT NULL COMMENT '공지글 번호',
    file_type VARCHAR(10) NOT NULL COMMENT '파일 타입 (image, attachment)',
    file_name VARCHAR(255) NOT NULL COMMENT '저장 파일명',
    origin_name VARCHAR(255) DEFAULT NULL COMMENT '원본 파일명',
    file_path VARCHAR(255) NOT NULL COMMENT '파일 경로',
    file_url VARCHAR(500) DEFAULT NULL COMMENT '원본 다운로드 URL',
    reg_date DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '등록일시',
    INDEX idx_notice_num (notice_num),
    INDEX idx_file_type (file_type)
) COMMENT = '공지사항 첨부파일';

-- =====================================================
-- 2. 메뉴(식단) 관련 테이블
-- =====================================================

-- 메뉴(식단) 메인 테이블
CREATE TABLE TBL_Menu (
    idx INT AUTO_INCREMENT PRIMARY KEY COMMENT '순번',
    type VARCHAR(50) NOT NULL COMMENT '메뉴 타입 (MAPP_2312012408: 천안, MAPP_2312012409: 아산, HAPPY_DORM_NUTRITION: 행복기숙사)',
    chidx VARCHAR(20) NOT NULL COMMENT '게시글 고유번호',
    title TEXT NOT NULL COMMENT '제목',
    link TEXT NOT NULL COMMENT '링크',
    author VARCHAR(100) DEFAULT NULL COMMENT '작성자',
    create_dt VARCHAR(20) DEFAULT NULL COMMENT '작성일',
    download_completed TINYINT(1) DEFAULT NULL COMMENT '다운로드 완료 여부',
    download_date DATETIME DEFAULT NULL COMMENT '다운로드 완료 시간',
    download_error TEXT DEFAULT NULL COMMENT '다운로드 에러 메시지',
    INDEX idx_type (type),
    INDEX idx_chidx (chidx),
    INDEX idx_chidx_type (chidx, type),
    INDEX idx_create_dt (create_dt)
) COMMENT = '메뉴(식단) 정보';

-- 메뉴(식단) 첨부파일 테이블
CREATE TABLE TBL_MenuFile (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '순번',
    menu_num VARCHAR(20) NOT NULL COMMENT '메뉴 번호',
    file_type VARCHAR(20) NOT NULL COMMENT '파일 타입',
    file_name VARCHAR(255) NOT NULL COMMENT '저장 파일명',
    origin_name VARCHAR(255) DEFAULT NULL COMMENT '원본 파일명',
    file_path TEXT DEFAULT NULL COMMENT '파일 경로',
    file_url TEXT DEFAULT NULL COMMENT '원본 다운로드 URL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '등록일시',
    INDEX idx_menu_num (menu_num),
    INDEX idx_file_type (file_type),
    UNIQUE KEY unique_menu_file (menu_num, file_type, file_name)
) COMMENT = '메뉴(식단) 첨부파일';

-- =====================================================
-- 3. 시스템 관리 테이블
-- =====================================================

-- 배치 작업 정보 테이블
CREATE TABLE TBL_BatchInfo (
    option_name VARCHAR(20) NOT NULL PRIMARY KEY COMMENT '옵션명',
    option_data VARCHAR(100) DEFAULT NULL COMMENT '옵션 데이터',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시'
) COMMENT = '배치 작업 설정 정보';

-- =====================================================
-- 초기화 완료
-- =====================================================

-- 테이블 생성 확인
SELECT
    TABLE_NAME as '테이블명',
    TABLE_COMMENT as '설명',
    TABLE_ROWS as '행수'
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'hoseo_m'
ORDER BY TABLE_NAME;

-- 뷰 생성 확인
SELECT
    TABLE_NAME as '뷰명',
    TABLE_COMMENT as '설명'
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = 'hoseo_m';

SELECT '호서대학교 크롤링 프로그램 DB 초기화가 완료되었습니다.' as 'MESSAGE';
