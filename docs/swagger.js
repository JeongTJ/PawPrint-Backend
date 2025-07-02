const swaggerJsdoc = require('swagger-jsdoc');
const { 
	UserResponse, 
	UserCreateRequest, 
	UserUpdateRequest 
} = require('./userSchemas');
const { 
	MediaResponse,
	ContentWithMediaResponse,
	ContentCreateRequest, 
	ContentUpdateRequest, 
	ContentUpdateWithMediaRequest,
	ErrorResponse,
	QnaContentResponse,
	CommunityContentResponse,
	ContentListResponse,
	QnaContentListResponse,
	CommunityContentListResponse
} = require('./contentSchemas');
const {
	LoginRequest,
	LoginResponse,
	JwtTokenRefreshRequest,
	JwtTokenResponse,
	CheckLoginIdResponse,
	RegisterResponse,
	LoginData,
	JwtTokenData,
	CheckLoginIdData,
	RegisterData,
	PetInfo,
} = require('./authSchemas');

const options = {
	definition: {
		openapi: '3.0.0',
		info: {
			title: 'PawPrint API',
			version: '1.0.0',
			description: 'PawPrint 백엔드 OpenAPI 문서',
		},
		// servers: [
		// 	{
		// 		url: 'http://localhost:8000',
		// 		description: '로컬 개발 서버',
		// 	},
		// ],
		components: {
			securitySchemes: {
				bearerAuth: {
					type: 'http',
					scheme: 'bearer',
					bearerFormat: 'JWT',
				},
			},
			schemas: {
				// ==================== Base Response Schemas ====================
				BaseResponse: {
					type: 'object',
					properties: {
						code: {
							type: 'integer',
							example: 1,
							description: '응답 코드 (1: 성공, 0: 실패)'
						},
						message: {
							type: 'string',
							example: '성공했습니다.',
							description: '응답 메시지'
						},
						result: {
							description: '실제 데이터'
						}
					},
					required: ['code', 'message', 'result']
				},
				
				// ==================== Plan Schemas ====================
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

				// Content Schemas (단일)
				MediaResponse: MediaResponse,
				ContentWithMediaResponse: ContentWithMediaResponse,
				QnaContentResponse: QnaContentResponse,
				CommunityContentResponse: CommunityContentResponse,
				ErrorResponse: ErrorResponse,
				
				// Content Schemas (목록)
				ContentListResponse: ContentListResponse,
				QnaContentListResponse: QnaContentListResponse,
				CommunityContentListResponse: CommunityContentListResponse,
				
				// Content Request Schemas
				ContentCreateRequest: ContentCreateRequest,
				ContentUpdateRequest: ContentUpdateRequest,
				ContentUpdateWithMediaRequest: ContentUpdateWithMediaRequest,

				UserResponse: UserResponse,
				UserCreateRequest: UserCreateRequest,
				UserUpdateRequest: UserUpdateRequest,

				// Auth Schemas
				JwtTokenRefreshRequest: JwtTokenRefreshRequest,
				JwtTokenResponse: JwtTokenResponse,
				LoginRequest: LoginRequest,
				LoginResponse: LoginResponse,
				CheckLoginIdResponse: CheckLoginIdResponse,
				RegisterResponse: RegisterResponse,
				LoginData: LoginData,
				JwtTokenData: JwtTokenData,
				CheckLoginIdData: CheckLoginIdData,
				RegisterData: RegisterData,
				PetInfo: PetInfo,
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
			name: 'Contents',
			description: '커뮤니티 게시물 및 Q&A **콘텐츠(Contents)** 관리 API',
			externalDocs: {
				description: '미디어 파일 포함 콘텐츠 관리',
				url: 'https://example.com/wiki/contents',
			},
		},
		{
			name: 'Auth',
			description: '로그인·토큰·회원 프로필 관련 API',
		},
	],
};

module.exports = swaggerJsdoc(options); 