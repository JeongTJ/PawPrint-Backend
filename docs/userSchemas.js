const UserResponse = {
	type: 'object',
	properties: {
		id: { type: 'string', example: 'id' },
		loginId: { type: 'string', example: 'loginId' },
		nickname: { type: 'string', example: '홍길동' },
		profile: { type: 'string', example: 'profile.jpg' },
		statusNote: { type: 'string', example: '상태 메모' },
	},
	required: ['userId', 'nickname', 'profile', 'statusNote'],
}

const UserCreateRequest = {
	type: 'object',
	properties: {
		loginId: { type: 'string', example: 'id' },
		password: { type: 'string', example: 'password' },
		nickname: { type: 'string', example: '홍길동' },
		profile: { type: 'string', example: 'profile.jpg' },
		statusNote: { type: 'string', example: '상태 메모' },
	},
}

const UserUpdateRequest = {
	type: 'object',
	properties: {
		profile: { type: 'string', example: 'profile.jpg' },
		statusNote: { type: 'string', example: '상태 메모' },
	},
}

module.exports = {
	UserResponse,
	UserCreateRequest,
	UserUpdateRequest,
}