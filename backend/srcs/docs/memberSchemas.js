const Member = {
	type: 'object',
	properties: {
		user_id: { type: 'string', example: 'id' },
		name: { type: 'string', example: '홍길동' },
		email: { type: 'string', example: 'hong@example.com' },
		password: { type: 'string', example: 'password' },
		profile: { type: 'string', example: 'profile.jpg' },
		status_note: { type: 'string', example: '상태 메모' },
	},
	required: ['user_id', 'name', 'email', 'password'],
}

const MemberView = {
	type: 'object',
	properties: {
		id: { type: 'integer', example: 1 },
		user_id: { type: 'string', example: 'id' },
		name: { type: 'string', example: '홍길동' },
		email: { type: 'string', example: 'hong@example.com' },
		profile: { type: 'string', example: 'profile.jpg' },
		status_note: { type: 'string', example: '상태 메모' },
	},
}

module.exports = {
	Member,
	MemberView,
}