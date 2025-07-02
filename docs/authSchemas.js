const { UserResponse } = require('./userSchemas');

const JwtTokenRefreshRequest = {
	type: 'object',
	properties: {
		refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNjI5MjgxMjk5LCJleHAiOjE2MjkIjg0ODk5fQ.e_...' },
	},
	required: ['refreshToken'],
};

const JwtTokenResponse = {
	type: 'object',
	properties: {
		accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNjI5MjgxMjk5LCJleHAiOjE2MjkIjg0ODk5fQ.e_...' },
		refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNjI5MjgxMjk5LCJleHAiOjE2MjkIjg0ODk5fQ.e_...' },
	},
}

// 로그인 요청 스키마
const LoginRequest = {
	type: 'object',
	properties: {
		loginId: { type: 'string', example: 'user123' },
		password: { type: 'string', example: 'password123' },
	},
	required: ['loginId', 'password'],
};

// 로그인 응답 스키마
const LoginResponse = {
	type: 'object',
	properties: {
		user: UserResponse,
		tokens: JwtTokenResponse,
	},
};

module.exports = {
	LoginRequest,
	LoginResponse,
	JwtTokenRefreshRequest,
	JwtTokenResponse,
};