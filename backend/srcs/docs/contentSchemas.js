// 미디어 스키마
const MediaResponse = {
	type: 'object',
	properties: {
		id: { type: 'integer', example: 1 },
		file_url: { type: 'string', example: 'https://storage.azure.com/images/dog.jpg?sasToken=...' },
		created_at: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00.000Z' },
		updated_at: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00.000Z' },
	},
};

// 기본 컨텐츠 응답 (미디어 포함)
const ContentWithMediaResponse = {
	type: 'object',
	properties: {
		id: { type: 'integer', example: 1 },
		member_id: { type: 'integer', example: 5 },
		content_type: { type: 'string', enum: ['qna', 'community'], example: 'community' },
		body: { type: 'string', example: '우리 강아지가 오늘 처음으로 바다를 봤어요! 🐕🌊' },
		likes_count: { type: 'integer', example: 12 },
		comments_count: { type: 'integer', example: 3 },
		created_at: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00.000Z' },
		updated_at: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00.000Z' },
		media: {
			type: 'array',
			items: MediaResponse,
			example: [
				{
					id: 1,
					file_url: 'https://storage.azure.com/images/dog_beach_1.jpg?sasToken=...',
					created_at: '2024-01-15T10:30:05.000Z',
					updated_at: '2024-01-15T10:30:05.000Z'
				},
				{
					id: 2,
					file_url: 'https://storage.azure.com/images/dog_beach_2.jpg?sasToken=...',
					created_at: '2024-01-15T10:30:06.000Z',
					updated_at: '2024-01-15T10:30:06.000Z'
				}
			]
		},
	},
};

// QNA 전용 응답 (미디어 없음)
const QnaContentResponse = {
	type: 'object',
	properties: {
		id: { type: 'integer', example: 2 },
		member_id: { type: 'integer', example: 3 },
		content_type: { type: 'string', example: 'qna' },
		body: { type: 'string', example: '강아지가 밥을 안 먹어요. 어떻게 해야 할까요?' },
		likes_count: { type: 'integer', example: 5 },
		comments_count: { type: 'integer', example: 8 },
		created_at: { type: 'string', format: 'date-time', example: '2024-01-15T11:00:00.000Z' },
		updated_at: { type: 'string', format: 'date-time', example: '2024-01-15T11:00:00.000Z' },
		media: {
			type: 'array',
			items: MediaResponse,
			example: []
		}
	}
};

// Community 전용 응답 (미디어 포함 가능)
const CommunityContentResponse = {
	type: 'object',
	properties: {
		id: { type: 'integer', example: 1 },
		member_id: { type: 'integer', example: 5 },
		content_type: { type: 'string', example: 'community' },
		body: { type: 'string', example: '우리 강아지 산책 사진들! 🐕' },
		likes_count: { type: 'integer', example: 12 },
		comments_count: { type: 'integer', example: 3 },
		created_at: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00.000Z' },
		updated_at: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00.000Z' },
		media: {
			type: 'array',
			items: MediaResponse,
			example: [
				{
					id: 1,
					file_url: 'https://storage.azure.com/images/dog1.jpg?sasToken=...',
					created_at: '2024-01-15T10:30:05.000Z',
					updated_at: '2024-01-15T10:30:05.000Z'
				}
			]
		}
	}
};

// 컨텐츠 생성 요청 (multipart/form-data)
const ContentCreateRequest = {
	type: 'object',
	properties: {
		content_type: {
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
	required: ['content_type', 'body']
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

// 에러 응답
const ErrorResponse = {
	type: 'object',
	properties: {
		message: {
			type: 'string',
			example: '게시물을 찾을 수 없습니다.',
			description: '에러 메시지'
		}
	}
};

module.exports = {
	// 응답 스키마
	MediaResponse,
	ContentWithMediaResponse,
	QnaContentResponse,
	CommunityContentResponse,
	ErrorResponse,
	
	// 요청 스키마
	ContentCreateRequest,
	ContentUpdateRequest,
	ContentUpdateWithMediaRequest,
};