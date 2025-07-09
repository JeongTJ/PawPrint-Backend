const notificationsRepository = require('../repository/notificationsRepository');
const { logger } = require('../config/logger');

// 알림 생성
const createNotification = async (userId, type, title, body, data = null) => {
	try {
		if (!userId || isNaN(userId)) {
			const error = new Error('유효하지 않은 사용자 ID입니다.');
			error.statusCode = 400;
			throw error;
		}

		if (!type || !title || !body) {
			const error = new Error('알림 타입, 제목, 내용은 필수입니다.');
			error.statusCode = 400;
			throw error;
		}

		const notificationData = {
			userId: parseInt(userId),
			type: type.trim(),
			title: title.trim(),
			body: body.trim(),
			data: data || {}
		};

		const notification = await notificationsRepository.create(notificationData);
		logger.info(`알림 생성 성공: 사용자 ${userId}, 타입 ${type}`);
		
		return notification;
	} catch (error) {
		if (error.statusCode) throw error;
		logger.error('알림 생성 중 오류:', error);
		throw new Error('알림 생성에 실패했습니다.');
	}
};

// 사용자의 알림 목록 조회
const getNotifications = async (userId, page = 1, limit = 20, type = null) => {
	try {
		if (!userId || isNaN(userId)) {
			const error = new Error('유효하지 않은 사용자 ID입니다.');
			error.statusCode = 400;
			throw error;
		}

		const pageNum = parseInt(page) || 1;
		const limitNum = parseInt(limit) || 20;

		// 최대 100개로 제한
		if (limitNum > 100) {
			const error = new Error('한 번에 최대 100개까지만 조회할 수 있습니다.');
			error.statusCode = 400;
			throw error;
		}

		// 알림 목록 조회
		const notifications = await notificationsRepository.findByUserId(
			parseInt(userId), 
			pageNum, 
			limitNum, 
			type
		);

		// 총 개수 조회
		const totalCount = await notificationsRepository.countByUserId(
			parseInt(userId), 
			type
		);

		const totalPages = Math.ceil(totalCount / limitNum);

		return {
			notifications,
			pagination: {
				page: pageNum,
				limit: limitNum,
				totalCount,
				totalPages,
				hasNext: pageNum < totalPages,
				hasPrev: pageNum > 1
			}
		};
	} catch (error) {
		if (error.statusCode) throw error;
		logger.error('알림 목록 조회 중 오류:', error);
		throw new Error('알림 목록 조회에 실패했습니다.');
	}
};

// 읽지 않은 알림 개수 조회
const getUnreadCount = async (userId) => {
	try {
		if (!userId || isNaN(userId)) {
			const error = new Error('유효하지 않은 사용자 ID입니다.');
			error.statusCode = 400;
			throw error;
		}

		const count = await notificationsRepository.countUnreadByUserId(parseInt(userId));
		return { count };
	} catch (error) {
		if (error.statusCode) throw error;
		logger.error('읽지 않은 알림 개수 조회 중 오류:', error);
		throw new Error('읽지 않은 알림 개수 조회에 실패했습니다.');
	}
};

// 특정 알림 읽음 처리
const markAsRead = async (notificationId, userId) => {
	try {
		if (!notificationId || isNaN(notificationId)) {
			const error = new Error('유효하지 않은 알림 ID입니다.');
			error.statusCode = 400;
			throw error;
		}

		if (!userId || isNaN(userId)) {
			const error = new Error('유효하지 않은 사용자 ID입니다.');
			error.statusCode = 400;
			throw error;
		}

		// 알림 존재 확인
		const notification = await notificationsRepository.findById(
			parseInt(notificationId), 
			parseInt(userId)
		);

		if (!notification) {
			const error = new Error('알림을 찾을 수 없거나 접근 권한이 없습니다.');
			error.statusCode = 404;
			throw error;
		}

		if (notification.isRead) {
			return { message: '이미 읽은 알림입니다.' };
		}

		await notificationsRepository.markAsRead(
			parseInt(notificationId), 
			parseInt(userId)
		);

		logger.info(`알림 읽음 처리: 알림 ${notificationId}, 사용자 ${userId}`);
		return { message: '알림을 읽음 처리했습니다.' };
	} catch (error) {
		if (error.statusCode) throw error;
		logger.error('알림 읽음 처리 중 오류:', error);
		throw new Error('알림 읽음 처리에 실패했습니다.');
	}
};

// 모든 알림 읽음 처리
const markAllAsRead = async (userId) => {
	try {
		if (!userId || isNaN(userId)) {
			const error = new Error('유효하지 않은 사용자 ID입니다.');
			error.statusCode = 400;
			throw error;
		}

		const result = await notificationsRepository.markAllAsRead(parseInt(userId));
		
		logger.info(`모든 알림 읽음 처리: 사용자 ${userId}, 처리된 알림 ${result.count}개`);
		return { 
			message: '모든 알림을 읽음 처리했습니다.',
			updatedCount: result.count
		};
	} catch (error) {
		if (error.statusCode) throw error;
		logger.error('모든 알림 읽음 처리 중 오류:', error);
		throw new Error('모든 알림 읽음 처리에 실패했습니다.');
	}
};

// 알림 삭제
const deleteNotification = async (notificationId, userId) => {
	try {
		if (!notificationId || isNaN(notificationId)) {
			const error = new Error('유효하지 않은 알림 ID입니다.');
			error.statusCode = 400;
			throw error;
		}

		if (!userId || isNaN(userId)) {
			const error = new Error('유효하지 않은 사용자 ID입니다.');
			error.statusCode = 400;
			throw error;
		}

		// 알림 존재 확인
		const notification = await notificationsRepository.findById(
			parseInt(notificationId), 
			parseInt(userId)
		);

		if (!notification) {
			const error = new Error('알림을 찾을 수 없거나 접근 권한이 없습니다.');
			error.statusCode = 404;
			throw error;
		}

		await notificationsRepository.deleteById(
			parseInt(notificationId), 
			parseInt(userId)
		);

		logger.info(`알림 삭제: 알림 ${notificationId}, 사용자 ${userId}`);
		return { message: '알림이 삭제되었습니다.' };
	} catch (error) {
		if (error.statusCode) throw error;
		logger.error('알림 삭제 중 오류:', error);
		throw new Error('알림 삭제에 실패했습니다.');
	}
};

// 알림 통계 조회
const getNotificationStats = async (userId) => {
	try {
		if (!userId || isNaN(userId)) {
			const error = new Error('유효하지 않은 사용자 ID입니다.');
			error.statusCode = 400;
			throw error;
		}

		const stats = await notificationsRepository.getStatsByUserId(parseInt(userId));
		return stats;
	} catch (error) {
		if (error.statusCode) throw error;
		logger.error('알림 통계 조회 중 오류:', error);
		throw new Error('알림 통계 조회에 실패했습니다.');
	}
};

// 댓글 알림 생성
const createCommentNotification = async (contentOwnerId, commentUserId, contentId, commentId, commentBody) => {
	try {
		// 자기 자신에게는 알림 보내지 않음
		if (contentOwnerId === commentUserId) {
			return null;
		}

		// 댓글 작성자 정보 조회 (간단히 처리)
		const title = '새 댓글이 있습니다';
		const body = `회원님의 게시물에 새 댓글이 달렸습니다: ${commentBody.length > 20 ? commentBody.substring(0, 20) + '...' : commentBody}`;
		const data = {
			type: 'comment',
			contentId: parseInt(contentId),
			commentId: parseInt(commentId),
			commentUserId: parseInt(commentUserId)
		};

		const notification = await createNotification(
			contentOwnerId, 
			'comment', 
			title, 
			body, 
			data
		);

		return notification;
	} catch (error) {
		logger.error('댓글 알림 생성 중 오류:', error);
		// 알림 생성 실패해도 댓글 작성 자체는 실패하지 않도록
		return null;
	}
};

// 계획 리마인더 알림 생성
const createPlanReminderNotification = async (userId, planTitle, planId, planDate) => {
	try {
		const title = '오늘의 계획이 있습니다';
		const body = `${planTitle} - 오늘 예정된 계획입니다!`;
		const data = {
			type: 'plan_reminder',
			planId: parseInt(planId),
			planDate: planDate
		};

		const notification = await createNotification(
			userId, 
			'plan_reminder', 
			title, 
			body, 
			data
		);

		return notification;
	} catch (error) {
		logger.error('계획 리마인더 알림 생성 중 오류:', error);
		throw error;
	}
};

// 미션 완료 알림 생성
const createMissionCompleteNotification = async (userId, missionTitle, missionId) => {
	try {
		const title = '미션 완료!';
		const body = `${missionTitle} 미션을 완료했습니다. 축하합니다!`;
		const data = {
			type: 'mission_complete',
			missionId: parseInt(missionId)
		};

		const notification = await createNotification(
			userId, 
			'mission_complete', 
			title, 
			body, 
			data
		);

		return notification;
	} catch (error) {
		logger.error('미션 완료 알림 생성 중 오류:', error);
		throw error;
	}
};

module.exports = {
	createNotification,
	getNotifications,
	getUnreadCount,
	markAsRead,
	markAllAsRead,
	deleteNotification,
	getNotificationStats,
	createCommentNotification,
	createPlanReminderNotification,
	createMissionCompleteNotification
}; 