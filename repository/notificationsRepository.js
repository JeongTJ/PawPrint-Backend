const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 알림 생성
const create = async (notificationData) => {
	try {
		return await prisma.notification.create({
			data: notificationData,
			include: {
				user: {
					select: {
						id: true,
						nickname: true
					}
				}
			}
		});
	} catch (error) {
		console.error('알림 생성 중 오류:', error);
		throw error;
	}
};

// 사용자의 알림 목록 조회 (페이지네이션)
const findByUserId = async (userId, page = 1, limit = 20, type = null) => {
	try {
		const offset = (page - 1) * limit;
		
		const where = {
			userId: userId
		};
		
		// 타입 필터링
		if (type && type !== 'all') {
			where.type = type;
		}
		
		return await prisma.notification.findMany({
			where,
			orderBy: {
				createdAt: 'desc'
			},
			skip: offset,
			take: limit,
			include: {
				user: {
					select: {
						id: true,
						nickname: true
					}
				}
			}
		});
	} catch (error) {
		console.error('알림 목록 조회 중 오류:', error);
		throw error;
	}
};

// 사용자의 알림 총 개수 조회
const countByUserId = async (userId, type = null) => {
	try {
		const where = {
			userId: userId
		};
		
		// 타입 필터링
		if (type && type !== 'all') {
			where.type = type;
		}
		
		return await prisma.notification.count({
			where
		});
	} catch (error) {
		console.error('알림 개수 조회 중 오류:', error);
		throw error;
	}
};

// 읽지 않은 알림 개수 조회
const countUnreadByUserId = async (userId) => {
	try {
		return await prisma.notification.count({
			where: {
				userId: userId,
				isRead: false
			}
		});
	} catch (error) {
		console.error('읽지 않은 알림 개수 조회 중 오류:', error);
		throw error;
	}
};

// 특정 알림 읽음 처리
const markAsRead = async (notificationId, userId) => {
	try {
		return await prisma.notification.updateMany({
			where: {
				id: notificationId,
				userId: userId
			},
			data: {
				isRead: true,
				updatedAt: new Date()
			}
		});
	} catch (error) {
		console.error('알림 읽음 처리 중 오류:', error);
		throw error;
	}
};

// 모든 알림 읽음 처리
const markAllAsRead = async (userId) => {
	try {
		return await prisma.notification.updateMany({
			where: {
				userId: userId,
				isRead: false
			},
			data: {
				isRead: true,
				updatedAt: new Date()
			}
		});
	} catch (error) {
		console.error('모든 알림 읽음 처리 중 오류:', error);
		throw error;
	}
};

// 알림 삭제
const deleteById = async (notificationId, userId) => {
	try {
		return await prisma.notification.deleteMany({
			where: {
				id: notificationId,
				userId: userId
			}
		});
	} catch (error) {
		console.error('알림 삭제 중 오류:', error);
		throw error;
	}
};

// 특정 알림 조회
const findById = async (notificationId, userId) => {
	try {
		return await prisma.notification.findFirst({
			where: {
				id: notificationId,
				userId: userId
			},
			include: {
				user: {
					select: {
						id: true,
						nickname: true
					}
				}
			}
		});
	} catch (error) {
		console.error('알림 조회 중 오류:', error);
		throw error;
	}
};

// 오래된 알림 정리 (30일 이전)
const deleteOldNotifications = async (daysToKeep = 30) => {
	try {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
		
		return await prisma.notification.deleteMany({
			where: {
				createdAt: {
					lt: cutoffDate
				}
			}
		});
	} catch (error) {
		console.error('오래된 알림 정리 중 오류:', error);
		throw error;
	}
};

// 알림 타입별 통계
const getStatsByUserId = async (userId) => {
	try {
		// 전체 알림 수
		const total = await prisma.notification.count({
			where: { userId }
		});
		
		// 읽지 않은 알림 수
		const unread = await prisma.notification.count({
			where: { userId, isRead: false }
		});
		
		// 타입별 알림 수
		const typeStats = await prisma.notification.groupBy({
			by: ['type'],
			where: { userId },
			_count: {
				type: true
			}
		});
		
		// 타입별 객체로 변환
		const byType = {};
		typeStats.forEach(stat => {
			byType[stat.type] = stat._count.type;
		});
		
		return {
			total,
			unread,
			read: total - unread,
			byType
		};
	} catch (error) {
		console.error('알림 통계 조회 중 오류:', error);
		throw error;
	}
};

module.exports = {
	create,
	findByUserId,
	countByUserId,
	countUnreadByUserId,
	markAsRead,
	markAllAsRead,
	deleteById,
	findById,
	deleteOldNotifications,
	getStatsByUserId
}; 