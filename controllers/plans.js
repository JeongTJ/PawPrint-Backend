const express = require('express');
const router  = express.Router();
const plansServices = require('../services/plansServices');

/**
 * @openapi
 * /api/plans:
 *   get:
 *     summary: 모든 계획 조회
 *     tags: [Plans]
 *     responses:
 *       200:
 *         description: 계획 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PlanView'
 *   post:
 *     summary: 새 계획 생성
 *     tags: [Plans]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Plan'
 *     responses:
 *       201:
 *         description: 생성된 계획
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Plan'
 *
 * /api/plans/{planId}:
 *   get:
 *     summary: 특정 계획 조회
 *     tags: [Plans]
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 단일 계획
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Plan'
 *   patch:
 *     summary: 특정 계획 수정
 *     tags: [Plans]
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Plan'
 *     responses:
 *       200:
 *         description: 단일 계획
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Plan'
 */

// GET /api/plans
router.get('/', async (req, res) => {
	const plans = await plansServices.findAll();
	res.json(plans);
});

router.post('/', async (req, res) => {
	const plan = await plansServices.create(req.body);
	res.status(201).json(plan);
});

router.get('/:planId', async (req, res) => {
	try {
		const { planId } = req.params;
		const plan = await plansServices.findById(planId);
		if (!plan) {
			return res.status(404).json({ error: `planId ${planId} Plan not found` });
		}
		res.json(plan);
	} catch (error) {
		res.status(500).json({ error: 'Internal server error' });
	}
});

router.patch('/:planId', async (req, res) => {
	try {
		const { planId } = req.params;
		const planData = req.body;
		console.log(plan);
		console.log(planData);
		const plan = await plansServices.update(planId, planData);
		if (!plan) {
			return res.status(404).json({ error: `planId ${planId} Plan not found` });
		}
		res.json(plan);
	} catch (error) {
		res.status(500).json({ error: 'Internal server error' });
	}
});

// // POST /api/plans
// router.post('/', (req, res) => {
// 	pool.query('SELECT NOW()', (err, res) => {
// 		if (err) {
// 			console.error('Error executing query', err);
// 			res.status(500).json({ error: 'Database error' });
// 			return;
// 		}
// 	});
//   const plan = req.body;
//   plan.id = 1; // 예시 고정 값
//   res.status(201).json(plan);
// });

// // GET /api/plans/:planId
// router.get('/:planId', (req, res) => {
//   const { planId } = req.params;
//   res.json({ id: Number(planId), title: '산책', date: '2024-06-30' });
// });

module.exports = router;