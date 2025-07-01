const contentsRepository = require('../repository/contentsRepository');

// 모든 게시물 찾기
const findAll = async () => {
	return await contentsRepository.findAll();
};

const create = async (contentData) => {
	return await contentsRepository.create(contentData);
};

const update = async (id, contentData) => {
	const content = await contentsRepository.update(id, contentData);
	
	if (!content) {
		const error = new Error(`Content with id ${id} not found.`);
		error.statusCode = 404;
		throw error;
	}
	return content;

}

const deleteById = async (id, member_id) => {
	const content = await contentsRepository.findById(id);

	if (!content) {
		const error = new Error(`Content with id ${id} not found.`);
		error.statusCode = 404;
		throw error;
	}

	if (parseInt(content.member_id) !== parseInt(member_id)) {	
		const error = new Error(`You are not authorized to delete this content.`);
		error.statusCode = 403;
		throw error;
	}

	return await contentsRepository.deleteById(id, member_id);
}

const findById = async (id) => {
	const content = await contentsRepository.findById(id);

	if (!content) {
		const error = new Error(`Content with id ${id} not found.`);
		error.statusCode = 404;
		throw error;
	}
	return content;
};

const findByType = async (content_type) => {
	const content = await contentsRepository.findByType(content_type);
	return content;
};

module.exports = { 
	findAll, 
	create, 
	update, 
	deleteById,
	findByType, 
	findById 
};