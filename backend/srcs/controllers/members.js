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
 *               $ref: '#/components/schemas/member'
 *   patch:
 *     summary: 특정 회원 수정
 *     tags: [members]
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/member'
 *     responses:
 *       200:
 *         description: 단일 계획
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/member'
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
		
		if (!member) {
			// 토큰은 유효하지만 해당 유저가 DB에 없는 경우
			return res.status(404).json({ error: 'Member not found' });
		}
		res.json(member);

	} catch (error) {
		res.status(500).json({ error: 'Internal server error' });
	}
});

// 특정 회원 조회 (ID 기반) - 관리자용 또는 다른 사용자 프로필 조회용
router.get('/:memberId', authMiddleware, async (req, res) => {
	try {
		const { memberId } = req.params;
		const member = await membersServices.findById(memberId);
		if (!member) {
			return res.status(404).json({ error: `memberId ${memberId} Member not found` });
		}
		res.json(member);
	} catch (error) {
		res.status(500).json({ error: 'Internal server error' });
	}
});

router.patch('/:memberId', authMiddleware, async (req, res) => {
	try {
		const { memberId } = req.params;

		// "내 정보 수정"은 이제 /me 엔드포인트를 만들어 처리하거나,
		// 여기서 권한 검사를 강화할 수 있습니다.
		if (req.user.id !== parseInt(memberId, 10)) {
			return res.status(403).json({ error: 'Permission denied.' });
		}

		const memberData = req.body;
		const member = await membersServices.update(memberId, memberData);
		if (!member) {
			return res.status(404).json({ error: `memberId ${memberId} member not found` });
		}
		res.json(member);
	} catch (error) {
		res.status(500).json({ error: 'Internal server error' });
	}
});

module.exports = router;