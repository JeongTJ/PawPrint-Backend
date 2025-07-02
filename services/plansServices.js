const plansRepository = require('../repository/plansRepository');

const findAll = async () => {
	return await plansRepository.findAll();
};

const create = async (planData) => {
	return await plansRepository.create(planData);
};

const update = async (id, planData) => {
	return await plansRepository.update(id, planData);
}

const findById = async (id) => {
	const plan = await plansRepository.findById(id);
	return plan;
};

module.exports = { findAll, create, update, findById };