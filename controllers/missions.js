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
 *     summary: 미션 추억 생성 (파일 업로드)
 *     tags: [Mission Memories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               dailyMissionId:
 *                 type: integer
 *                 description: 일일 미션 ID
 *                 example: 1
 *               content:
 *                 type: string
 *                 description: 미션 완료 내용
 *                 example: 푸들이와 함께 한강에서 산책했어요!
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 10
 *                 description: 업로드할 이미지 파일들 (최대 10개)
 *             required: [dailyMissionId, content]
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *
 * /api/missions/memories/{memoryId}/share:
 *   post:
 *     summary: '미션 추억을 커뮤니티 게시물로 공유'
 *     tags: [Mission Memories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: memoryId
 *         in: path
 *         required: true
 *         description: '공유할 미션 추억의 ID'
 *         schema:
 *           type: integer
 *     responses:
 *       '201':
 *         description: '성공적으로 공유 및 생성된 게시물 정보'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ContentWithMediaResponse'
 *       '400':
 *         description: '잘못된 요청 (예: 존재하지 않는 추억 ID)'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: '인증 실패'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '403':
 *         description: '권한 없음 (자신의 추억이 아님)'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /api/missions/memories/{id}/likes:
 *   patch:
 *     summary: 미션 추억 좋아요 토글
 *     tags: [Mission Memories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 좋아요를 토글할 미션 추억의 ID
 *     responses:
 *       '200':
 *         description: '성공적으로 좋아요 상태가 변경된 추억 정보'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MissionMemory'
 *       '401':
 *         description: '인증 실패'
 *       '403':
 *         description: '권한 없음'
 *       '404':
 *         description: '존재하지 않는 미션 추억'
 *
 * /api/missions/memories/{id}/images:
 *   get:
 *     summary: 미션 추억의 모든 이미지 조회
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
 *         description: 미션 이미지 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MissionImage'
 *
 * /api/missions/memories/{id}/images/upload:
 *   post:
 *     summary: 미션 추억에 이미지 업로드 (파일 방식)
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: 업로드할 이미지 파일
 *             required: [image]
 *     responses:
 *       201:
 *         description: 미션 이미지 업로드 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MissionImage'
 *
 * /api/missions/memories/{id}/images/upload-multiple:
 *   post:
 *     summary: 미션 추억에 여러 이미지 업로드
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 10
 *                 description: 업로드할 이미지 파일들 (최대 10개)
 *             required: [images]
 *     responses:
 *       201:
 *         description: 미션 이미지들 업로드 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MissionImage'
 *
 * /api/missions/images/{id}:
 *   delete:
 *     summary: 미션 이미지 삭제
 *     tags: [Mission Memories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 미션 이미지 ID
 *     responses:
 *       200:
 *         description: 미션 이미지 삭제 성공
 */

// ==================== 미션 템플릿 라우터 ====================

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

router.post('/memories/:memoryId/share', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { memoryId } = req.params;

    try {
        const result = await missionMemoryService.shareMemoryToCommunity(userId, parseInt(memoryId));
        
        if (result.success) {
            return res.status(201).json({ 
                code: 201, 
                message: '미션 추억을 성공적으로 공유했습니다.', 
                result: result.data 
            });
        }
        
        return res.status(400).json({ code: 400, message: result.error, result: null });
    } catch (error) {
        console.error('Share memory to community controller error:', error);
        res.status(500).json({ code: 500, message: '서버 오류로 인해 공유에 실패했습니다.', result: null });
    }
});

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

router.patch('/memories/:id/likes', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;

		const result = await missionMemoryService.toggleMissionMemoryLike(parseInt(id), userId);

		if (!result.success) {
			const statusCode = result.error.includes('찾을 수 없습니다') ? 404 : (result.error.includes('권한') ? 403 : 400);
			return res.status(statusCode).json({
				code: statusCode,
				message: result.error,
				result: null
			});
		}

		res.json({
			code: 200,
			message: "미션 추억의 좋아요 상태가 변경되었습니다.",
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