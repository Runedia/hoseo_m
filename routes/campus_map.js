const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

// 캠퍼스 정보
const CAMPUS_INFO = {
    asan: {
        name: "아산캠퍼스",
        imagePath: path.join(process.cwd(), "assets", "Asan_campus.gif"),
        jsonPath: path.join(process.cwd(), "assets", "Asan_Campus.json")
    },
    cheonan: {
        name: "천안캠퍼스",
        imagePath: path.join(process.cwd(), "assets", "Cheonan_Campus.gif"),
        jsonPath: path.join(process.cwd(), "assets", "Cheonan_Campus.json")
    }
};

// 캠퍼스 정보 조회 API
router.get("/:campus", (req, res) => {
    try {
        const { campus } = req.params;
        const campusData = CAMPUS_INFO[campus.toLowerCase()];

        if (!campusData) {
            return res.status(404).json({
                success: false,
                message: "유효하지 않은 캠퍼스입니다. 'asan' 또는 'cheonan'을 입력해주세요."
            });
        }

        // JSON 파일 읽기
        const jsonData = JSON.parse(fs.readFileSync(campusData.jsonPath, 'utf8'));

        res.json({
            success: true,
            campus: campusData.name,
            imageUrl: `/campus_map/${campus}/image`,
            data: jsonData
        });

    } catch (error) {
        console.error(`캠퍼스 정보 조회 중 오류 발생: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "서버 오류가 발생했습니다.",
            error: error.message
        });
    }
});

// 캠퍼스 이미지 조회 API
router.get("/:campus/image", (req, res) => {
    try {
        const { campus } = req.params;
        const campusData = CAMPUS_INFO[campus.toLowerCase()];

        if (!campusData) {
            return res.status(404).json({
                success: false,
                message: "유효하지 않은 캠퍼스입니다."
            });
        }

        // 이미지 파일이 존재하는지 확인
        if (!fs.existsSync(campusData.imagePath)) {
            return res.status(404).json({
                success: false,
                message: "이미지를 찾을 수 없습니다."
            });
        }

        // 이미지 파일 전송
        res.sendFile(campusData.imagePath);
    } catch (error) {
        console.error(`이미지 조회 중 오류 발생: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "이미지 로딩 중 오류가 발생했습니다.",
            error: error.message
        });
    }
});

module.exports = router;