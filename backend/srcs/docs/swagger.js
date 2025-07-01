const swaggerJsdoc = require('swagger-jsdoc');
const { Member, MemberView } = require('./memberSchemas');
const { 
	ContentSearchRequest, 
	ContentCreateRequest, 
	ContentUpdateRequest, 
	ContentDeleteRequest, 
	ContentResponse
} = require('./contentSchemas');

const options = {
	definition: {
		openapi: '3.0.0',
		info: {
			title: 'PawPrint API',
			version: '1.0.0',
			description: 'PawPrint 백엔드 OpenAPI 문서',
		},
		servers: [
			{
				url: 'http://localhost:8000',
				description: '로컬 개발 서버',
			},
		],
		components: {
			securitySchemes: {
				bearerAuth: {
					type: 'http',
					scheme: 'bearer',
					bearerFormat: 'JWT',
				},
			},
			schemas: {
				Plan: {                // ← 여기!
					type: 'object',
					properties: {
						// id:    { type: 'integer', example: 1 },
						title: { type: 'string',  example: '산책' },
						date:  { type: 'string',  format: 'date', example: '2024-06-30' },
					},
					required: ['title', 'date'],
				},
				PlanView: {                // ← 여기!
					type: 'object',
					properties: {
						id:    { type: 'integer', example: 1 },
						title: { type: 'string',  example: '산책' },
						date:  { type: 'string',  format: 'date', example: '2024-06-30' },
						created_at: { type: "created_at", format: "date-time", example: "2025-01-01T00:00:00.000Z" }
					},
					required: ['title', 'date'],
				},

				ContentSearchRequest: ContentSearchRequest,
				ContentCreateRequest: ContentCreateRequest,
				ContentUpdateRequest: ContentUpdateRequest,
				ContentDeleteRequest: ContentDeleteRequest,
				ContentResponse: ContentResponse,

				Member: Member,
				MemberView: MemberView,
				Auth: {
					type: 'object',
					properties: {
						accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNjI5MjgxMjk5LCJleHAiOjE2MjkIjg0ODk5fQ.e_...' },
						refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNjI5MjgxMjk5LCJleHAiOjE2MjkIjg0ODk5fQ.e_...' },
					},
					required: ['accessToken', 'refreshToken'],
				},
				AuthRefresh: {
					type: 'object',
					properties: {
						refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNjI5MjgxMjk5LCJleHAiOjE2MjkIjg0ODk5fQ.e_...' },
					},
					required: ['refreshToken'],
				},
			},
		},
		security: [{ bearerAuth: [] }],
	},
	// Swagger 주석을 읽어들일 파일 경로
	apis: ['./controllers/*.js'],
	tags: [
		{
			name: 'Plans',
			description: '반려견 산책·식사 등 **일정(Plan)** CRUD 엔드포인트',
			externalDocs: {
				description: '데이터 모델 설명',
				url: 'https://example.com/wiki/plan',
			},
		},
		{
			name: 'Auth',
			description: '로그인·토큰·회원 프로필 관련 API',
		},
	],
};

module.exports = swaggerJsdoc(options); 