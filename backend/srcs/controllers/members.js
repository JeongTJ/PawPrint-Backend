const express = require('express');
const router  = express.Router();
const membersServices = require('../services/membersServices');
const { authMiddleware } = require('../middlewares/auth');

/**
 * @openapi
 * /api/members:
 *   get:
 *     summary: 모든 회원 조회
 *     tags: [members]
 *     responses:
 *       200:
 *         description: 회원 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MemberView'
 *   post:
 *     summary: 새 회원 생성
 *     tags: [members]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Member'
 *     responses:
 *       201:
 *         description: 생성된 회원
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Member'
 *
 * /api/members/me:
 *   get:
 *     summary: 내 정보 조회
 *     tags: [members]
 *     responses:
 *       200:
 *         description: 내 정보
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MemberView'
 *   patch:
 *     summary: 내 정보 수정
 *     tags: [members]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Member'
 *     responses:
 *       200:
 *         description: 수정된 회원 정보
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Member'
 * 
 * /api/members/{memberId}:
 *   get:
 *     summary: 특정 회원 조회
 *     tags: [members]
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 단일 회원
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Member'
 */

router.get('/', async (req, res) => {
	const members = await membersServices.findAll();
	res.json(members);
});

router.post('/', async (req, res) => {
	const member = await membersServices.create(req.body);
	res.status(201).json(member);
});

// "내" 정보 조회 API (토큰 기반)
router.get('/me', authMiddleware, async (req, res) => {
	try {
		// authMiddleware가 req.user에 저장해준 사용자 정보를 사용합니다.
		const memberId = req.user.id; 
		const member = await membersServices.findById(memberId);
		
		res.json(member);
	} catch (error) {
		res.status(error.statusCode || 500).json({ error: error.message || 'Internal server error' });
	}
});

router.patch('/me', authMiddleware, async (req, res) => {
	try {
		const memberId = req.user.id; 
		const member = await membersServices.update(memberId, req.body);
		res.json(member);
	} catch (error) {
		res.status(error.statusCode || 500).json({ error: error.message || 'Internal server error' });
	}
});

// 특정 회원 조회 (ID 기반) - 관리자용 또는 다른 사용자 프로필 조회용
router.get('/:memberId', authMiddleware, async (req, res) => {
	try {
		const { memberId } = req.params;
		const member = await membersServices.findById(memberId);
		
		res.json(member);
	} catch (error) {
		res.status(error.statusCode || 500).json({ error: error.message || 'Internal server error' });
	}
});


module.exports = router;