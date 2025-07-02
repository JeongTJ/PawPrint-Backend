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
	try {
		const plans = await plansServices.findAll();
		res.json({
			code: 200,
			message: "계획 목록을 성공적으로 조회했습니다.",
			result: plans
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

router.post('/', async (req, res) => {
	try {
		const plan = await plansServices.create(req.body);
		res.status(201).json({
			code: 200,
			message: "계획이 성공적으로 생성되었습니다.",
			result: plan
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

router.get('/:planId', async (req, res) => {
	try {
		const { planId } = req.params;
		const plan = await plansServices.findById(planId);
		if (!plan) {
			return res.status(404).json({
				code: 400,
				message: `planId ${planId} Plan not found`,
				result: null
			});
		}
		res.json({
			code: 200,
			message: "계획을 성공적으로 조회했습니다.",
			result: plan
		});
	} catch (error) {
		res.status(500).json({
			code: 500,
			message: 'Internal server error',
			result: null
		});
	}
});

router.patch('/:planId', async (req, res) => {
	try {
		const { planId } = req.params;
		const planData = req.body;
		console.log(planData);
		const plan = await plansServices.update(planId, planData);
		if (!plan) {
			return res.status(404).json({
				code: 400,
				message: `planId ${planId} Plan not found`,
				result: null
			});
		}
		res.json({
			code: 200,
			message: "계획이 성공적으로 수정되었습니다.",
			result: plan
		});
	} catch (error) {
		res.status(500).json({
			code: 500,
			message: 'Internal server error',
			result: null
		});
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