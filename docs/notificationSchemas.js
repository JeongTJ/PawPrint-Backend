// 알림 데이터 스키마
const NotificationData = {
	type: 'object',
	properties: {
		id: { type: 'integer', example: 1 },
		userId: { type: 'integer', example: 2 },
		type: { 
			type: 'string', 
			enum: ['comment', 'plan_reminder', 'mission_complete'],
			example: 'comment' 
		},
		title: { type: 'string', example: '새 댓글이 있습니다' },
		body: { type: 'string', example: '회원님의 게시물에 새 댓글이 달렸습니다: 사장님이 맛있고 음식이 친절해요' },
		data: { 
			type: 'object',
			properties: {
				type: { type: 'string', example: 'comment' },
				contentId: { type: 'integer', example: 4 },
				commentId: { type: 'integer', example: 3 },
				commentUserId: { type: 'integer', example: 4 }
			}
		},
		isRead: { type: 'boolean', example: false },
		createdAt: { type: 'string', format: 'date-time', example: '2025-07-09T04:35:54.145Z' },
		updatedAt: { type: 'string', format: 'date-time', example: '2025-07-09T04:35:54.145Z' },
		user: {
			type: 'object',
			properties: {
				id: { type: 'integer', example: 2 },
				nickname: { type: 'string', example: '타정' }
			}
		}
	}
};

// 페이지네이션 스키마
const PaginationData = {
	type: 'object',
	properties: {
		page: { type: 'integer', example: 1 },
		limit: { type: 'integer', example: 20 },
		totalCount: { type: 'integer', example: 1 },
		totalPages: { type: 'integer', example: 1 },
		hasNext: { type: 'boolean', example: false },
		hasPrev: { type: 'boolean', example: false }
	}
};

// 알림 목록 데이터 스키마
const NotificationListData = {
	type: 'object',
	properties: {
		notifications: {
			type: 'array',
			items: NotificationData
		},
		pagination: PaginationData
	}
};

// 알림 목록 응답 스키마 (BaseResponse로 래핑)
const NotificationListResponse = {
	allOf: [
		{ $ref: '#/components/schemas/BaseResponse' },
		{
			type: 'object',
			properties: {
				result: NotificationListData
			}
		}
	]
};

// 읽지 않은 알림 개수 데이터 스키마
const UnreadCountData = {
	type: 'object',
	properties: {
		count: { type: 'integer', example: 3 }
	}
};

// 읽지 않은 알림 개수 응답 스키마 (BaseResponse로 래핑)
const UnreadCountResponse = {
	allOf: [
		{ $ref: '#/components/schemas/BaseResponse' },
		{
			type: 'object',
			properties: {
				result: UnreadCountData
			}
		}
	]
};

// 알림 통계 데이터 스키마
const NotificationStatsData = {
	type: 'object',
	properties: {
		total: { type: 'integer', example: 10 },
		unread: { type: 'integer', example: 3 },
		read: { type: 'integer', example: 7 },
		byType: {
			type: 'object',
			properties: {
				comment: { type: 'integer', example: 5 },
				plan_reminder: { type: 'integer', example: 3 },
				mission_complete: { type: 'integer', example: 2 }
			}
		}
	}
};

// 알림 통계 응답 스키마 (BaseResponse로 래핑)
const NotificationStatsResponse = {
	allOf: [
		{ $ref: '#/components/schemas/BaseResponse' },
		{
			type: 'object',
			properties: {
				result: NotificationStatsData
			}
		}
	]
};

// 알림 액션 결과 데이터 스키마
const NotificationActionData = {
	type: 'object',
	properties: {
		message: { type: 'string', example: '알림을 읽음 처리했습니다.' },
		updatedCount: { type: 'integer', example: 1 }
	}
};

// 알림 액션 응답 스키마 (BaseResponse로 래핑)
const NotificationActionResponse = {
	allOf: [
		{ $ref: '#/components/schemas/BaseResponse' },
		{
			type: 'object',
			properties: {
				result: NotificationActionData
			}
		}
	]
};

// 테스트 알림 생성 요청 스키마
const TestNotificationRequest = {
	type: 'object',
	properties: {
		type: { 
			type: 'string', 
			enum: ['comment', 'plan_reminder', 'mission_complete'],
			example: 'comment' 
		},
		title: { type: 'string', example: '테스트 알림' },
		body: { type: 'string', example: '이것은 테스트 알림입니다.' },
		data: { 
			type: 'object',
			example: { testKey: 'testValue' }
		}
	},
	required: ['type', 'title', 'body']
};

// 테스트 알림 생성 응답 스키마 (BaseResponse로 래핑)
const TestNotificationResponse = {
	allOf: [
		{ $ref: '#/components/schemas/BaseResponse' },
		{
			type: 'object',
			properties: {
				result: NotificationData
			}
		}
	]
};

module.exports = {
	NotificationData,
	PaginationData,
	NotificationListData,
	NotificationListResponse,
	UnreadCountData,
	UnreadCountResponse,
	NotificationStatsData,
	NotificationStatsResponse,
	NotificationActionData,
	NotificationActionResponse,
	TestNotificationRequest,
	TestNotificationResponse
}; 