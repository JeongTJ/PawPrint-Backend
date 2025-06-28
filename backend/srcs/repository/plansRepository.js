const { pool } = require('../config/psqlConfig');

// 모든 계획 조회 (Read)
const findAll = async () => {
	const { rows } = await pool.query('SELECT * FROM plans ORDER BY id ASC');
	return rows;
};

// 특정 계획 조회 (Read)
const findById = async (id) => {
	const { rows } = await pool.query('SELECT * FROM plans WHERE id = $1', [id]);
	return rows[0]; // 찾으면 객체, 없으면 undefined 반환
};

// 새 계획 생성 (Create)
const create = async (planData) => {
	console.log(planData);
	const { title, date } = planData;
	const { rows } = await pool.query(
		'INSERT INTO plans (title, date) VALUES ($1, $2) RETURNING *',
		[title, date]
	);
	return rows[0];
};

// 계획 수정 (Update)
const update = async (id, planData) => {
	const { title, date } = planData;
	const { rows } = await pool.query(
		'UPDATE plans SET title = $1, date = $2 WHERE id = $3 RETURNING *',
		[title, date, id]
	);
	return rows[0];
};

// 계획 삭제 (Delete)
const remove = async (id) => {
	const { rowCount } = await pool.query('DELETE FROM plans WHERE id = $1', [id]);
	return rowCount; // 삭제된 행의 수 (0 또는 1)
};

module.exports = {
	findAll,
	findById,
	create,
	update,
	remove,
};
