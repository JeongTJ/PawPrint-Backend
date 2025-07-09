// Plan 기본 데이터 스키마
const PlanData = {
	type: 'object',
	properties: {
		id: {
			type: 'integer',
			description: '계획 ID',
		},
		userId: {
			type: 'integer',
			description: '사용자 ID',
		},
		title: {
			type: 'string',
			description: '계획 제목',
			maxLength: 100,
		},
		description: {
			type: 'string',
			description: '계획 설명',
			nullable: true,
		},
		date: {
			type: 'string',
			format: 'date',
			description: '계획 날짜 (YYYY-MM-DD)',
		},
		time: {
			type: 'string',
			pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:00$',
			description: '계획 시간 (HH:MM:00)',
			example: '14:30:00',
			nullable: true,
		},
		isCompleted: {
			type: 'boolean',
			description: '완료 여부',
			default: false,
		},
		reminderAt: {
			type: 'string',
			format: 'date-time',
			description: '알림 시간',
			nullable: true,
		},
		reminderSent: {
			type: 'boolean',
			description: '알림 발송 여부',
			default: false,
		},
	},
	required: ['id', 'userId', 'title', 'date', 'isCompleted'],
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
				}
			},
			required: ['user']
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
			pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:00$',
			description: '계획 시간 (HH:MM:00)',
			example: '14:30:00',
			nullable: true
		},
		reminderOption: {
			type: 'integer',
			description: '알림을 받을 시간 (분 단위). 예를 들어, 10분 전은 10, 1시간 전은 60, 하루 전은 1440을 입력합니다.',
			example: 60,
			nullable: true
		}
	},
	required: ['title', 'date'],
	examples: {
		withReminderOption: {
			summary: '알림 옵션 사용 (1시간 전)',
			value: {
				title: '세은동물병원 검진',
				description: '우리 강아지 정기 검진 받기',
				date: '2025-04-17',
				time: '11:00:00',
				reminderOption: 60 // 1시간(60분) 전 알림
			}
		},
		withoutReminder: {
			summary: '알림 없음',
			value: {
				title: '집에서 강아지 목욕',
				description: '집에서 간단히 목욕시키기',
				date: '2025-04-19',
				time: '18:00:00'
			}
		}
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
			pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:00$',
			description: '계획 시간 (HH:MM:00)',
			example: '14:30:00',
			nullable: true
		},
		isCompleted: {
			type: 'boolean',
			description: '완료 여부'
		},
		reminderOption: {
			type: 'integer',
			description: '알림을 받을 시간 (분 단위). 예를 들어, 10분 전은 10, 1시간 전은 60, 하루 전은 1440을 입력합니다.',
			example: 30,
			nullable: true
		}
	},
	examples: {
		completeTask: {
			summary: '계획 완료 처리',
			value: {
				title: '세은동물병원 검진 완료',
				isCompleted: true
			}
		},
		changeReminderOption: {
			summary: '알림 옵션 변경 (30분 전)',
			value: {
				reminderOption: 30 // 30분 전 알림으로 변경
			}
		},
		updateTime: {
			summary: '시간 변경',
			value: {
				time: '16:00:00',
				reminderOption: 60 // 1시간(60분) 전 알림으로 변경
			}
		},
		removeReminder: {
			summary: '알림 제거',
			value: {
				reminderOption: null // 알림 제거
			}
		}
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
			$ref: '#/components/schemas/PlanData'
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
				$ref: '#/components/schemas/PlanData'
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