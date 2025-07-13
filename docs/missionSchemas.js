// 미션 템플릿 스키마
const MissionTemplateSchema = {
    type: 'object',
    properties: {
        id: {
            type: 'integer',
            description: '미션 템플릿 ID'
        },
        category: {
            type: 'string',
            description: '미션 카테고리',
            example: '운동'
        },
        title: {
            type: 'string',
            description: '미션 제목',
            example: '산책하기'
        },
        description: {
            type: 'string',
            description: '미션 설명',
            example: '반려동물과 함께 30분 이상 산책하기'
        },
        order: {
            type: 'integer',
            description: '미션 순서',
            example: 1
        },
        isActive: {
            type: 'boolean',
            description: '활성화 여부',
            example: true
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
    }
};

// 일일 미션 스키마
const DailyMissionSchema = {
    type: 'object',
    properties: {
        id: {
            type: 'integer',
            description: '일일 미션 ID'
        },
        userId: {
            type: 'integer',
            description: '사용자 ID'
        },
        missionTemplateId: {
            type: 'integer',
            description: '미션 템플릿 ID'
        },
        date: {
            type: 'string',
            format: 'date',
            description: '미션 날짜',
            example: '2025-01-15'
        },
        isCompleted: {
            type: 'boolean',
            description: '완료 여부',
            example: false
        },
        completedAt: {
            type: 'string',
            format: 'date-time',
            description: '완료일시',
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
        },
        missionTemplate: {
			$ref: '#/components/schemas/MissionTemplate'
        },
		missionNumber: {
			type: 'integer',
			description: '사용자의 전체 미션 중 몇 번째 미션인지 나타내는 번호 (최신이 가장 높은 번호)',
			example: 15
		},
    }
};

// 미션 추억 스키마
const MissionMemorySchema = {
    type: 'object',
    properties: {
        id: {
            type: 'integer',
            description: '미션 추억 ID'
        },
        memoryNumber: {
            type: 'integer',
            description: '사용자의 몇 번째 추억인지 나타내는 번호'
        },
        content: {
            type: 'string',
            description: '미션 완료 내용',
            example: '푸들이와 함께 한강에서 산책했어요!'
        },
        images: {
            type: 'array',
            description: '미션 완료 이미지 URL 목록',
            items: {
                type: 'string',
                example: 'https://example.com/image.jpg'
            }
        },
        userId: {
            type: 'integer',
            description: '사용자 ID'
        },
        dailyMissionId: {
            type: 'integer',
            description: '일일 미션 ID'
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
        },
        dailyMission: {
            $ref: '#/components/schemas/DailyMission'
        },
    }
};

// 미션 이미지 스키마
const MissionImageSchema = {
    type: 'object',
    properties: {
        id: {
            type: 'integer',
            description: '미션 이미지 ID'
        },
        missionMemoryId: {
            type: 'integer',
            description: '미션 추억 ID'
        },
        imageUrl: {
            type: 'string',
            description: '이미지 URL',
            example: 'https://example.com/image.jpg'
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
    }
};

// 요청 스키마들
const CreateMissionTemplateRequest = {
    type: 'object',
    required: ['category', 'title', 'description', 'order'],
    properties: {
        category: {
            type: 'string',
            description: '미션 카테고리',
            example: '운동'
        },
        title: {
            type: 'string',
            description: '미션 제목',
            example: '산책하기'
        },
        description: {
            type: 'string',
            description: '미션 설명',
            example: '반려동물과 함께 30분 이상 산책하기'
        },
        order: {
            type: 'integer',
            description: '미션 순서',
            example: 1
        }
    }
};

const CreateMissionMemoryRequest = {
    type: 'object',
    required: ['dailyMissionId', 'content'],
    properties: {
        dailyMissionId: {
            type: 'integer',
            description: '일일 미션 ID',
            example: 1
        },
        content: {
            type: 'string',
            description: '미션 완료 내용',
            example: '푸들이와 함께 한강에서 산책했어요!'
        }
    }
};

const UpdateMissionMemoryRequest = {
    type: 'object',
    properties: {
        content: {
            type: 'string',
            description: '미션 완료 내용',
            example: '푸들이와 함께 한강에서 산책했어요!'
        }
    }
};



const UploadMissionMemoryRequest = {
    type: 'object',
    required: ['dailyMissionId', 'content'],
    properties: {
        dailyMissionId: {
            type: 'integer',
            description: '일일 미션 ID',
            example: 1
        },
        content: {
            type: 'string',
            description: '미션 완료 내용',
            example: '푸들이와 함께 한강에서 산책했어요!'
        },
        images: {
            type: 'array',
            description: '업로드할 이미지 파일들',
            items: {
                type: 'string',
                format: 'binary'
            }
        }
    }
};

// API 경로 정의
const missionPaths = {
    // 미션 템플릿 관련 API
    '/api/mission-templates': {
        get: {
            tags: ['Mission Templates'],
            summary: '모든 활성화된 미션 템플릿 조회',
            description: '현재 활성화된 모든 미션 템플릿을 조회합니다.',
            security: [{ bearerAuth: [] }],
            responses: {
                200: {
                    description: '미션 템플릿 조회 성공',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean', example: true },
                                    data: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/MissionTemplate' }
                                    }
                                }
                            }
                        }
                    }
                },
                401: {
                    description: '인증 실패',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean', example: false },
                                    message: { type: 'string', example: '인증이 필요합니다.' }
                                }
                            }
                        }
                    }
                }
            }
        },
        post: {
            tags: ['Mission Templates'],
            summary: '미션 템플릿 생성 (관리자용)',
            description: '새로운 미션 템플릿을 생성합니다.',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/CreateMissionTemplateRequest' }
                    }
                }
            },
            responses: {
                201: {
                    description: '미션 템플릿 생성 성공',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean', example: true },
                                    data: { $ref: '#/components/schemas/MissionTemplate' },
                                    message: { type: 'string', example: '미션 템플릿이 생성되었습니다.' }
                                }
                            }
                        }
                    }
                },
                400: {
                    description: '입력값 오류',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean', example: false },
                                    message: { type: 'string', example: '필수 필드가 누락되었습니다.' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    
    // 일일 미션 관련 API
    '/api/daily-missions/today': {
        get: {
            tags: ['Daily Missions'],
            summary: '오늘의 일일 미션 조회',
            description: '사용자의 오늘 일일 미션을 조회합니다. 없으면 자동으로 생성됩니다.',
            security: [{ bearerAuth: [] }],
            responses: {
                200: {
                    description: '오늘 미션 조회 성공',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean', example: true },
                                    data: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/DailyMission' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    
    '/api/daily-missions': {
        get: {
            tags: ['Daily Missions'],
            summary: '특정 날짜의 일일 미션 조회',
            description: '특정 날짜의 일일 미션을 조회합니다.',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'date',
                    in: 'query',
                    required: true,
                    description: '조회할 날짜 (YYYY-MM-DD 형식)',
                    schema: { type: 'string', format: 'date', example: '2025-01-15' }
                }
            ],
            responses: {
                200: {
                    description: '날짜별 미션 조회 성공',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean', example: true },
                                    data: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/DailyMission' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    
    '/api/daily-missions/history': {
        get: {
            tags: ['Daily Missions'],
            summary: '미션 기록 조회 (기간별)',
            description: '특정 기간의 미션 기록을 조회합니다.',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'startDate',
                    in: 'query',
                    required: true,
                    description: '시작일 (YYYY-MM-DD 형식)',
                    schema: { type: 'string', format: 'date', example: '2025-01-01' }
                },
                {
                    name: 'endDate',
                    in: 'query',
                    required: true,
                    description: '종료일 (YYYY-MM-DD 형식)',
                    schema: { type: 'string', format: 'date', example: '2025-01-31' }
                }
            ],
            responses: {
                200: {
                    description: '미션 기록 조회 성공',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean', example: true },
                                    data: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/DailyMission' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    
    '/api/daily-missions/{id}/toggle': {
        patch: {
            tags: ['Daily Missions'],
            summary: '일일 미션 완료/미완료 토글',
            description: '일일 미션의 완료 상태를 토글합니다.',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'id',
                    in: 'path',
                    required: true,
                    description: '일일 미션 ID',
                    schema: { type: 'integer', example: 1 }
                }
            ],
            responses: {
                200: {
                    description: '미션 완료 상태 변경 성공',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean', example: true },
                                    data: { $ref: '#/components/schemas/DailyMission' },
                                    message: { type: 'string', example: '미션이 완료되었습니다.' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    
    // 미션 추억 관련 API
    '/api/mission-memories': {
        get: {
            tags: ['Mission Memories'],
            summary: '사용자의 모든 미션 추억 조회',
            description: '사용자의 모든 미션 추억을 조회합니다.',
            security: [{ bearerAuth: [] }],
            responses: {
                200: {
                    description: '미션 추억 조회 성공',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean', example: true },
                                    data: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/MissionMemory' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        post: {
            tags: ['Mission Memories'],
            summary: '미션 추억 생성 (파일 업로드)',
            description: '파일 업로드를 통해 미션 추억을 생성합니다.',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'multipart/form-data': {
                        schema: {
                            type: 'object',
                            properties: {
                                dailyMissionId: {
                                    type: 'integer',
                                    description: '일일 미션 ID',
                                    example: 1
                                },
                                content: {
                                    type: 'string',
                                    description: '미션 완료 내용',
                                    example: '푸들이와 함께 한강에서 산책했어요!'
                                },
                                images: {
                                    type: 'array',
                                    description: '업로드할 이미지 파일들 (최대 10개)',
                                    items: {
                                        type: 'string',
                                        format: 'binary'
                                    },
                                    maxItems: 10
                                }
                            },
                            required: ['dailyMissionId', 'content']
                        }
                    }
                }
            },
            responses: {
                201: {
                    description: '미션 추억 생성 성공',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean', example: true },
                                    data: { $ref: '#/components/schemas/MissionMemory' },
                                    message: { type: 'string', example: '미션 추억이 생성되었습니다.' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    
    '/api/mission-memories/with-urls': {
        post: {
            tags: ['Mission Memories'],
            summary: '미션 추억 생성 (URL 방식)',
            description: '이미지 URL을 통해 미션 추억을 생성합니다.',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/CreateMissionMemoryRequest' }
                    }
                }
            },
            responses: {
                201: {
                    description: '미션 추억 생성 성공',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean', example: true },
                                    data: { $ref: '#/components/schemas/MissionMemory' },
                                    message: { type: 'string', example: '미션 추억이 생성되었습니다.' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    
    '/api/mission-memories/{id}': {
        put: {
            tags: ['Mission Memories'],
            summary: '미션 추억 업데이트',
            description: '미션 추억을 업데이트합니다.',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'id',
                    in: 'path',
                    required: true,
                    description: '미션 추억 ID',
                    schema: { type: 'integer', example: 1 }
                }
            ],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/UpdateMissionMemoryRequest' }
                    }
                }
            },
            responses: {
                200: {
                    description: '미션 추억 업데이트 성공',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean', example: true },
                                    data: { $ref: '#/components/schemas/MissionMemory' },
                                    message: { type: 'string', example: '미션 추억이 업데이트되었습니다.' }
                                }
                            }
                        }
                    }
                }
            }
        },
        delete: {
            tags: ['Mission Memories'],
            summary: '미션 추억 삭제',
            description: '미션 추억을 삭제합니다.',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'id',
                    in: 'path',
                    required: true,
                    description: '미션 추억 ID',
                    schema: { type: 'integer', example: 1 }
                }
            ],
            responses: {
                200: {
                    description: '미션 추억 삭제 성공',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean', example: true },
                                    message: { type: 'string', example: '미션 추억이 삭제되었습니다.' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },

    // 미션 이미지 관련 API
    '/api/missions/memories/{id}/images': {
        get: {
            tags: ['Mission Images'],
            summary: '미션 추억의 모든 이미지 조회',
            description: '특정 미션 추억의 모든 이미지를 조회합니다.',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'id',
                    in: 'path',
                    required: true,
                    description: '미션 추억 ID',
                    schema: { type: 'integer', example: 1 }
                }
            ],
            responses: {
                200: {
                    description: '미션 이미지 조회 성공',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean', example: true },
                                    data: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/MissionImage' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },

    },

    '/api/missions/memories/{id}/images/upload': {
        post: {
            tags: ['Mission Images'],
            summary: '미션 추억에 이미지 업로드 (단일 파일)',
            description: '미션 추억에 새로운 이미지 파일을 업로드합니다.',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'id',
                    in: 'path',
                    required: true,
                    description: '미션 추억 ID',
                    schema: { type: 'integer', example: 1 }
                }
            ],
            requestBody: {
                required: true,
                content: {
                    'multipart/form-data': {
                        schema: {
                            type: 'object',
                            properties: {
                                image: {
                                    type: 'string',
                                    format: 'binary',
                                    description: '업로드할 이미지 파일'
                                }
                            },
                            required: ['image']
                        }
                    }
                }
            },
            responses: {
                201: {
                    description: '미션 이미지 업로드 성공',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean', example: true },
                                    data: { $ref: '#/components/schemas/MissionImage' },
                                    message: { type: 'string', example: '미션 이미지가 업로드되었습니다.' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },

    '/api/missions/memories/{id}/images/upload-multiple': {
        post: {
            tags: ['Mission Images'],
            summary: '미션 추억에 여러 이미지 업로드',
            description: '미션 추억에 여러 이미지 파일을 업로드합니다.',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'id',
                    in: 'path',
                    required: true,
                    description: '미션 추억 ID',
                    schema: { type: 'integer', example: 1 }
                }
            ],
            requestBody: {
                required: true,
                content: {
                    'multipart/form-data': {
                        schema: {
                            type: 'object',
                            properties: {
                                images: {
                                    type: 'array',
                                    description: '업로드할 이미지 파일들 (최대 10개)',
                                    items: {
                                        type: 'string',
                                        format: 'binary'
                                    }
                                }
                            },
                            required: ['images']
                        }
                    }
                }
            },
            responses: {
                201: {
                    description: '미션 이미지들 업로드 성공',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean', example: true },
                                    data: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/MissionImage' }
                                    },
                                    message: { type: 'string', example: '미션 이미지들이 업로드되었습니다.' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },

    '/api/missions/images/{id}': {
        delete: {
            tags: ['Mission Images'],
            summary: '미션 이미지 삭제',
            description: '특정 미션 이미지를 삭제합니다.',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'id',
                    in: 'path',
                    required: true,
                    description: '미션 이미지 ID',
                    schema: { type: 'integer', example: 1 }
                }
            ],
            responses: {
                200: {
                    description: '미션 이미지 삭제 성공',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean', example: true },
                                    message: { type: 'string', example: '미션 이미지가 삭제되었습니다.' }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};

module.exports = {
    schemas: {
        MissionTemplate: MissionTemplateSchema,
        DailyMission: DailyMissionSchema,
        MissionMemory: MissionMemorySchema,
        MissionImage: MissionImageSchema,
        CreateMissionTemplateRequest,
        CreateMissionMemoryRequest,
        UpdateMissionMemoryRequest,
        UploadMissionMemoryRequest
    },
    paths: missionPaths
}; 