const express = require('express');
const router = express.Router();
const { 
  missionTemplateService, 
  dailyMissionService, 
  missionMemoryService,
  missionImageService 
} = require('../services/missionServices');
const { authMiddleware } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

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

// POST /api/missions/memories - 미션 추억 생성 (파일 업로드)
router.post('/memories', authMiddleware, upload.array('images', 10), async (req, res) => {
	try {
		const userId = req.user.id;
		const { dailyMissionId, content } = req.body;
		const imageFiles = req.files;

		// 기본 유효성 검사
		if (!dailyMissionId || !content) {
			return res.status(400).json({
				code: 400,
				message: '필수 필드가 누락되었습니다. (dailyMissionId, content)',
				result: null
			});
		}

		// 미션 추억 생성 (파일 업로드 방식)
		const result = await missionMemoryService.createMissionMemory(userId, {
			dailyMissionId: parseInt(dailyMissionId),
			content
		}, imageFiles || []);

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
		const { content } = req.body;

		const result = await missionMemoryService.updateMissionMemory(parseInt(id), userId, {
			content
		});

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

// ==================== 미션 이미지 라우터 ====================

// GET /api/missions/memories/:id/images - 미션 추억의 모든 이미지 조회
router.get('/memories/:id/images', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;

		const result = await missionImageService.getMissionImages(parseInt(id), userId);

		if (!result.success) {
			return res.status(400).json({
				code: 400,
				message: result.error,
				result: null
			});
		}

		res.json({
			code: 200,
			message: "미션 이미지를 성공적으로 조회했습니다.",
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



// POST /api/missions/memories/:id/images/upload - 미션 추억에 이미지 업로드 (파일 방식)
router.post('/memories/:id/images/upload', authMiddleware, upload.single('image'), async (req, res) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;
		const file = req.file;

		const result = await missionImageService.uploadMissionImage(parseInt(id), userId, file);

		if (!result.success) {
			return res.status(400).json({
				code: 400,
				message: result.error,
				result: null
			});
		}

		res.status(201).json({
			code: 200,
			message: "미션 이미지가 성공적으로 업로드되었습니다.",
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

// POST /api/missions/memories/:id/images/upload-multiple - 미션 추억에 여러 이미지 업로드
router.post('/memories/:id/images/upload-multiple', authMiddleware, upload.array('images', 10), async (req, res) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;
		const files = req.files;

		const result = await missionImageService.uploadMultipleMissionImages(parseInt(id), userId, files);

		if (!result.success) {
			return res.status(400).json({
				code: 400,
				message: result.error,
				result: null
			});
		}

		res.status(201).json({
			code: 200,
			message: "미션 이미지들이 성공적으로 업로드되었습니다.",
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

// DELETE /api/missions/images/:id - 미션 이미지 삭제
router.delete('/images/:id', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;

		const result = await missionImageService.deleteMissionImage(parseInt(id), userId);

		if (!result.success) {
			return res.status(400).json({
				code: 400,
				message: result.error,
				result: null
			});
		}

		res.json({
			code: 200,
			message: "미션 이미지가 성공적으로 삭제되었습니다.",
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