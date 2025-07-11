const express = require('express');
const router = express.Router();
const AIAgentService = require('../services/AIAgentServices');
const contentsServices = require('../services/contentsServices');
const { authMiddleware } = require('../middlewares/auth');
const { logger } = require('../config/logger');
// axios require 제거

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
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "슬라이드쇼 비디오가 임시 생성되었습니다."
 *                 result:
 *                   type: object
 *                   properties:
 *                     videoUrl:
 *                       type: string
 *                       format: uri
 *                       description: "앱에서 재생할 수 있는 임시 비디오 URL (예: 24시간 유효)"
 *                     videoId:
 *                       type: string
 *                       description: "게시물 작성 시 이 비디오를 식별하기 위한 고유 ID"
 *                     title:
 *                       type: string
 *                       description: "AI가 생성한 슬라이드쇼 제목"
 *
 *       '400':
 *         description: "잘못된 요청 (예: 이미지 URL이 없거나 형식이 잘못됨)"
 *       '500':
 *         description: "AI 서버 또는 내부 서버 오류"
 */
router.post('/create-slideshow', async (req, res, next) => {
	const { imageUrls } = req.body;

	if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
		return res.status(400).json({ 
			code: 400,
			message: '이미지 URL 배열이 필요합니다.',
			result: null
		});
	}

	try {
		logger.info(`AI 슬라이드쇼 생성 요청 받음. 이미지 개수: ${imageUrls.length}`);
		const { videoUrl, videoId, title } = await AIAgentService.createSlideshowFromUrls(imageUrls);
		
		logger.info('클라이언트에 임시 비디오 정보 응답');
		res.status(200).json({
			code: 200,
			message: '슬라이드쇼 비디오가 임시 생성되었습니다.',
			result: {
				videoUrl: videoUrl,
				videoId: videoId,
				title: title
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

/**
 * @swagger
 * /api/v1/ai/chat/start:
 *   post:
 *     summary: 새로운 채팅 세션 시작
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 채팅 세션이 성공적으로 시작됨
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "AI 챗봇 세션이 성공적으로 시작되었습니다."
 *                 result:
 *                   type: object
 *                   properties:
 *                     session_id:
 *                       type: string
 *                       format: uuid
 *                       description: "새로 생성된 채팅 세션 ID"
 *                     response_text:
 *                       type: string
 *                       description: "AI의 첫 응답 메시지"
 *                     imageUrl:
 *                       type: string
 *                       format: uri
 *                       description: "대화의 주제가 된 이미지 URL"
 *       400:
 *         description: "잘못된 요청 (예: 사용자가 반려동물이나 미션 추억을 가지고 있지 않음)"
 *       500:
 *         description: "서버 오류 또는 AI 서버 통신 오류"
 *
 * /api/v1/ai/chat/send:
 *   post:
 *     summary: 채팅 메시지 전송
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - message
 *             properties:
 *               session_id:
 *                 type: string
 *                 format: uuid
 *                 description: "현재 진행중인 채팅 세션 ID"
 *               message:
 *                 type: string
 *                 description: "사용자가 보내는 메시지"
 *             example:
 *               session_id: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 *               message: "우리 강아지가 좋아하는 간식은 뭘까?"
 *     responses:
 *       200:
 *         description: AI의 응답 메시지
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "AI의 응답이 성공적으로 수신되었습니다."
 *                 result:
 *                   type: object
 *                   description: AI 서버의 응답 데이터
 *                   properties:
 *                     session_id:
 *                       type: string
 *                       format: uuid
 *                       description: "현재 채팅 세션 ID (AI 서버가 응답에 포함시켜 반환)"
 *                     response_text:
 *                       type: string
 *                       description: "AI의 텍스트 응답"
 *                     add_date:
 *                       type: boolean
 *                       description: "일정 추가 제안 여부"
 *                     json_date:
 *                       type: object
 *                       description: "일정 생성을 위한 추가 데이터 (add_date가 true일 경우 포함됨)"
 *                       properties:
 *                         title:
 *                           type: string
 *                           description: "제안된 일정 제목"
 *                         description:
 *                           type: string
 *                           description: "제안된 일정 상세 내용"
 *                         date:
 *                           type: string
 *                           format: date
 *                           description: "제안된 일정 날짜 (YYYY-MM-DD)"
 *                         time:
 *                           type: string
 *                           format: time
 *                           description: "제안된 일정 시간 (HH:mm:ss)"
 *                         reminderOption:
 *                           type: integer
 *                           description: "리마인더 옵션 (분 단위)"
 *                   example:
 *                     session_id: "f5578155-896f-46ac-8103-731d7db19934"
 *                     response_text: "봄이가 좋아하는 간식을 찾는 것은 정말 즐거운 일이지만..."
 *                     add_date: true
 *                     json_date:
 *                       title: "봄이 간식 관련 수의사 상담"
 *                       description: "봄이가 간식을 먹고 이상 반응을 보이는지 확인하고..."
 *                       date: "2025-07-12"
 *                       time: "19:16:01"
 *                       reminderOption: 60
 *       400:
 *         description: "요청 본문이 잘못되었습니다 (예: session_id 또는 message 누락)."
 *       500:
 *         description: "서버 오류"
 *
 * /api/v1/ai/chat/end:
 *   post:
 *     summary: 채팅 세션 종료
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *             properties:
 *               session_id:
 *                 type: string
 *                 format: uuid
 *                 description: 종료할 채팅 세션의 ID입니다.
 *             example:
 *               session_id: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 *     responses:
 *       200:
 *         description: 채팅 세션이 성공적으로 종료됨
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "채팅 세션이 성공적으로 종료되었습니다."
 *                 result:
 *                   type: object
 *                   description: "AI 서버의 응답 데이터. 응답 내용이 있을 경우 포함됩니다."
 *                   example:
 *                     message: "세션이 성공적으로 종료되었습니다."
 *       400:
 *         description: "요청 본문이 잘못되었습니다 (예: session_id 누락)."
 *       500:
 *         description: "서버 오류"
 */

router.post('/chat/start', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const resultData = await AIAgentService.startChat(userId);
        
        res.status(200).json({
            code: 200,
            message: 'AI 챗봇 세션이 성공적으로 시작되었습니다.',
            result: resultData
        });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            code: statusCode,
            message: error.message || 'AI 챗봇 시작 중 서버 오류가 발생했습니다.',
            result: error.data || null // 서비스에서 전달한 상세 오류 데이터를 포함
        });
    }
});

router.post('/chat/send', authMiddleware, async (req, res) => {
    try {
        const { session_id, message } = req.body;

        if (!session_id || !message) {
            return res.status(400).json({
                code: 400,
                message: 'session_id와 message는 필수입니다.',
                result: null
            });
        }

        const resultData = await AIAgentService.sendChatMessage(session_id, message);
        
        res.status(200).json({
            code: 200,
            message: 'AI의 응답이 성공적으로 수신되었습니다.',
            result: resultData
        });

    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            code: statusCode,
            message: error.message || '채팅 메시지 전송 중 서버 오류가 발생했습니다.',
            result: error.data || null
        });
    }
});

router.post('/chat/end', authMiddleware, async (req, res) => {
    try {
        const { session_id } = req.body;

        if (!session_id) {
            return res.status(400).json({
                code: 400,
                message: 'session_id는 필수입니다.',
                result: null
            });
        }
        
        const resultData = await AIAgentService.endChatSession(session_id);

        res.status(200).json({
            code: 200,
            message: '채팅 세션이 성공적으로 종료되었습니다.',
            result: resultData
        });

    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            code: statusCode,
            message: error.message || '채팅 세션 종료 중 서버 오류가 발생했습니다.',
            result: error.data || null
        });
    }
});


module.exports = router; 