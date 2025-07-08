const express = require('express');
const router  = express.Router();
const plansServices = require('../services/plansServices');
const { authMiddleware } = require('../middlewares/auth');

/**
 * @openapi
 * /api/plans:
 *   get:
 *     summary: 내 모든 계획 조회
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 계획 목록
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlanListResponse'
 *   post:
 *     summary: 새 계획 생성
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PlanCreateRequest'
 *     responses:
 *       201:
 *         description: 생성된 계획
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlanResponse'
 *
 * /api/plans/today:
 *   get:
 *     summary: 오늘의 계획 조회
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 오늘의 계획 목록
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlanListResponse'
 *
 * /api/plans/upcoming:
 *   get:
 *     summary: 예정된 계획 조회
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *         description: 조회할 일수
 *     responses:
 *       200:
 *         description: 예정된 계획 목록
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlanListResponse'
 *
 * /api/plans/month:
 *   get:
 *     summary: 월별 계획 조회
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *         description: 년도
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: integer
 *         description: 월 (1-12)
 *     responses:
 *       200:
 *         description: 월별 계획 목록
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlanListResponse'
 *
 * /api/plans/date:
 *   get:
 *     summary: 특정 날짜의 계획 조회
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: 조회할 날짜 (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: 해당 날짜의 계획 목록
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlanListResponse'
 *
 * /api/plans/week:
 *   get:
 *     summary: 주간 계획 조회
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: 주간 시작 날짜 (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: 주간 계획 목록 (7일간)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlanListResponse'
 *
 * /api/plans/range:
 *   get:
 *     summary: 한 달 기간 내 날짜 범위별 계획 조회
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: 시작 날짜 (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: 종료 날짜 (YYYY-MM-DD) - 시작 날짜와 같은 월 내에서만 가능
 *     responses:
 *       200:
 *         description: 날짜 범위별 계획 목록
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlanListResponse'
 *       400:
 *         description: 잘못된 요청 (다른 월의 날짜 범위, 누락된 파라미터 등)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /api/plans/{planId}:
 *   get:
 *     summary: 특정 계획 조회
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
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
 *               $ref: '#/components/schemas/PlanResponse'
 *   patch:
 *     summary: 계획 수정
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
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
 *             $ref: '#/components/schemas/PlanUpdateRequest'
 *     responses:
 *       200:
 *         description: 수정된 계획
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlanResponse'
 *   delete:
 *     summary: 계획 삭제
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 삭제 완료
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlanResponse'
 *
 * /api/plans/{planId}/toggle:
 *   post:
 *     summary: 계획 완료 상태 토글
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 상태 변경 완료
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlanResponse'
 */

// GET /api/plans - 내 모든 계획 조회
router.get('/', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;
		const plans = await plansServices.findByUserId(userId);
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

// POST /api/plans - 새 계획 생성
router.post('/', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;
		const plan = await plansServices.create(userId, req.body);
		res.status(201).json({
			code: 200,
			message: "계획이 성공적으로 생성되었습니다.",
			result: plan
		});
	} catch (error) {
		console.log('error', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message || 'Internal server error',
			result: null
		});
	}
});

// GET /api/plans/today - 오늘의 계획 조회
router.get('/today', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;
		const plans = await plansServices.findToday(userId);
		res.json({
			code: 200,
			message: "오늘의 계획을 성공적으로 조회했습니다.",
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

// GET /api/plans/upcoming - 예정된 계획 조회
router.get('/upcoming', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;
		const days = parseInt(req.query.days) || 7;
		const plans = await plansServices.findUpcoming(userId, days);
		res.json({
			code: 200,
			message: "예정된 계획을 성공적으로 조회했습니다.",
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

// GET /api/plans/month - 월별 계획 조회
router.get('/month', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;
		const { year, month } = req.query;
		
		if (!year || !month) {
			return res.status(400).json({
				code: 400,
				message: "년도와 월 파라미터가 필요합니다.",
				result: null
			});
		}
		
		const plans = await plansServices.findByMonth(userId, year, month);
		res.json({
			code: 200,
			message: "월별 계획을 성공적으로 조회했습니다.",
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

// GET /api/plans/date - 특정 날짜의 계획 조회
router.get('/date', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;
		const { date } = req.query;
		
		if (!date) {
			return res.status(400).json({
				code: 400,
				message: "날짜 파라미터가 필요합니다.",
				result: null
			});
		}
		
		const plans = await plansServices.findByDate(userId, date);
		res.json({
			code: 200,
			message: "해당 날짜의 계획을 성공적으로 조회했습니다.",
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

// GET /api/plans/week - 주간 계획 조회
router.get('/week', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;
		const { startDate } = req.query;
		
		if (!startDate) {
			return res.status(400).json({
				code: 400,
				message: "시작 날짜 파라미터가 필요합니다.",
				result: null
			});
		}
		
		const plans = await plansServices.findByWeek(userId, startDate);
		res.json({
			code: 200,
			message: "주간 계획을 성공적으로 조회했습니다.",
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

// GET /api/plans/range - 한 달 기간 내 날짜 범위별 계획 조회
router.get('/range', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;
		const { startDate, endDate } = req.query;
		
		if (!startDate || !endDate) {
			return res.status(400).json({
				code: 400,
				message: "시작 날짜와 종료 날짜 파라미터가 필요합니다.",
				result: null
			});
		}
		
		const plans = await plansServices.findByDateRangeWithinMonth(userId, startDate, endDate);
		res.json({
			code: 200,
			message: "날짜 범위별 계획을 성공적으로 조회했습니다.",
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

// GET /api/plans/incomplete - 미완료 계획 조회
router.get('/incomplete', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;
		const plans = await plansServices.findIncomplete(userId);
		res.json({
			code: 200,
			message: "미완료 계획을 성공적으로 조회했습니다.",
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

// GET /api/plans/:planId - 특정 계획 조회
router.get('/:planId', authMiddleware, async (req, res) => {
	try {
		const { planId } = req.params;
		const plan = await plansServices.findById(planId);
		
		// 권한 확인 (본인의 계획인지)
		if (plan.userId !== req.user.id) {
			return res.status(403).json({
				code: 400,
				message: "이 계획에 대한 권한이 없습니다.",
				result: null
			});
		}
		
		res.json({
			code: 200,
			message: "계획을 성공적으로 조회했습니다.",
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

// PATCH /api/plans/:planId - 계획 수정
router.patch('/:planId', authMiddleware, async (req, res) => {
	try {
		const { planId } = req.params;
		const userId = req.user.id;
		const plan = await plansServices.update(planId, userId, req.body);
		
		res.json({
			code: 200,
			message: "계획이 성공적으로 수정되었습니다.",
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

// DELETE /api/plans/:planId - 계획 삭제
router.delete('/:planId', authMiddleware, async (req, res) => {
	try {
		const { planId } = req.params;
		const userId = req.user.id;
		const deletedPlan = await plansServices.remove(planId, userId);
		
		res.json({
			code: 200,
			message: "계획이 성공적으로 삭제되었습니다.",
			result: deletedPlan
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

// POST /api/plans/:planId/toggle - 계획 완료 상태 토글
router.post('/:planId/toggle', authMiddleware, async (req, res) => {
	try {
		const { planId } = req.params;
		const userId = req.user.id;
		const plan = await plansServices.toggleComplete(planId, userId);
		
		res.json({
			code: 200,
			message: plan.isCompleted ? "계획을 완료로 표시했습니다." : "계획을 미완료로 표시했습니다.",
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

module.exports = router;