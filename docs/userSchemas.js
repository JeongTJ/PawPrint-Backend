const PetResponse = {
	type: 'object',
	description: '사용자에게 연결된 반려동물 정보',
	properties: {
		id: { type: 'integer', example: 1 },
		name: { type: 'string', example: '보리' },
		birthDate: { type: 'string', format: 'date-time', example: '2022-01-01T00:00:00.000Z' },
		gender: { type: 'string', example: '수컷' },
		createdAt: { type: 'string', format: 'date-time' },
		updatedAt: { type: 'string', format: 'date-time' },
	}
};

const UserResponse = {
	type: 'object',
	properties: {
		id: { type: 'integer', example: 1 },
		nickname: { type: 'string', example: '집사' },
		profile: { type: 'string', example: 'https://storage.azure.com/profiles/user1.jpg?sasToken=...' },
		statusNote: { type: 'string', example: '산책 갈 사람 구해요' },
		createdAt: { type: 'string', format: 'date-time' },
		updatedAt: { type: 'string', format: 'date-time' },
		pets: {
			type: 'array',
			items: PetResponse,
			description: '사용자가 등록한 반려동물 목록'
		}
	},
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
	PetResponse,
}