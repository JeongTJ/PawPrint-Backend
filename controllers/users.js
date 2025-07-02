const express = require('express');
const router  = express.Router();
const usersServices = require('../services/usersServices');
const { authMiddleware } = require('../middlewares/auth');

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: 모든 사용자 조회
 *     tags: [users]
 *     responses:
 *       200:
 *         description: 사용자 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UserResponse'
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
 */

router.get('/', async (req, res) => {
	const users = await usersServices.findAll();
	res.json(users);
});

router.post('/', async (req, res) => {
	try {
		const user = await usersServices.create(req.body);
		res.status(201).json(user);
	} catch (error) {
		res.status(error.statusCode || 500).json({ error: error.message || 'Internal server error' });
	}
});

// "내" 정보 조회 API (토큰 기반)
router.get('/me', authMiddleware, async (req, res) => {
	try {
		// authMiddleware가 req.user에 저장해준 사용자 정보를 사용합니다.
		const userId = req.user.id; 
		const user = await usersServices.findById(userId);
		
		res.json(user);
	} catch (error) {
		res.status(error.statusCode || 500).json({ error: error.message || 'Internal server error' });
	}
});

router.patch('/me', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id; 
		const user = await usersServices.update(userId, req.body);
		res.json(user);
	} catch (error) {
		res.status(error.statusCode || 500).json({ error: error.message || 'Internal server error' });
	}
});

// 특정 사용자 조회 (ID 기반) - 관리자용 또는 다른 사용자 프로필 조회용
router.get('/:userId', authMiddleware, async (req, res) => {
	try {
		const { userId } = req.params;
		const user = await usersServices.findById(userId);
		
		res.json(user);
	} catch (error) {
		res.status(error.statusCode || 500).json({ error: error.message || 'Internal server error' });
	}
});


module.exports = router; 