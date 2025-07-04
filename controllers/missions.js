const express = require('express');
const router = express.Router();
const { 
  missionTemplateService, 
  dailyMissionService, 
  missionMemoryService 
} = require('../services/missionServices');
const { authMiddleware } = require('../middlewares/auth');

/**
 * @openapi
 * /api/missions/templates:
 *   get:
 *     summary: 모든 활성화된 미션 템플릿 조회
 *     tags: [Mission Templates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 미션 템플릿 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MissionTemplate'
 *   post:
 *     summary: 미션 템플릿 생성 (관리자용)
 *     tags: [Mission Templates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMissionTemplateRequest'
 *     responses:
 *       201:
 *         description: 미션 템플릿 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MissionTemplate'
 *
 * /api/missions/templates/{id}:
 *   put:
 *     summary: 미션 템플릿 업데이트 (관리자용)
 *     tags: [Mission Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 미션 템플릿 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMissionTemplateRequest'
 *     responses:
 *       200:
 *         description: 미션 템플릿 업데이트 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MissionTemplate'
 *   delete:
 *     summary: 미션 템플릿 비활성화 (관리자용)
 *     tags: [Mission Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 미션 템플릿 ID
 *     responses:
 *       200:
 *         description: 미션 템플릿 비활성화 성공
 *
 * /api/missions/daily/today:
 *   get:
 *     summary: 오늘의 일일 미션 조회
 *     tags: [Daily Missions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 오늘 미션 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DailyMission'
 *
 * /api/missions/daily:
 *   get:
 *     summary: 특정 날짜의 일일 미션 조회
 *     tags: [Daily Missions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: 조회할 날짜 (YYYY-MM-DD 형식)
 *     responses:
 *       200:
 *         description: 날짜별 미션 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DailyMission'
 *
 * /api/missions/daily/history:
 *   get:
 *     summary: 미션 기록 조회 (기간별)
 *     tags: [Daily Missions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: 시작일 (YYYY-MM-DD 형식)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: 종료일 (YYYY-MM-DD 형식)
 *     responses:
 *       200:
 *         description: 미션 기록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DailyMission'
 *
 * /api/missions/daily/{id}/toggle:
 *   patch:
 *     summary: 일일 미션 완료/미완료 토글
 *     tags: [Daily Missions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 일일 미션 ID
 *     responses:
 *       200:
 *         description: 미션 완료 상태 변경 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DailyMission'
 *
 * /api/missions/memories:
 *   get:
 *     summary: 사용자의 모든 미션 추억 조회
 *     tags: [Mission Memories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 미션 추억 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MissionMemory'
 *   post:
 *     summary: 미션 추억 생성
 *     tags: [Mission Memories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMissionMemoryRequest'
 *     responses:
 *       201:
 *         description: 미션 추억 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MissionMemory'
 *
 * /api/missions/memories/{id}:
 *   put:
 *     summary: 미션 추억 업데이트
 *     tags: [Mission Memories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 미션 추억 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateMissionMemoryRequest'
 *     responses:
 *       200:
 *         description: 미션 추억 업데이트 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MissionMemory'
 *   delete:
 *     summary: 미션 추억 삭제
 *     tags: [Mission Memories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 미션 추억 ID
 *     responses:
 *       200:
 *         description: 미션 추억 삭제 성공
 */

// ==================== 미션 템플릿 라우터 ====================

// GET /api/missions/templates - 모든 활성화된 미션 템플릿 조회
router.get('/templates', authMiddleware, async (req, res) => {
	try {
		const result = await missionTemplateService.getAllActiveTemplates();
		
		if (!result.success) {
			return res.status(400).json({
				code: 400,
				message: result.error,
				result: null
			});
		}

		res.json({
			code: 200,
			message: "미션 템플릿을 성공적으로 조회했습니다.",
			result: result.data
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

// POST /api/missions/templates - 미션 템플릿 생성 (관리자용)
router.post('/templates', authMiddleware, async (req, res) => {
	try {
		const { category, title, description, order } = req.body;
		
		const result = await missionTemplateService.createTemplate({
			category,
			title,
			description,
			order
		});

		if (!result.success) {
			return res.status(400).json({
				code: 400,
				message: result.error,
				result: null
			});
		}

		res.status(201).json({
			code: 200,
			message: "미션 템플릿이 성공적으로 생성되었습니다.",
			result: result.data
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

// PUT /api/missions/templates/:id - 미션 템플릿 업데이트 (관리자용)
router.put('/templates/:id', authMiddleware, async (req, res) => {
	try {
		const { id } = req.params;
		const templateData = req.body;

		const result = await missionTemplateService.updateTemplate(parseInt(id), templateData);

		if (!result.success) {
			return res.status(400).json({
				code: 400,
				message: result.error,
				result: null
			});
		}

		res.json({
			code: 200,
			message: "미션 템플릿이 성공적으로 업데이트되었습니다.",
			result: result.data
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

// DELETE /api/missions/templates/:id - 미션 템플릿 비활성화 (관리자용)
router.delete('/templates/:id', authMiddleware, async (req, res) => {
	try {
		const { id } = req.params;

		const result = await missionTemplateService.deactivateTemplate(parseInt(id));

		if (!result.success) {
			return res.status(400).json({
				code: 400,
				message: result.error,
				result: null
			});
		}

		res.json({
			code: 200,
			message: "미션 템플릿이 성공적으로 비활성화되었습니다.",
			result: result.data
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

// ==================== 일일 미션 라우터 ====================

// GET /api/missions/daily/today - 사용자의 오늘 일일 미션 조회
router.get('/daily/today', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;
		
		const result = await dailyMissionService.getTodayMissions(userId);

		if (!result.success) {
			return res.status(400).json({
				code: 400,
				message: result.error,
				result: null
			});
		}

		res.json({
			code: 200,
			message: "오늘의 미션을 성공적으로 조회했습니다.",
			result: result.data
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

// GET /api/missions/daily - 특정 날짜의 일일 미션 조회
router.get('/daily', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;
		const { date } = req.query;

		if (!date) {
			return res.status(400).json({
				code: 400,
				message: "날짜를 입력해주세요.",
				result: null
			});
		}

		const result = await dailyMissionService.getMissionsByDate(userId, date);

		if (!result.success) {
			return res.status(400).json({
				code: 400,
				message: result.error,
				result: null
			});
		}

		res.json({
			code: 200,
			message: "날짜별 미션을 성공적으로 조회했습니다.",
			result: result.data
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

// GET /api/missions/daily/history - 미션 기록 조회 (기간별)
router.get('/daily/history', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;
		const { startDate, endDate } = req.query;

		if (!startDate || !endDate) {
			return res.status(400).json({
				code: 400,
				message: "시작일과 종료일을 입력해주세요.",
				result: null
			});
		}

		const result = await dailyMissionService.getMissionHistory(userId, startDate, endDate);

		if (!result.success) {
			return res.status(400).json({
				code: 400,
				message: result.error,
				result: null
			});
		}

		res.json({
			code: 200,
			message: "미션 기록을 성공적으로 조회했습니다.",
			result: result.data
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

// PATCH /api/missions/daily/:id/toggle - 일일 미션 완료/미완료 토글
router.patch('/daily/:id/toggle', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;

		const result = await dailyMissionService.toggleMissionCompletion(parseInt(id), userId);

		if (!result.success) {
			return res.status(400).json({
				code: 400,
				message: result.error,
				result: null
			});
		}

		res.json({
			code: 200,
			message: result.data.isCompleted ? "미션이 완료되었습니다." : "미션이 미완료로 변경되었습니다.",
			result: result.data
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

// ==================== 미션 추억 라우터 ====================

// GET /api/missions/memories - 사용자의 모든 미션 추억 조회
router.get('/memories', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;
		
		const result = await missionMemoryService.getUserMissionMemories(userId);

		if (!result.success) {
			return res.status(400).json({
				code: 400,
				message: result.error,
				result: null
			});
		}

		res.json({
			code: 200,
			message: "미션 추억을 성공적으로 조회했습니다.",
			result: result.data
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

// POST /api/missions/memories - 미션 추억 생성
router.post('/memories', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;
		const { dailyMissionId, content, imageUrl } = req.body;

		const result = await missionMemoryService.createMissionMemory(userId, {
			dailyMissionId,
			content,
			imageUrl
		});

		if (!result.success) {
			return res.status(400).json({
				code: 400,
				message: result.error,
				result: null
			});
		}

		res.status(201).json({
			code: 200,
			message: "미션 추억이 성공적으로 생성되었습니다.",
			result: result.data
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

// PUT /api/missions/memories/:id - 미션 추억 업데이트
router.put('/memories/:id', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;
		const memoryData = req.body;

		const result = await missionMemoryService.updateMissionMemory(parseInt(id), userId, memoryData);

		if (!result.success) {
			return res.status(400).json({
				code: 400,
				message: result.error,
				result: null
			});
		}

		res.json({
			code: 200,
			message: "미션 추억이 성공적으로 업데이트되었습니다.",
			result: result.data
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

// DELETE /api/missions/memories/:id - 미션 추억 삭제
router.delete('/memories/:id', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;

		const result = await missionMemoryService.deleteMissionMemory(parseInt(id), userId);

		if (!result.success) {
			return res.status(400).json({
				code: 400,
				message: result.error,
				result: null
			});
		}

		res.json({
			code: 200,
			message: "미션 추억이 성공적으로 삭제되었습니다.",
			result: null
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