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
	const user = await usersRepository.findByLoginIdWithPassword(loginId);
	
	if (!user) {
		const error = new Error('INVALID_CREDENTIALS');
		error.statusCode = 401;
		throw error;
	}

	// 비밀번호 확인
	const isValidPassword = await bcrypt.compare(password, user.password);
	if (!isValidPassword) {
		const error = new Error('INVALID_CREDENTIALS');
		error.statusCode = 401;
		throw error;
	}

	// 비밀번호 제거한 사용자 정보 반환
	const { password: _, ...userWithoutPassword } = user;
	return userWithoutPassword;
};

// 아이디 중복 확인
const checkLoginIdExists = async (loginId) => {
	const user = await usersRepository.findByLoginId(loginId);
	return !!user; // boolean 반환
};

// 회원가입 (사용자 + 반려동물 정보)
const registerUserWithPet = async (registerData) => {
	const { pet, ...userData } = registerData;
	
	// 비밀번호 해싱
	const saltRounds = 10;
	const salt = await bcrypt.genSalt(saltRounds);
	userData.password = await bcrypt.hash(userData.password, salt);
	
	// 트랜잭션으로 사용자와 반려동물 정보 동시 생성
	return await usersRepository.createUserWithPet(userData, pet);
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