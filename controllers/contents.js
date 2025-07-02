const express = require('express');
const router = express.Router();
const contentsServices = require('../services/contentsServices');
const { authMiddleware } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const { logSensitiveAction } = require('../middlewares/logging');
const { logUserAction } = require('../config/logger');

/**
 * @openapi
 * /api/contents:
 *   get:
 *     summary: 모든 게시물을 미디어와 함께 조회
 *     tags: [Contents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 게시물 목록 (미디어 포함)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ContentWithMediaResponse'
 *   post:
 *     summary: 새 게시물을 미디어와 함께 생성
 *     tags: [Contents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               contentType:
 *                 type: string
 *                 enum: [qna, community]
 *               body:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 5
 *     responses:
 *       201:
 *         description: 생성된 게시물
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ContentWithMediaResponse'
 *
 * 
 * /api/contents/qna:
 *   get:
 *     summary: QNA 게시물 조회
 *     tags: [Contents]
 *     responses:
 *       200:
 *         description: QNA 게시물 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/QnaContentResponse'
 * 
 * /api/contents/community:
 *   get:
 *     summary: Community 게시물 조회
 *     tags: [Contents]
 *     responses:
 *       200:
 *         description: Community 게시물 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CommunityContentResponse'
 * 
 * /api/contents/{id}:
 *   get:
 *     summary: 특정 게시물 조회
 *     tags: [Contents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 단일 게시물
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommunityContentResponse'
 *   patch:
 *     summary: 특정 게시물 수정
 *     tags: [Contents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContentUpdateRequest'
 *     responses:
 *       200:
 *         description: 수정된 게시물
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommunityContentResponse'
 *   delete:
 *     summary: 특정 게시물 삭제
 *     tags: [Contents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 삭제된 게시물
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommunityContentResponse'
 * 
 * /api/contents/{id}/refresh-sas:
 *   post:
 *     summary: 특정 게시물의 만료된 SAS URL 갱신
 *     tags: [Contents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 게시물 ID
 *     responses:
 *       200:
 *         description: SAS URL 갱신 완료
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "2개의 SAS URL이 갱신되었습니다."
 *                 refreshed_count:
 *                   type: integer
 *                   example: 2
 *                 failed_count:
 *                   type: integer
 *                   example: 0
 *                 media:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MediaResponse'
 *       403:
 *         description: 권한 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 게시물을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// GET /api/contents - 모든 게시물을 미디어와 함께 조회
router.get('/', authMiddleware, async (req, res) => {
	try {
		const contents = await contentsServices.findAll();
		console.log("contents ", contents);
		res.json({
			code: 200,
			message: "성공했습니다.",
			result: contents
		});
	} catch (error) {
		console.error('게시물 목록 조회 오류:', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message,
			result: null
		});
	}
});

router.get('/qna', authMiddleware, async (req, res) => {
	try {
		const contents = await contentsServices.findByContentType('qna');
		res.json({
			code: 200,
			message: "성공했습니다.",
			result: contents
		});
	} catch (error) {
		console.error('QNA 게시물 조회 오류:', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message,
			result: null
		});
	}
});

router.get('/community', authMiddleware, async (req, res) => {
	try {
		const contents = await contentsServices.findByContentType('community');
		res.json({
			code: 200,
			message: "성공했습니다.",
			result: contents
		});
	} catch (error) {
		console.error('Community 게시물 조회 오류:', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message,
			result: null
		});
	}
});

// GET /api/contents/search - 키워드로 게시물 검색
router.get('/search', authMiddleware, async (req, res) => {
	try {
		const { keyword } = req.query;
		
		const contents = await contentsServices.searchByKeyword(keyword);
		res.json({
			code: 200,
			message: "성공했습니다.",
			result: {
				data: contents,
				keyword: keyword,
				total: contents.length
			}
		});
	} catch (error) {
		console.error('게시물 검색 오류:', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message,
			result: null
		});
	}
});

router.get('/:id', authMiddleware, async (req, res) => {
	try {
		const { id } = req.params;
		const content = await contentsServices.findById(id);
		res.json({
			code: 200,
			message: "성공했습니다.",
			result: content
		});
	} catch (error) {
		console.error('게시물 조회 오류:', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message,
			result: null
		});
	}
});

router.post('/', authMiddleware, upload.array('images', 5), async (req, res) => {
	try {
		const userId = req.user.id;
		const { contentType, body } = req.body;
		const imageFiles = req.files;

		// 기본 유효성 검사 (서비스에서도 하지만 컨트롤러에서 먼저 체크)
		if (!contentType || !body) {
			return res.status(400).json({
				code: 400,
				message: '필수 필드가 누락되었습니다. (contentType, body)',
				result: null
			});
		}

		const contentData = { contentType, body, userId };

		// 미디어 파일이 있으면 createWithMedia, 없으면 create 사용
		let content;
		if (imageFiles && imageFiles.length > 0) {
			content = await contentsServices.createWithMedia(contentData, imageFiles);
		} else {
			content = await contentsServices.create(contentData);
		}

		// 게시물 생성 로깅
		logUserAction(userId, 'CREATE_CONTENT', {
			contentId: content.id,
			contentType: contentType,
			hasMedia: imageFiles && imageFiles.length > 0,
			mediaCount: imageFiles ? imageFiles.length : 0,
			url: req.originalUrl,
			method: req.method
		});

		res.status(201).json({
			code: 200,
			message: "게시물이 생성되었습니다.",
			result: content
		});
	} catch (error) {
		console.error('게시물 생성 오류:', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message,
			result: null
		});
	}
});

router.patch('/:id', authMiddleware, async (req, res) => {
	try {
		const { id } = req.params;
		const contentData = req.body;
		
		const content = await contentsServices.update(id, contentData);
		
		// 게시물 수정 로깅
		logUserAction(req.user.id, 'UPDATE_CONTENT', {
			contentId: id,
			updatedFields: Object.keys(contentData),
			url: req.originalUrl,
			method: req.method
		});

		res.json({
			code: 200,
			message: "게시물이 수정되었습니다.",
			result: content
		});
	} catch (error) {
		console.error('게시물 수정 오류:', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message,
			result: null
		});
	}
});

router.delete('/:id', authMiddleware, async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.user.id;
		
		const deletedContent = await contentsServices.deleteById(id, userId);
		
		// 게시물 삭제 민감한 행동 로깅
		logSensitiveAction(req, 'DELETE_CONTENT', id);

		res.json({
			code: 200,
			message: "게시물이 삭제되었습니다.",
			result: deletedContent
		});
	} catch (error) {
		console.error('게시물 삭제 오류:', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message,
			result: null
		});
	}
});

// POST /api/contents/:id/refresh-sas - 특정 게시물의 만료된 SAS URL 수동 갱신
router.post('/:id/refresh-sas', authMiddleware, async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.user.id;
		
		// 권한 확인: 게시물 작성자만 갱신 가능
		const content = await contentsServices.findById(id);
		if (content.userId !== userId) {
			return res.status(403).json({
				code: 400,
				message: '갱신 권한이 없습니다.',
				result: null
			});
		}
		
		// 미디어가 없으면 빈 배열 반환
		if (!content.media || content.media.length === 0) {
			return res.json({
				code: 200,
				message: '갱신할 미디어가 없습니다.',
				result: { media: [] }
			});
		}
		
		// 만료된 URL 확인
		const storageRepository = require('../repository/storageRepository');
		const expiredUrls = content.media.filter(media => 
			storageRepository.isSasUrlExpired(media.file_url)
		);
		
		if (expiredUrls.length === 0) {
			return res.json({
				code: 200,
				message: '만료된 SAS URL이 없습니다.',
				result: { media: content.media }
			});
		}
		
		// 강제로 SAS URL 재생성 (24시간 만료)
		const regenerateResult = await storageRepository.regenerateMultipleSasUrls(
			expiredUrls.map(media => media.file_url),
			'contents-images',
			24 // 24시간
		);
		
		// DB 업데이트
		const { pool } = require('../config/dbConfig');
		const client = await pool.connect();
		
		try {
			await client.query('BEGIN');
			
			for (const {old: oldUrl, new: newUrl} of regenerateResult.success) {
				await client.query(
					'UPDATE media SET file_url = $1, updated_at = now() WHERE file_url = $2',
					[newUrl, oldUrl]
				);
			}
			
			await client.query('COMMIT');
			
			// 업데이트된 미디어 정보 조회
			const updatedContent = await contentsServices.findById(id);
			
			res.json({
				code: 200,
				message: `${regenerateResult.success.length}개의 SAS URL이 갱신되었습니다.`,
				result: {
					refreshed_count: regenerateResult.success.length,
					failed_count: regenerateResult.failed.length,
					media: updatedContent.media
				}
			});
			
		} catch (dbError) {
			await client.query('ROLLBACK');
			throw dbError;
		} finally {
			client.release();
		}
		
	} catch (error) {
		console.error('SAS URL 갱신 오류:', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message,
			result: null
		});
	}
});

// ==================== 좋아요 관련 API ====================

/**
 * @openapi
 * /api/contents/{id}/likes:
 *   post:
 *     summary: 게시물 좋아요 토글 (좋아요/취소)
 *     tags: [Contents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 게시물 ID
 *     responses:
 *       200:
 *         description: 좋아요 처리 완료
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 isLiked:
 *                   type: boolean
 *                 like:
 *                   type: object
 *   get:
 *     summary: 특정 게시물의 좋아요 목록 조회
 *     tags: [Contents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 게시물 ID
 *     responses:
 *       200:
 *         description: 좋아요 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */

// POST /api/contents/:id/likes - 좋아요 토글
router.post('/:id/likes', authMiddleware, async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.user.id;
		
		const result = await contentsServices.toggleLike(userId, id);
		
		// 좋아요 행동 로깅
		logUserAction(userId, result.isLiked ? 'LIKE_CONTENT' : 'UNLIKE_CONTENT', {
			contentId: id,
			url: req.originalUrl,
			method: req.method
		});

		res.json({
			code: 200,
			message: result.isLiked ? "좋아요를 추가했습니다." : "좋아요를 취소했습니다.",
			result: result
		});
	} catch (error) {
		console.error('좋아요 토글 오류:', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message,
			result: null
		});
	}
});

// GET /api/contents/:id/likes - 특정 게시물의 좋아요 목록 조회
router.get('/:id/likes', authMiddleware, async (req, res) => {
	try {
		const { id } = req.params;
		
		const likes = await contentsServices.getContentLikes(id);
		res.json({
			code: 200,
			message: "성공했습니다.",
			result: likes
		});
	} catch (error) {
		console.error('좋아요 목록 조회 오류:', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message,
			result: null
		});
	}
});

// ==================== 댓글 관련 API ====================

/**
 * @openapi
 * /api/contents/{id}/comments:
 *   post:
 *     summary: 게시물에 댓글 작성
 *     tags: [Contents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 게시물 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               body:
 *                 type: string
 *                 description: 댓글 내용
 *     responses:
 *       201:
 *         description: 댓글 작성 완료
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *   get:
 *     summary: 특정 게시물의 댓글 목록 조회
 *     tags: [Contents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 게시물 ID
 *     responses:
 *       200:
 *         description: 댓글 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */

// POST /api/contents/:id/comments - 댓글 작성
router.post('/:id/comments', authMiddleware, async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.user.id;
		const { body } = req.body;
		
		const comment = await contentsServices.createComment(userId, id, body);
		
		// 댓글 작성 로깅
		logUserAction(userId, 'CREATE_COMMENT', {
			commentId: comment.id,
			contentId: id,
			url: req.originalUrl,
			method: req.method
		});

		res.status(201).json({
			code: 200,
			message: "댓글이 작성되었습니다.",
			result: comment
		});
	} catch (error) {
		console.error('댓글 작성 오류:', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message,
			result: null
		});
	}
});

// GET /api/contents/:id/comments - 특정 게시물의 댓글 목록 조회
router.get('/:id/comments', authMiddleware, async (req, res) => {
	try {
		const { id } = req.params;
		
		const comments = await contentsServices.getContentComments(id);
		res.json({
			code: 200,
			message: "성공했습니다.",
			result: comments
		});
	} catch (error) {
		console.error('댓글 목록 조회 오류:', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message,
			result: null
		});
	}
});

module.exports = router;