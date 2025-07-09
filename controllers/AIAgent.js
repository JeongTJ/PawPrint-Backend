const express = require('express');
const router = express.Router();
const AIAgentService = require('../services/AIAgentServices');
const { logger } = require('../config/logger');
const fs = require('fs');

/**
 * @swagger
 * tags:
 *  name: AI
 *   description: AI 에이전트 기능
 * 
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
 *         description: 생성된 슬라이드쇼 비디오 파일. API 테스트 툴이나 브라우저에서 바로 다운로드됩니다.
 *         content:
 *           video/mp4:
 *             schema:
 *               type: string
 *               format: binary
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

	let tempFilePath = null;
	try {
		logger.info(`AI 슬라이드쇼 생성 요청 받음. 이미지 개수: ${imageUrls.length}`);
		tempFilePath = await AIAgentService.createSlideshowFromUrls(imageUrls);
		
		logger.info(`클라이언트에 파일 다운로드 시작: ${tempFilePath}`);
		
		// res.download()는 파일을 전송하고, 콜백 함수에서 후처리(파일 삭제)를 수행할 수 있습니다.
		res.download(tempFilePath, (err) => {
			if (err) {
				// 응답이 이미 시작되었을 수 있으므로, 헤더를 보내는 에러 처리는 위험합니다.
				// 에러를 로깅하는 것이 최선입니다.
				logger.error('파일 다운로드 전송 중 오류 발생:', err);
			} else {
				logger.info('클라이언트로 파일 다운로드 성공.');
			}
			
			// 다운로드 성공 여부와 관계없이 임시 파일을 삭제합니다.
			fs.unlink(tempFilePath, (unlinkErr) => {
				if (unlinkErr) {
					logger.error(`임시 파일 삭제 실패: ${tempFilePath}`, unlinkErr);
				} else {
					logger.info(`임시 파일 삭제 완료: ${tempFilePath}`);
				}
			});
		});

	} catch (error) {
		logger.error('슬라이드쇼 생성 파이프라인 중 오류 발생:', error);
		
		// 만약 파일이 생성되던 중에 오류가 발생했다면, 해당 파일을 정리합니다.
		if (tempFilePath) {
			fs.unlink(tempFilePath, (unlinkErr) => {
				if (unlinkErr) {
					logger.error(`오류 발생 후 임시 파일 정리 실패: ${tempFilePath}`, unlinkErr);
				}
			});
		}
		
		if (!res.headersSent) {
			next(error);
		}
	}
});


module.exports = router; 