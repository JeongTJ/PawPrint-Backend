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
const {
	PlanData,
	MissionData,
	PlanReminderData,
	PlanWithUserData,
	PlanCreateRequest,
	PlanUpdateRequest,
	PlanResponse,
	PlanListResponse,
	PlanSimpleResponse
} = require('./planSchemas');
const { 
	schemas: missionSchemas
} = require('./missionSchemas');
const {
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
} = require('./notificationSchemas');

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
				PlanData: PlanData,
				MissionData: MissionData,
				PlanReminderData: PlanReminderData,
				PlanWithUserData: PlanWithUserData,
				PlanCreateRequest: PlanCreateRequest,
				PlanUpdateRequest: PlanUpdateRequest,
				PlanResponse: PlanResponse,
				PlanListResponse: PlanListResponse,
				PlanSimpleResponse: PlanSimpleResponse,

				// ==================== Daily Mission Schemas ====================
				...missionSchemas,

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

				// ==================== Notification Schemas ====================
				NotificationData: NotificationData,
				NotificationListData: NotificationListData,
				NotificationListResponse: NotificationListResponse,
				UnreadCountData: UnreadCountData,
				UnreadCountResponse: UnreadCountResponse,
				NotificationStatsData: NotificationStatsData,
				NotificationStatsResponse: NotificationStatsResponse,
				NotificationActionData: NotificationActionData,
				NotificationActionResponse: NotificationActionResponse,
				TestNotificationRequest: TestNotificationRequest,
				TestNotificationResponse: TestNotificationResponse,
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
		{
			name: 'Mission Templates',
			description: '일일 미션 템플릿 관리 API (관리자용)',
		},
		{
			name: 'Daily Missions',
			description: '사용자별 일일 미션 관리 API',
		},
		{
			name: 'Mission Memories',
			description: '완료된 미션의 추억 관리 API',
		},
		{
			name: 'notifications',
			description: '인앱 알림 관리 API',
		},
		{
			name: 'AI',
			description: 'AI 에이전트 기능 (슬라이드쇼 등)'
		}
	],
};

module.exports = swaggerJsdoc(options); 