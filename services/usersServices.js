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

module.exports = { 
	findAll, 
	create, 
	update, 
	findByLoginId, 
	findById 
}; 