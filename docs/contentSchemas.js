const { UserResponse } = require('./userSchemas');

// 미디어 스키마
const MediaResponse = {
	type: 'object',
	properties: {
		id: { type: 'integer', example: 1 },
		fileUrl: { type: 'string', example: 'https://storage.azure.com/images/dog.jpg?sasToken=...' },
		createdAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00.000Z' },
		updatedAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00.000Z' },
	},
};

// 기본 컨텐츠 데이터 (미디어 포함)
const ContentWithMediaData = {
	type: 'object',
	properties: {
		id: { type: 'integer', example: 1 },
		userId: { type: 'integer', example: 5 },
		contentType: { type: 'string', enum: ['qna', 'community'], example: 'community' },
		body: { type: 'string', example: '우리 강아지가 오늘 처음으로 바다를 봤어요! 🐕🌊' },
		likesCount: { type: 'integer', example: 12 },
		commentsCount: { type: 'integer', example: 3 },
		isLiked: { type: 'boolean', example: false, description: '현재 사용자의 좋아요 여부' },
		createdAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00.000Z' },
		updatedAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00.000Z' },
		media: {
			type: 'array',
			items: MediaResponse,
			example: [
				{
					id: 1,
					fileUrl: 'https://storage.azure.com/images/dog_beach_1.jpg?sasToken=...',
					createdAt: '2024-01-15T10:30:05.000Z',
					updatedAt: '2024-01-15T10:30:05.000Z'
				},
				{
					id: 2,
					fileUrl: 'https://storage.azure.com/images/dog_beach_2.jpg?sasToken=...',
					createdAt: '2024-01-15T10:30:06.000Z',
					updatedAt: '2024-01-15T10:30:06.000Z'
				}
			]
		},
		nickname: UserResponse.properties.nickname,
		profile: UserResponse.properties.profile,
	},
};

// BaseResponse로 래핑된 컨텐츠 응답
const ContentWithMediaResponse = {
	type: 'object',
	properties: {
		code: { type: 'integer', example: 1 },
		message: { type: 'string', example: '성공했습니다.' },
		result: ContentWithMediaData
	}
};

// QNA 전용 데이터 (미디어 없음)
const QnaContentData = {
	type: 'object',
	properties: {
		id: { type: 'integer', example: 2 },
		userId: { type: 'integer', example: 3 },
		contentType: { type: 'string', example: 'qna' },
		body: { type: 'string', example: '강아지가 밥을 안 먹어요. 어떻게 해야 할까요?' },
		likesCount: { type: 'integer', example: 5 },
		commentsCount: { type: 'integer', example: 8 },
		isLiked: { type: 'boolean', example: false, description: '현재 사용자의 좋아요 여부' },
		createdAt: { type: 'string', format: 'date-time', example: '2024-01-15T11:00:00.000Z' },
		updatedAt: { type: 'string', format: 'date-time', example: '2024-01-15T11:00:00.000Z' },
		media: {
			type: 'array',
			items: MediaResponse,
			example: []
		},
		nickname: UserResponse.properties.nickname,
		profile: UserResponse.properties.profile,
	}
};

// BaseResponse로 래핑된 QNA 응답
const QnaContentResponse = {
	type: 'object',
	properties: {
		code: { type: 'integer', example: 1 },
		message: { type: 'string', example: '성공했습니다.' },
		result: QnaContentData
	}
};

// Community 전용 데이터 (미디어 포함 가능)
const CommunityContentData = {
	type: 'object',
	properties: {
		id: { type: 'integer', example: 1 },
		userId: { type: 'integer', example: 5 },
		contentType: { type: 'string', example: 'community' },
		body: { type: 'string', example: '우리 강아지 산책 사진들! 🐕' },
		likesCount: { type: 'integer', example: 12 },
		commentsCount: { type: 'integer', example: 3 },
		isLiked: { type: 'boolean', example: false, description: '현재 사용자의 좋아요 여부' },
		createdAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00.000Z' },
		updatedAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00.000Z' },
		media: {
			type: 'array',
			items: MediaResponse,
			example: [
				{
					id: 1,
					fileUrl: 'https://storage.azure.com/images/dog1.jpg?sasToken=...',
					createdAt: '2024-01-15T10:30:05.000Z',
					updatedAt: '2024-01-15T10:30:05.000Z'
				}
			]
		},
		nickname: UserResponse.properties.nickname,
		profile: UserResponse.properties.profile,
	}
};

// BaseResponse로 래핑된 Community 응답
const CommunityContentResponse = {
	type: 'object',
	properties: {
		code: { type: 'integer', example: 1 },
		message: { type: 'string', example: '성공했습니다.' },
		result: CommunityContentData
	}
};

// 컨텐츠 생성 요청 (multipart/form-data)
const ContentCreateRequest = {
	type: 'object',
	properties: {
		contentType: {
			type: 'string',
			enum: ['qna', 'community'],
			example: 'community',
			description: '게시물 타입 (QNA 게시물은 이미지 첨부 불가)'
		},
		body: {
			type: 'string',
			example: '우리 강아지 산책 사진들이에요! 🐕',
			description: '게시물 내용'
		},
		images: {
			type: 'array',
			items: {
				type: 'string',
				format: 'binary'
			},
			maxItems: 5,
			description: '이미지 파일들 (최대 5개, QNA 게시물은 첨부 불가)'
		}
	},
	required: ['contentType', 'body']
};

// 컨텐츠 텍스트 수정 요청
const ContentUpdateRequest = {
	type: 'object',
	properties: {
		body: {
			type: 'string',
			example: '수정된 게시물 내용입니다.',
			description: '수정할 게시물 내용'
		}
	}
};

// 컨텐츠 + 미디어 수정 요청 (multipart/form-data)
const ContentUpdateWithMediaRequest = {
	type: 'object',
	properties: {
		body: {
			type: 'string',
			example: '수정된 게시물 내용입니다.',
			description: '수정할 게시물 내용'
		},
		images: {
			type: 'array',
			items: {
				type: 'string',
				format: 'binary'
			},
			maxItems: 5,
			description: '새로운 이미지 파일들 (기존 이미지는 모두 교체됨)'
		}
	}
};

// 게시물 목록 응답 (BaseResponse 형태)
const ContentListResponse = {
	type: 'object',
	properties: {
		code: { type: 'integer', example: 1 },
		message: { type: 'string', example: '성공했습니다.' },
		result: {
			type: 'array',
			items: ContentWithMediaData
		}
	}
};

// QNA 게시물 목록 응답
const QnaContentListResponse = {
	type: 'object',
	properties: {
		code: { type: 'integer', example: 1 },
		message: { type: 'string', example: '성공했습니다.' },
		result: {
			type: 'array',
			items: QnaContentData
		}
	}
};

// Community 게시물 목록 응답
const CommunityContentListResponse = {
	type: 'object',
	properties: {
		code: { type: 'integer', example: 1 },
		message: { type: 'string', example: '성공했습니다.' },
		result: {
			type: 'array',
			items: CommunityContentData
		}
	}
};

// 에러 응답 (BaseResponse 형태)
const ErrorResponse = {
	type: 'object',
	properties: {
		code: { type: 'integer', example: 0 },
		message: { type: 'string', example: '게시물을 찾을 수 없습니다.' },
		result: { type: 'null', example: null }
	}
};

module.exports = {
	// 응답 스키마 (단일)
	MediaResponse,
	ContentWithMediaResponse,
	QnaContentResponse,
	CommunityContentResponse,
	ErrorResponse,
	
	// 응답 스키마 (목록)
	ContentListResponse,
	QnaContentListResponse,
	CommunityContentListResponse,
	
	// 데이터 스키마
	ContentWithMediaData,
	QnaContentData,
	CommunityContentData,

	// 요청 스키마
	ContentCreateRequest,
	ContentUpdateRequest,
	ContentUpdateWithMediaRequest,
};