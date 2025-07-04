// Plan 기본 데이터 스키마
const PlanData = {
	type: 'object',
	properties: {
		id: {
			type: 'integer',
			description: '계획 ID'
		},
		userId: {
			type: 'integer',
			description: '사용자 ID'
		},
		title: {
			type: 'string',
			description: '계획 제목',
			maxLength: 100
		},
		description: {
			type: 'string',
			description: '계획 설명',
			nullable: true
		},
		date: {
			type: 'string',
			format: 'date',
			description: '계획 날짜 (YYYY-MM-DD)'
		},
		time: {
			type: 'string',
			format: 'time',
			description: '계획 시간 (HH:MM:SS)',
			nullable: true
		},
		isCompleted: {
			type: 'boolean',
			description: '완료 여부',
			default: false
		},
		location: {
			type: 'string',
			description: '장소',
			nullable: true
		},
		reminderAt: {
			type: 'string',
			format: 'date-time',
			description: '알림 시간',
			nullable: true
		},
		createdAt: {
			type: 'string',
			format: 'date-time',
			description: '생성일시'
		},
		updatedAt: {
			type: 'string',
			format: 'date-time',
			description: '수정일시'
		}
	},
	required: ['id', 'userId', 'title', 'date', 'isCompleted', 'createdAt', 'updatedAt']
};

// Mission 스키마
const MissionData = {
	type: 'object',
	properties: {
		id: {
			type: 'integer',
			description: '미션 ID'
		},
		planId: {
			type: 'integer',
			description: '계획 ID'
		},
		title: {
			type: 'string',
			description: '미션 제목'
		},
		description: {
			type: 'string',
			description: '미션 설명',
			nullable: true
		},
		missionOrder: {
			type: 'integer',
			description: '미션 순서',
			nullable: true
		},
		isDone: {
			type: 'boolean',
			description: '완료 여부',
			default: false
		},
		createdAt: {
			type: 'string',
			format: 'date-time',
			description: '생성일시'
		},
		updatedAt: {
			type: 'string',
			format: 'date-time',
			description: '수정일시'
		}
	},
	required: ['id', 'planId', 'title', 'isDone', 'createdAt', 'updatedAt']
};



// 사용자 정보 포함 계획 스키마
const PlanWithUserData = {
	type: 'object',
	allOf: [
		{ $ref: '#/components/schemas/PlanData' },
		{
			type: 'object',
			properties: {
				user: {
					type: 'object',
					properties: {
						id: {
							type: 'integer',
							description: '사용자 ID'
						},
						loginId: {
							type: 'string',
							description: '로그인 ID'
						},
						nickname: {
							type: 'string',
							description: '닉네임'
						}
					},
					required: ['id', 'loginId', 'nickname']
				},
				missions: {
					type: 'array',
					items: { $ref: '#/components/schemas/MissionData' },
					description: '미션 목록'
				}
			},
			required: ['user', 'missions']
		}
	]
};

// 계획 생성 요청 스키마
const PlanCreateRequest = {
	type: 'object',
	properties: {
		title: {
			type: 'string',
			description: '계획 제목',
			maxLength: 100
		},
		description: {
			type: 'string',
			description: '계획 설명',
			nullable: true
		},
		date: {
			type: 'string',
			format: 'date',
			description: '계획 날짜 (YYYY-MM-DD)'
		},
		time: {
			type: 'string',
			format: 'time',
			description: '계획 시간 (HH:MM:SS)',
			nullable: true
		},
		location: {
			type: 'string',
			description: '장소',
			nullable: true
		},
		reminderAt: {
			type: 'string',
			format: 'date-time',
			description: '알림 시간',
			nullable: true
		}
	},
	required: ['title', 'date'],
	example: {
		title: '세은동물병원 검진',
		description: '우리 강아지 정기 검진 받기',
		date: '2025-04-17',
		time: '11:00:00',
		location: '세은동물병원',
		reminderAt: '2025-04-17T10:00:00Z' // 1시간 전 알림
	}
};

// 계획 수정 요청 스키마
const PlanUpdateRequest = {
	type: 'object',
	properties: {
		title: {
			type: 'string',
			description: '계획 제목',
			maxLength: 100
		},
		description: {
			type: 'string',
			description: '계획 설명',
			nullable: true
		},
		date: {
			type: 'string',
			format: 'date',
			description: '계획 날짜 (YYYY-MM-DD)'
		},
		time: {
			type: 'string',
			format: 'time',
			description: '계획 시간 (HH:MM:SS)',
			nullable: true
		},
		isCompleted: {
			type: 'boolean',
			description: '완료 여부'
		},
		location: {
			type: 'string',
			description: '장소',
			nullable: true
		},
		reminderAt: {
			type: 'string',
			format: 'date-time',
			description: '알림 시간',
			nullable: true
		}
	},
	example: {
		title: '세은동물병원 검진 완료',
		isCompleted: true,
		reminderAt: null // 알림 제거
	}
};

// BaseResponse로 래핑된 응답 스키마들
const PlanResponse = {
	type: 'object',
	properties: {
		code: {
			type: 'integer',
			description: '응답 코드'
		},
		message: {
			type: 'string',
			description: '응답 메시지'
		},
		result: {
			$ref: '#/components/schemas/PlanWithUserData'
		}
	},
	required: ['code', 'message', 'result']
};

const PlanListResponse = {
	type: 'object',
	properties: {
		code: {
			type: 'integer',
			description: '응답 코드'
		},
		message: {
			type: 'string',
			description: '응답 메시지'
		},
		result: {
			type: 'array',
			items: {
				$ref: '#/components/schemas/PlanWithUserData'
			}
		}
	},
	required: ['code', 'message', 'result']
};

const PlanSimpleResponse = {
	type: 'object',
	properties: {
		code: {
			type: 'integer',
			description: '응답 코드'
		},
		message: {
			type: 'string',
			description: '응답 메시지'
		},
		result: {
			$ref: '#/components/schemas/PlanData'
		}
	},
	required: ['code', 'message', 'result']
};

module.exports = {
	PlanData,
	MissionData,
	PlanWithUserData,
	PlanCreateRequest,
	PlanUpdateRequest,
	PlanResponse,
	PlanListResponse,
	PlanSimpleResponse
}; 