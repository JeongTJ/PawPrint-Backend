const { UserResponse } = require('./userSchemas');

const JwtTokenRefreshRequest = {
	type: 'object',
	properties: {
		refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNjI5MjgxMjk5LCJleHAiOjE2MjkIjg0ODk5fQ.e_...' },
	},
	required: ['refreshToken'],
};

// 토큰 데이터 스키마
const JwtTokenData = {
	type: 'object',
	properties: {
		accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNjI5MjgxMjk5LCJleHAiOjE2MjkIjg0ODk5fQ.e_...' },
		refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNjI5MjgxMjk5LCJleHAiOjE2MjkIjg0ODk5fQ.e_...' },
	},
};

// 토큰 응답 스키마 (BaseResponse로 래핑)
const JwtTokenResponse = {
	allOf: [
		{ $ref: '#/components/schemas/BaseResponse' },
		{
			type: 'object',
			properties: {
				result: JwtTokenData
			}
		}
	]
};

// 로그인 요청 스키마
const LoginRequest = {
	type: 'object',
	properties: {
		loginId: { type: 'string', example: 'user123' },
		password: { type: 'string', example: 'password123' },
	},
	required: ['loginId', 'password'],
};

// 로그인 데이터 스키마
const LoginData = {
	type: 'object',
	properties: {
		user: UserResponse,
		tokens: JwtTokenData,
	},
};

// 로그인 응답 스키마 (BaseResponse로 래핑)
const LoginResponse = {
	allOf: [
		{ $ref: '#/components/schemas/BaseResponse' },
		{
			type: 'object',
			properties: {
				result: LoginData
			}
		}
	]
};

// 아이디 중복 확인 데이터 스키마
const CheckLoginIdData = {
	type: 'object',
	properties: {
		available: { type: 'boolean', example: true }
	}
};

// 아이디 중복 확인 응답 스키마 (BaseResponse로 래핑)
const CheckLoginIdResponse = {
	allOf: [
		{ $ref: '#/components/schemas/BaseResponse' },
		{
			type: 'object',
			properties: {
				result: CheckLoginIdData
			}
		}
	]
};

// 반려동물 정보 스키마
const PetInfo = {
	type: 'object',
	properties: {
		id: { type: 'integer', example: 1 },
		name: { type: 'string', example: '멍멍이' },
		birthDate: { type: 'string', format: 'date-time', example: '2020-01-01T00:00:00.000Z' },
		gender: { type: 'string', enum: ['male', 'female'], example: 'male' },
	}
};

// 회원가입 데이터 스키마
const RegisterData = {
	type: 'object',
	properties: {
		user: UserResponse,
		pet: PetInfo,
		tokens: JwtTokenData,
	},
};

// 회원가입 응답 스키마 (BaseResponse로 래핑)
const RegisterResponse = {
	allOf: [
		{ $ref: '#/components/schemas/BaseResponse' },
		{
			type: 'object',
			properties: {
				result: RegisterData
			}
		}
	]
};

module.exports = {
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
};