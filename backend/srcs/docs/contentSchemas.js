const ContentSearchRequest = {
	type: 'object',
	properties: {
		id: { type: 'integer', example: 1 },
	},
};

const ContentCreateRequest = {
	type: 'object',
	properties: {
		content_type: { type: 'string', example: 'qna' },
		body: { type: 'string', example: '산책' },
	},
};

const ContentUpdateRequest = {
	type: 'object',
	properties: {
		body: { type: 'string', example: '산책' },
	},
};

const ContentDeleteRequest = {
	type: 'object',
	properties: {
		id: { type: 'integer', example: 1 },
	},
};

const ContentResponse = {
	type: 'object',
	properties: {
		id: { type: 'integer', example: 1 },
		member_id: { type: 'integer', example: 1 },
		body: { type: 'string', example: '산책' },
		likes_count: { type: 'integer', example: 1 },
		comments_count: { type: 'integer', example: 1 },
		created_at: { type: 'string', format: 'date-time', example: '2024-06-30' },
		updated_at: { type: 'string', format: 'date-time', example: '2024-06-30' },
	},
};

const ContentCreateResponse = {
	type: 'object',
	properties: {
		content_type: { type: 'string', example: 'qna' },
		member_id: { type: 'integer', example: 1 },
		body: { type: 'string', example: '산책' },
	},
};

const ContentUpdateResponse = {
	type: 'object',
	properties: {
		body: { type: 'string', example: '산책' },
	},
};

const ContentDeleteResponse = {
	type: 'object',
	properties: {
		id: { type: 'integer', example: 1 },
	},
};

module.exports = {
	ContentSearchRequest,
	ContentCreateRequest,
	ContentUpdateRequest,
	ContentDeleteRequest,
	ContentResponse,
};