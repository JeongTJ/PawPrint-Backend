const membersRepository = require('../repository/membersRepository');
const bcrypt = require('bcrypt');

// 모든 회원 찾기
const findAll = async () => {
	return await membersRepository.findAll();
};

const create = async (memberData) => {
	const saltRounds = 10;
	// salt 생성
	const salt = await bcrypt.genSalt(saltRounds);
	// hash
	memberData.password = await bcrypt.hash(memberData.password, salt);
	return await membersRepository.create(memberData);
};

const update = async (id, memberData) => {
	return await membersRepository.update(id, memberData);
}

const findById = async (id) => {
	const member = await membersRepository.findById(id);
	return member;
};

const findByUserId = async (user_id) => {
	const member = await membersRepository.findByUserId(user_id);
	return member;
};

module.exports = { 
	findAll, 
	create, 
	update, 
	findByUserId, 
	findById 
};