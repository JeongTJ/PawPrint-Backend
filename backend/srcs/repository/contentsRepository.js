const { pool } = require('../config/psqlConfig');

// 모든 게시물 찾기
const findAll = async () => {
	const { rows } = await pool.query('SELECT * FROM contents ORDER BY id ASC');
	return rows;
};

// 특정 게시물 타입으로 찾기 (qna, community)
const findByType = async (content_type) => {
	const { rows } = await pool.query('SELECT * FROM contents WHERE type = $1', [content_type]);
	return rows[0];
};

// // 특정 회원 db id로 찾기
// const findByMemberId = async (member_id) => {
// 	const { rows } = await pool.query('SELECT * FROM members WHERE id = $1', [id]);
// 	return rows[0];
// };

// 특정 게시물 생성
const create = async (contentData) => {
	const { member_id, content_type, body } = contentData;

	const { rows } = await pool.query(
		'INSERT INTO contents (member_id, type, body) VALUES ($1, $2, $3) RETURNING *',
		[member_id, content_type, body]
	);
	return rows[0];
};

// 특정 회원 이메일로 찾기
const findById = async (id) => {
	const { rows } = await pool.query('SELECT * FROM contents WHERE id = $1', [id]);
	return rows[0];
};

// 특정 회원 정보 업데이트
const update = async (id, contentData) => {
	const { body } = contentData;
	const { rows } = await pool.query(
		`UPDATE contents 
		SET 
		body = COALESCE($1, body), 
		updated_at = now() 
		WHERE id = $2 
		RETURNING *`,
		[body, id]
	);
	return rows[0];
};

const deleteById = async (id, member_id) => {
	const { rows } = await pool.query('DELETE FROM contents WHERE id = $1 AND member_id = $2 RETURNING *', [id, member_id]);
	return rows[0];
};

module.exports = {
	findAll,
	findByType,
	deleteById,
	findById,
	create,
	update,
};