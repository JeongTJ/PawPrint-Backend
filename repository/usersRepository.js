const { prisma } = require('../config/dbConfig');

// 민감한 정보를 제외한 select 필드 정의
const publicUserSelect = {
	id: true,
	loginId: true,
	nickname: true,
	profile: true,
	statusNote: true,
	createdAt: true,
	updatedAt: true,
	// password와 refreshToken은 제외
};

// 모든 사용자 찾기
const findAll = async () => {
	return await prisma.user.findMany({
		select: publicUserSelect,
		orderBy: { id: 'asc' }
	});
};

// 특정 사용자 loginId로 찾기
const findByLoginId = async (loginId) => {
	return await prisma.user.findUnique({
		where: { loginId },
		select: publicUserSelect
	});
};

// 특정 사용자 db id로 찾기
const findById = async (id) => {
	return await prisma.user.findUnique({
		where: { id: BigInt(id) },
		select: publicUserSelect
	});
};

// 로그인용 - 패스워드 포함 조회
const findByLoginIdWithPassword = async (loginId) => {
	return await prisma.user.findUnique({
		where: { loginId },
		select: {
			...publicUserSelect,
			password: true // 로그인 시에만 패스워드 포함
		}
	});
};

// 특정 사용자 생성
const create = async (userData) => {
	const { loginId, nickname, password } = userData;

	console.log('새 사용자 생성:', { loginId, nickname });

	const newUser = await prisma.user.create({
		data: {
			loginId,
			nickname,
			password
		},
		select: publicUserSelect
	});

	return newUser;
};

// 특정 사용자 정보 업데이트
const update = async (id, userData) => {
	const { nickname, profile, statusNote, refreshToken } = userData;
	
	// undefined 값들을 제거하여 실제 업데이트할 필드만 전달
	const updateData = {};
	if (nickname !== undefined) updateData.nickname = nickname;
	if (profile !== undefined) updateData.profile = profile;
	if (statusNote !== undefined) updateData.statusNote = statusNote;
	if (refreshToken !== undefined) updateData.refreshToken = refreshToken;
	
	return await prisma.user.update({
		where: { id: BigInt(id) },
		data: {
			...updateData,
			updatedAt: new Date()
		},
		select: publicUserSelect
	});
};

// refresh token만 업데이트 (JWT 갱신용)
const updateRefreshToken = async (id, refreshToken) => {
	return await prisma.user.update({
		where: { id: BigInt(id) },
		data: { 
			refreshToken,
			updatedAt: new Date()
		},
		select: publicUserSelect
	});
};

// 사용자 삭제
const deleteById = async (id) => {
	return await prisma.user.delete({
		where: { id: BigInt(id) },
		select: publicUserSelect
	});
};

// 사용자 존재 여부 확인 (loginId)
const existsByLoginId = async (loginId) => {
	const count = await prisma.user.count({
		where: { loginId }
	});
	return count > 0;
};

module.exports = {
	findAll,
	findByLoginId,
	findById,
	findByLoginIdWithPassword,
	create,
	update,
	updateRefreshToken,
	deleteById,
	existsByLoginId
}; 