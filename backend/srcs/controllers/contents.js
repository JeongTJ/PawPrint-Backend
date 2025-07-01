const express = require('express');
const router  = express.Router();
const contentsServices = require('../services/contentsServices');
const { authMiddleware } = require('../middlewares/auth');

/**
 * @openapi
 * /api/contents:
 *   get:
 *     summary: 모든 게시물 조회
 *     tags: [Contents]
 *     responses:
 *       200:
 *         description: 계획 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ContentResponse'
 *   post:
 *     summary: 새 게시물 생성
 *     tags: [Contents]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContentCreateRequest'
 *     responses:
 *       201:
 *         description: 생성된 계획
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ContentResponse'
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
 */

// GET /api/contents
router.get('/', authMiddleware, async (req, res) => {
	try {
		const contents = await contentsServices.findAll();
		res.json(contents);
	} catch (error) {
		res.status(error.statusCode || 500).json({ message: error.message });
	}
});

router.get('/qna', authMiddleware, async (req, res) => {
	try {
		const contents = await contentsServices.findByType('qna');
		res.json(contents);
	} catch (error) {
		res.status(error.statusCode || 500).json({ message: error.message });
	}
});

router.get('/community', authMiddleware, async (req, res) => {
	try {
		const contents = await contentsServices.findByType('community');
		res.json(contents);
	} catch (error) {
		res.status(error.statusCode || 500).json({ message: error.message });
	}
});

router.get('/:id', authMiddleware, async (req, res) => {
	try {
		const { id } = req.params;
		const content = await contentsServices.findById(id);
		res.json(content);
	} catch (error) {
		res.status(error.statusCode || 500).json({ message: error.message });
	}
});

router.post('/', authMiddleware, async (req, res) => {
	try {
		const { content_type, body } = req.body;
		const member_id = req.user.id;
		const contentData = { content_type, body, member_id };
		const content = await contentsServices.create(contentData);
		res.status(201).json(content);
	} catch (error) {
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
		res.status(error.statusCode || 500).json({ message: error.message });
	}
});

router.delete('/:id', authMiddleware, async (req, res) => {
	try {
		const { id } = req.params;
		const member_id = req.user.id;
		const content = await contentsServices.deleteById(id, member_id);
		res.json(content);
	} catch (error) {
		res.status(error.statusCode || 500).json({ message: error.message });
	}
});

module.exports = router;