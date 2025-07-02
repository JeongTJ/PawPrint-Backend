const express = require('express');
const router = express.Router();
const contentsServices = require('../services/contentsServices');
const { authMiddleware } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

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
 *               content_type:
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
 *                 $ref: '#/components/schemas/ContentResponse'
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
 *                 $ref: '#/components/schemas/ContentResponse'
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
 *               $ref: '#/components/schemas/ContentResponse'
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
 *               $ref: '#/components/schemas/ContentResponse'
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
 *               $ref: '#/components/schemas/ContentResponse'
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
		res.json(contents);
	} catch (error) {
		console.error('게시물 목록 조회 오류:', error);
		res.status(error.statusCode || 500).json({ message: error.message });
	}
});

router.get('/qna', authMiddleware, async (req, res) => {
	try {
		const contents = await contentsServices.findByContentType('qna');
		res.json(contents);
	} catch (error) {
		console.error('QNA 게시물 조회 오류:', error);
		res.status(error.statusCode || 500).json({ message: error.message });
	}
});

router.get('/community', authMiddleware, async (req, res) => {
	try {
		const contents = await contentsServices.findByContentType('community');
		res.json(contents);
	} catch (error) {
		console.error('Community 게시물 조회 오류:', error);
		res.status(error.statusCode || 500).json({ message: error.message });
	}
});

router.get('/:id', authMiddleware, async (req, res) => {
	try {
		const { id } = req.params;
		const content = await contentsServices.findById(id);
		res.json(content);
	} catch (error) {
		console.error('게시물 조회 오류:', error);
		res.status(error.statusCode || 500).json({ message: error.message });
	}
});

router.post('/', authMiddleware, upload.array('images', 5), async (req, res) => {
	try {
		const user_id = req.user.id;
		const { content_type, body } = req.body;
		const imageFiles = req.files;

		// 기본 유효성 검사 (서비스에서도 하지만 컨트롤러에서 먼저 체크)
		if (!content_type || !body) {
			return res.status(400).json({
				message: '필수 필드가 누락되었습니다. (content_type, body)'
			});
		}

		const contentData = { content_type, body, user_id };

		// 미디어 파일이 있으면 createWithMedia, 없으면 create 사용
		let content;
		if (imageFiles && imageFiles.length > 0) {
			content = await contentsServices.createWithMedia(contentData, imageFiles);
		} else {
			content = await contentsServices.create(contentData);
		}

		res.status(201).json(content);
	} catch (error) {
		console.error('게시물 생성 오류:', error);
		res.status(error.statusCode || 500).json({ message: error.message });
	}
});

router.patch('/:id', authMiddleware, async (req, res) => {
	try {
		const { id } = req.params;
		const contentData = req.body;
		
		const content = await contentsServices.update(id, contentData);
		res.json(content);
	} catch (error) {
		console.error('게시물 수정 오류:', error);
		res.status(error.statusCode || 500).json({ message: error.message });
	}
});

router.delete('/:id', authMiddleware, async (req, res) => {
	try {
		const { id } = req.params;
		const user_id = req.user.id;
		
		const deletedContent = await contentsServices.deleteById(id, user_id);
		res.json(deletedContent);
	} catch (error) {
		console.error('게시물 삭제 오류:', error);
		res.status(error.statusCode || 500).json({ message: error.message });
	}
});

// POST /api/contents/:id/refresh-sas - 특정 게시물의 만료된 SAS URL 수동 갱신
router.post('/:id/refresh-sas', authMiddleware, async (req, res) => {
	try {
		const { id } = req.params;
		const user_id = req.user.id;
		
		// 권한 확인: 게시물 작성자만 갱신 가능
		const content = await contentsServices.findById(id);
		if (content.user_id !== user_id) {
			return res.status(403).json({ message: '갱신 권한이 없습니다.' });
		}
		
		// 미디어가 없으면 빈 배열 반환
		if (!content.media || content.media.length === 0) {
			return res.json({ 
				message: '갱신할 미디어가 없습니다.',
				media: []
			});
		}
		
		// 만료된 URL 확인
		const storageRepository = require('../repository/storageRepository');
		const expiredUrls = content.media.filter(media => 
			storageRepository.isSasUrlExpired(media.file_url)
		);
		
		if (expiredUrls.length === 0) {
			return res.json({ 
				message: '만료된 SAS URL이 없습니다.',
				media: content.media
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
				message: `${regenerateResult.success.length}개의 SAS URL이 갱신되었습니다.`,
				refreshed_count: regenerateResult.success.length,
				failed_count: regenerateResult.failed.length,
				media: updatedContent.media
			});
			
		} catch (dbError) {
			await client.query('ROLLBACK');
			throw dbError;
		} finally {
			client.release();
		}
		
	} catch (error) {
		console.error('SAS URL 갱신 오류:', error);
		res.status(error.statusCode || 500).json({ message: error.message });
	}
});

module.exports = router;