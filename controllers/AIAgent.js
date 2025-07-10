const express = require('express');
const router = express.Router();
const AIAgentService = require('../services/AIAgentServices');
const contentsServices = require('../services/contentsServices');
const { authMiddleware } = require('../middlewares/auth');
const { logger } = require('../config/logger');

/**
 * @swagger
 * /api/v1/ai/create-slideshow:
 *   post:
 *     summary: 이미지 URL들로 슬라이드쇼 비디오 생성
 *     tags: [AI]
 *     description: Azure Storage에 저장된 이미지들의 SAS URL 목록을 받아 AI 서버에 슬라이드쇼 생성을 요청하고, 결과 비디오를 스트리밍으로 반환합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               imageUrls:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *                 description: 슬라이드쇼를 만들 이미지들의 SAS URL 배열
 *             example:
 *               imageUrls:
 *                 - "https://your-storage-account.blob.core.windows.net/container/image1.jpg?sastoken"
 *                 - "https://your-storage-account.blob.core.windows.net/container/image2.png?sastoken"
 *     responses:
 *       '200':
 *         description: 비디오 임시 생성 성공. 앱에서 재생 가능한 URL과 게시물 작성에 필요한 ID를 반환합니다.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "슬라이드쇼 비디오가 임시 생성되었습니다."
 *                 data:
 *                   type: object
 *                   properties:
 *                     videoUrl:
 *                       type: string
 *                       format: uri
 *                       description: "앱에서 재생할 수 있는 임시 비디오 URL (예: 24시간 유효)"
 *                     videoId:
 *                       type: string
 *                       description: "게시물 작성 시 이 비디오를 식별하기 위한 고유 ID"
 *
 *       '400':
 *         description: "잘못된 요청 (예: 이미지 URL이 없거나 형식이 잘못됨)"
 *       '500':
 *         description: "AI 서버 또는 내부 서버 오류"
 */
router.post('/create-slideshow', async (req, res, next) => {
	const { imageUrls } = req.body;

	if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
		return res.status(400).json({ success: false, message: '이미지 URL 배열이 필요합니다.' });
	}

	try {
		logger.info(`AI 슬라이드쇼 생성 요청 받음. 이미지 개수: ${imageUrls.length}`);
		const { videoUrl, videoId } = await AIAgentService.createSlideshowFromUrls(imageUrls);
		
		logger.info('클라이언트에 임시 비디오 정보 응답');
		res.status(200).json({
			success: true, // 이 부분은 다른 API와 형식이 달라도, 성공 응답은 유연하게 처리 가능합니다.
			message: '슬라이드쇼 비디오가 임시 생성되었습니다.',
			data: {
				videoUrl: videoUrl,
				videoId: videoId,
			},
		});

	} catch (error) {
		logger.error('슬라이드쇼 생성 파이프라인 중 오류 발생:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            code: statusCode,
            message: error.message || '슬라이드쇼 생성 중 서버 오류가 발생했습니다.',
            result: null
        });
	}
});

/**
 * @swagger
 * /api/v1/ai/contents-with-video:
 *   post:
 *     summary: AI 비디오로 커뮤니티 게시물 생성
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     description: AI로 생성한 비디오의 ID와 게시물 내용을 받아, 비디오를 영구 저장소로 옮기고 새 게시물을 생성합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - body
 *               - videoId
 *             properties:
 *               body:
 *                 type: string
 *                 description: 게시물 내용
 *               videoId:
 *                 type: string
 *                 description: "/api/v1/ai/create-slideshow 에서 발급받은 videoId"
 *     responses:
 *       '201':
 *         description: 게시물 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ContentWithMediaResponse'
 *       '400':
 *         description: "필수 필드 누락"
 *       '404':
 *         description: "videoId에 해당하는 임시 비디오를 찾을 수 없음 (만료 등)"
 *       '500':
 *         description: "서버 오류"
 */
router.post('/contents-with-video', authMiddleware, async (req, res, next) => {
    const { id: userId } = req.user;
    const { body, videoId } = req.body;

    try {
        const newContent = await contentsServices.createContentWithVideo(userId, body, videoId);
        
        res.status(201).json({
            // 성공 응답은 기존의 다른 게시물 생성 API와 형식을 맞추겠습니다.
            code: 201,
            message: 'AI 비디오 게시물이 성공적으로 생성되었습니다.',
            result: newContent,
        });

    } catch (error) {
        logger.error('AI 비디오 게시물 생성 중 컨트롤러 오류:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            code: statusCode,
            message: error.message || 'AI 비디오 게시물 생성 중 서버 오류가 발생했습니다.',
            result: null
        });
    }
});

module.exports = router; 