const express = require('express');
const router  = express.Router();
const usersServices = require('../services/usersServices');
const contentsServices = require('../services/contentsServices');
const { authMiddleware } = require('../middlewares/auth');

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: 사용자 조회 (전체 목록 또는 닉네임 검색)
 *     tags: [users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: nickname
 *         required: false
 *         schema:
 *           type: string
 *         description: 검색할 닉네임 (없으면 전체 사용자 목록 반환)
 *     responses:
 *       200:
 *         description: 사용자 목록 또는 검색된 사용자
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserResponse'
 *                 - $ref: '#/components/schemas/UserResponse'
 *       404:
 *         description: 사용자를 찾을 수 없음 (닉네임 검색 시)
 *
 *   post:
 *     summary: 새 사용자 생성
 *     tags: [users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserCreateRequest'
 *     responses:
 *       201:
 *         description: 생성된 사용자
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *
 * /api/users/me:
 *   get:
 *     summary: 내 정보 조회
 *     tags: [users]
 *     responses:
 *       200:
 *         description: 내 정보
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *   patch:
 *     summary: 내 정보 수정
 *     tags: [users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdateRequest'
 *     responses:
 *       200:
 *         description: 수정된 사용자 정보
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 * 
 *
 * /api/users/{userId}:
 *   get:
 *     summary: 특정 사용자 조회
 *     tags: [users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 단일 사용자
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 * /api/users/{userId}/contents:
 *   get:
 *     summary: 특정 사용자의 게시물 목록 조회
 *     tags: [users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 특정 사용자의 게시물 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ContentWithMediaResponse'
 */

router.get('/', authMiddleware, async (req, res) => {
	try {
		const { nickname } = req.query;
		
		// nickname 쿼리 파라미터가 있으면 닉네임으로 검색
		if (nickname) {
			const user = await usersServices.findByNickname(nickname);
			res.json({
				code: 200,
				message: "사용자 정보를 성공적으로 조회했습니다.",
				result: user
			});
		} else {
			// nickname 파라미터가 없으면 전체 사용자 목록 조회
			const users = await usersServices.findAll();
			res.json({
				code: 200,
				message: "사용자 목록을 성공적으로 조회했습니다.",
				result: users
			});
		}
	} catch (error) {
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message || 'Internal server error',
			result: null
		});
	}
});

router.post('/', async (req, res) => {
	try {
		const user = await usersServices.create(req.body);
		res.status(201).json({
			code: 200,
			message: "사용자가 성공적으로 생성되었습니다.",
			result: user
		});
	} catch (error) {
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message || 'Internal server error',
			result: null
		});
	}
});

// "내" 정보 조회 API (토큰 기반)
router.get('/me', authMiddleware, async (req, res) => {
	try {
		// authMiddleware가 req.user에 저장해준 사용자 정보를 사용합니다.
		const userId = req.user.id; 
		const user = await usersServices.findById(userId);
		
		res.json({
			code: 200,
			message: "내 정보를 성공적으로 조회했습니다.",
			result: user
		});
	} catch (error) {
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message || 'Internal server error',
			result: null
		});
	}
});

router.patch('/me', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id; 
		const user = await usersServices.update(userId, req.body);
		res.json({
			code: 200,
			message: "내 정보가 성공적으로 수정되었습니다.",
			result: user
		});
	} catch (error) {
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message || 'Internal server error',
			result: null
		});
	}
});

// 특정 사용자 조회 (ID 기반) - 관리자용 또는 다른 사용자 프로필 조회용
router.get('/:userId', authMiddleware, async (req, res) => {
	try {
		const { userId } = req.params;
		const user = await usersServices.findById(userId);
		
		res.json({
			code: 200,
			message: "사용자 정보를 성공적으로 조회했습니다.",
			result: user
		});
	} catch (error) {
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message || 'Internal server error',
			result: null
		});
	}
});

// 특정 사용자 조회 (ID 기반) - 관리자용 또는 다른 사용자 프로필 조회용
router.get('/:userId/contents', authMiddleware, async (req, res) => {
	try {
		const { userId } = req.params;
		const contents = await contentsServices.findByUserId(userId);
		res.json({
			code: 200,
			message: "사용자의 게시물 목록을 성공적으로 조회했습니다.",
			result: contents
		});
	} catch (error) {
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message || 'Internal server error',
			result: null
		});
	}
});

// ==================== 사용자별 좋아요/댓글 조회 API ====================

/**
 * @openapi
 * /api/users/me/likes:
 *   get:
 *     summary: 내가 좋아요한 게시물 목록 조회
 *     tags: [users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 내가 좋아요한 게시물 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ContentWithMediaResponse'
 * 
 * /api/users/me/comments:
 *   get:
 *     summary: 내가 작성한 댓글 목록 조회
 *     tags: [users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 내가 작성한 댓글 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */

// GET /api/users/me/likes - 내가 좋아요한 게시물 목록 조회
router.get('/me/likes', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;
		
		const likedContents = await contentsServices.getUserLikedContents(userId);
		res.json({
			code: 200,
			message: "좋아요한 게시물 목록을 성공적으로 조회했습니다.",
			result: likedContents
		});
	} catch (error) {
		console.error('좋아요한 게시물 조회 오류:', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message || 'Internal server error',
			result: null
		});
	}
});

// GET /api/users/me/comments - 내가 작성한 댓글 목록 조회
router.get('/me/comments', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;
		
		const userComments = await contentsServices.getUserComments(userId);
		res.json({
			code: 200,
			message: "내 댓글 목록을 성공적으로 조회했습니다.",
			result: userComments
		});
	} catch (error) {
		console.error('내 댓글 목록 조회 오류:', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message || 'Internal server error',
			result: null
		});
	}
});

module.exports = router; 