const usersRepository = require('../repository/usersRepository');
const bcrypt = require('bcrypt');

// 모든 사용자 찾기
const findAll = async () => {
	return await usersRepository.findAll();
};

const create = async (userData) => {
	const saltRounds = 10;
	// salt 생성
	const salt = await bcrypt.genSalt(saltRounds);
	// hash
	userData.password = await bcrypt.hash(userData.password, salt);
	return await usersRepository.create(userData);
};

const update = async (id, userData) => {
	const user = await usersRepository.update(id, userData);
	
	if (!user) {
		const error = new Error(`User with id ${id} not found.`);
		error.statusCode = 404;
		throw error;
	}
	return user;

}

const findById = async (id) => {
	const user = await usersRepository.findById(id);

	if (!user) {
		const error = new Error(`User with id ${id} not found.`);
		error.statusCode = 404;
		throw error;
	}
	return user;
};

const findByLoginId = async (loginId) => {
	const user = await usersRepository.findByLoginId(loginId);
	return user;
};

// ========== 로그인 플로우 관련 함수들 ==========

// 사용자 인증 (로그인)
const authenticateUser = async (loginId, password) => {
	if (!loginId || !password) {
		const error = new Error('아이디와 비밀번호를 입력해주세요');
		error.statusCode = 400;
		throw error;
	}

	const user = await usersRepository.findByLoginIdWithPassword(loginId);

	if (!user) {
		const error = new Error('아이디 또는 비밀번호가 올바르지 않습니다');
		error.statusCode = 401;
		throw error;
	}

	// 비밀번호 확인
	const isValidPassword = await bcrypt.compare(password, user.password);
	if (!isValidPassword) {
		const error = new Error('아이디 또는 비밀번호가 올바르지 않습니다');
		error.statusCode = 401;
		throw error;
	}

	// 비밀번호 제거한 사용자 정보 반환
	const { password: _, ...userWithoutPassword } = user;
	return userWithoutPassword;
};

// 아이디 중복 확인
const checkLoginIdExists = async (loginId) => {
	// 입력값 검증
	if (!loginId) {
		const error = new Error('아이디를 입력해주세요');
		error.statusCode = 400;
		throw error;
	}
	
	// 아이디 길이 검증 (4-20자)
	if (loginId.length < 4 || loginId.length > 20) {
		const error = new Error('아이디는 4~20자 사이로 입력해주세요');
		error.statusCode = 400;
		throw error;
	}

	const user = await usersRepository.findByLoginId(loginId);
	return !!user; // boolean 반환
};

// 회원가입 (사용자 + 반려동물 정보 + 프로필 이미지 업로드)
const registerUserWithPet = async (registerData, files = {}) => {
	const { pet, ...userData } = registerData;

	// 비밀번호 해싱
	const saltRounds = 10;
	const salt = await bcrypt.genSalt(saltRounds);
	userData.password = await bcrypt.hash(userData.password, salt);

	// Repository에서 파일 업로드와 DB 저장을 트랜잭션으로 처리
	return await usersRepository.createUserWithPet(userData, pet, files);
};

module.exports = { 
	findAll, 
	create, 
	update, 
	findByLoginId, 
	findById,
	// 로그인 플로우 관련
	authenticateUser,
	checkLoginIdExists,
	registerUserWithPet
}; 