const { prisma } = require('../config/dbConfig');
const storageRepository = require('./storageRepository');

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
	const users = await prisma.user.findMany({
		select: publicUserSelect,
		orderBy: { id: 'asc' }
	});

	// 각 사용자의 프로필 이미지 SAS URL 리프레시
	const refreshedUsers = await Promise.all(
		users.map(user => refreshUserProfileIfExpired(user))
	);

	return refreshedUsers;
};

// 특정 사용자 loginId로 찾기
const findByLoginId = async (loginId) => {
	const user = await prisma.user.findUnique({
		where: { loginId },
		select: publicUserSelect
	});

	if (!user) return null;
	
	// 프로필 이미지 SAS URL 리프레시
	return await refreshUserProfileIfExpired(user);
};

// 특정 사용자 nickname으로 찾기
const findByNickname = async (nickname) => {
	console.log("nickname", nickname);
	const user = await prisma.user.findUnique({
		where: { nickname },
		select: publicUserSelect
	});

	if (!user) return null;
	
	// 프로필 이미지 SAS URL 리프레시
	return await refreshUserProfileIfExpired(user);
};

// 특정 사용자 db id로 찾기
const findById = async (id) => {
	const user = await prisma.user.findUnique({
		where: { id: parseInt(id) },
		select: publicUserSelect
	});

	if (!user) return null;
	
	// 프로필 이미지 SAS URL 리프레시
	return await refreshUserProfileIfExpired(user);
};

const findByIdIncludeRefreshToken = async (id) => {
	const user = await prisma.user.findUnique({
		where: { id: parseInt(id) },
		select: { ...publicUserSelect, refreshToken: true }
	});

	if (!user) return null;
	
	// 프로필 이미지 SAS URL 리프레시
	return await refreshUserProfileIfExpired(user);
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
		where: { id: (id) },
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
		where: { id: (id) },
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
		where: { id: (id) },
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

// 사용자 프로필 이미지 SAS URL 자동 리프레시 (storageRepository 범용 함수 사용)
const refreshUserProfileIfExpired = async (user) => {
	if (!user || !user.profile) return user;
	
	// storageRepository의 범용 함수 사용
	const newUrl = await storageRepository.refreshUrlIfExpired(
		user.profile,
		'profiles',
		async (oldUrl, newUrl) => {
			// DB 업데이트 콜백
			await prisma.user.update({
				where: { id: user.id },
				data: { 
					profile: newUrl,
					updatedAt: new Date()
				}
			});
		}
	);
	
	return { ...user, profile: newUrl };
};

// ========== 로그인 플로우 관련 함수들 ==========

// 회원가입: 사용자와 반려동물 정보 동시 생성 (트랜잭션)
const createUserWithPet = async (userData, petData, files = {}) => {
	const storageRepository = require('./storageRepository');
	let uploadedFiles = [];
	
	try {
		// 1. 먼저 파일들을 Storage에 업로드
		if (files.profileImage) {
			const file = files.profileImage;
			userData.profile = await storageRepository.uploadFile(
				file.buffer, 
				file.originalname, 
				file.mimetype, 
				'profiles'
			);
			uploadedFiles.push(userData.profile);
		}

		if (files.petProfileImage) {
			const file = files.petProfileImage;
			petData.profile = await storageRepository.uploadFile(
				file.buffer, 
				file.originalname, 
				file.mimetype, 
				'pets'
			);
			uploadedFiles.push(petData.profile);
		}

		// 2. DB 트랜잭션으로 사용자와 반려동물 생성
		const result = await prisma.$transaction(async (tx) => {
			// 사용자 생성
			const newUser = await tx.user.create({
				data: {
					loginId: userData.loginId,
					password: userData.password,
					nickname: userData.nickname,
					statusNote: userData.statusNote,
					profile: userData.profile,
				},
				select: publicUserSelect
			});

			// 반려동물 생성
			const newPet = await tx.pet.create({
				data: {
					userId: newUser.id,
					name: petData.name,
					birthDate: petData.birthDate,
					gender: petData.gender,
					profile: petData.profile,
				}
			});

			return { user: newUser, pet: newPet };
		});

		console.log(`✅ 사용자 및 반려동물 생성 완료 (User ID: ${result.user.id})`);
		return result;
		
	} catch (error) {
		console.error('회원가입 실패:', error);
		
		// DB 저장 실패 시 업로드된 파일들 정리
		if (uploadedFiles.length > 0) {
			console.log('업로드된 파일들 정리 중...');
			try {
				await storageRepository.deleteMultipleFiles(uploadedFiles);
				console.log('업로드된 파일들 정리 완료');
			} catch (cleanupError) {
				console.error('파일 정리 실패:', cleanupError);
			}
		}
		
		throw error;
	}
};

module.exports = {
	findAll,
	findByLoginId,
	findByNickname,
	findById,
	findByIdIncludeRefreshToken,
	findByLoginIdWithPassword,
	create,
	update,
	updateRefreshToken,
	deleteById,
	existsByLoginId,
	// 로그인 플로우 관련
	createUserWithPet,
	// SAS URL 리프레시 관련 (내부용)
	refreshUserProfileIfExpired
}; 