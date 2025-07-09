const express = require('express');
const router = express.Router();
const notificationsServices = require('../services/notificationsServices');
const { authMiddleware } = require('../middlewares/auth');
const { logger } = require('../config/logger');
const { 
	checkAndSendReminders,
	checkAndSendRemindersForUser,
	getSchedulerStatus 
} = require('../services/planScheduler');

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     summary: 알림 목록 조회
 *     tags: [notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 페이지당 개수
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *           enum: [comment, plan_reminder, mission_complete, all]
 *         description: 알림 타입 필터
 *     responses:
 *       200:
 *         description: 알림 목록
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationListResponse'
 * 
 * /api/notifications/unread-count:
 *   get:
 *     summary: 읽지 않은 알림 개수 조회
 *     tags: [notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 읽지 않은 알림 개수
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnreadCountResponse'
 * 
 * /api/notifications/read-all:
 *   patch:
 *     summary: 모든 알림 읽음 처리
 *     tags: [notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 모든 알림 읽음 처리 완료
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationActionResponse'
 * 
 * /api/notifications/stats:
 *   get:
 *     summary: 알림 통계 조회
 *     tags: [notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 알림 통계
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationStatsResponse'
 * 
 * /api/notifications/test:
 *   post:
 *     summary: 테스트 알림 생성
 *     tags: [notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TestNotificationRequest'
 *     responses:
 *       201:
 *         description: 테스트 알림 생성 완료
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TestNotificationResponse'
 * 
 * /api/notifications/scheduler/status:
 *   get:
 *     summary: 스케줄러 상태 조회
 *     tags: [notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 스케줄러 상태 정보
 * 
 * /api/notifications/scheduler/run:
 *   post:
 *     summary: 수동 계획 알림 실행 (모든 사용자)
 *     tags: [notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 수동 실행 완료
 * 
 * /api/notifications/scheduler/run/user:
 *   post:
 *     summary: 수동 계획 알림 실행 (특정 사용자)
 *     tags: [notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 사용자 수동 실행 완료
 * 
 * /api/notifications/{notificationId}:
 *   patch:
 *     summary: 특정 알림 읽음 처리
 *     tags: [notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 알림 읽음 처리 완료
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationActionResponse'
 *   delete:
 *     summary: 알림 삭제
 *     tags: [notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 알림 삭제 완료
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationActionResponse'
 */

// 알림 목록 조회
router.get('/', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;
		const { page = 1, limit = 20, type = null } = req.query;

		const result = await notificationsServices.getNotifications(
			userId,
			page,
			limit,
			type
		);

		res.status(200).json({
			code: 200,
			message: '알림 목록을 성공적으로 조회했습니다.',
			result: result
		});
	} catch (error) {
		logger.error('알림 목록 조회 오류:', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message || '알림 목록 조회에 실패했습니다.',
			result: null
		});
	}
});

// 읽지 않은 알림 개수 조회
router.get('/unread-count', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;

		const result = await notificationsServices.getUnreadCount(userId);

		res.status(200).json({
			code: 200,
			message: '읽지 않은 알림 개수를 성공적으로 조회했습니다.',
			result: result
		});
	} catch (error) {
		logger.error('읽지 않은 알림 개수 조회 오류:', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message || '읽지 않은 알림 개수 조회에 실패했습니다.',
			result: null
		});
	}
});

// 모든 알림 읽음 처리
router.patch('/read-all', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;

		const result = await notificationsServices.markAllAsRead(userId);

		res.status(200).json({
			code: 200,
			message: '모든 알림을 읽음 처리했습니다.',
			result: result
		});
	} catch (error) {
		logger.error('모든 알림 읽음 처리 오류:', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message || '모든 알림 읽음 처리에 실패했습니다.',
			result: null
		});
	}
});

// 알림 통계 조회
router.get('/stats', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;

		const stats = await notificationsServices.getNotificationStats(userId);

		res.status(200).json({
			code: 200,
			message: '알림 통계를 성공적으로 조회했습니다.',
			result: stats
		});
	} catch (error) {
		logger.error('알림 통계 조회 오류:', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message || '알림 통계 조회에 실패했습니다.',
			result: null
		});
	}
});

// 테스트 알림 생성
router.post('/test', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;
		const { type, title, body, data } = req.body;

		const notification = await notificationsServices.createNotification(
			userId,
			type,
			title,
			body,
			data
		);

		res.status(201).json({
			code: 200,
			message: '테스트 알림이 생성되었습니다.',
			result: notification
		});
	} catch (error) {
		logger.error('테스트 알림 생성 오류:', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message || '테스트 알림 생성에 실패했습니다.',
			result: null
		});
	}
});

// 특정 알림 읽음 처리
router.patch('/:notificationId', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;
		const { notificationId } = req.params;

		const result = await notificationsServices.markAsRead(notificationId, userId);

		res.status(200).json({
			code: 200,
			message: '알림을 읽음 처리했습니다.',
			result: result
		});
	} catch (error) {
		logger.error('알림 읽음 처리 오류:', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message || '알림 읽음 처리에 실패했습니다.',
			result: null
		});
	}
});

// 알림 삭제
router.delete('/:notificationId', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;
		const { notificationId } = req.params;

		const result = await notificationsServices.deleteNotification(notificationId, userId);

		res.status(200).json({
			code: 200,
			message: '알림이 삭제되었습니다.',
			result: result
		});
	} catch (error) {
		logger.error('알림 삭제 오류:', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message || '알림 삭제에 실패했습니다.',
			result: null
		});
	}
});

// 스케줄러 상태 조회
router.get('/scheduler/status', authMiddleware, async (req, res) => {
	try {
		const status = getSchedulerStatus();

		res.status(200).json({
			code: 200,
			message: '스케줄러 상태를 성공적으로 조회했습니다.',
			result: status
		});
	} catch (error) {
		logger.error('스케줄러 상태 조회 오류:', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message || '스케줄러 상태 조회에 실패했습니다.',
			result: null
		});
	}
});

// 수동 계획 알림 실행 (모든 사용자)
router.post('/scheduler/run', authMiddleware, async (req, res) => {
	try {
		const result = await checkAndSendReminders();

		res.status(200).json({
			code: 200,
			message: '수동 계획 알림을 성공적으로 실행했습니다.',
			result: result
		});
	} catch (error) {
		logger.error('수동 계획 알림 실행 오류:', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message || '수동 계획 알림 실행에 실패했습니다.',
			result: null
		});
	}
});

// 수동 계획 알림 실행 (특정 사용자)
router.post('/scheduler/run/user', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id; // 현재 로그인한 사용자의 ID 사용
		const result = await checkAndSendRemindersForUser(userId);

		res.status(200).json({
			code: 200,
			message: '사용자 수동 계획 알림을 성공적으로 실행했습니다.',
			result: result
		});
	} catch (error) {
		logger.error('사용자 수동 계획 알림 실행 오류:', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message || '사용자 수동 계획 알림 실행에 실패했습니다.',
			result: null
		});
	}
});

module.exports = router; 