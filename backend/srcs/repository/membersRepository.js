const { pool } = require('../config/psqlConfig');

// 모든 회원 찾기
const findAll = async () => {
	const { rows } = await pool.query('SELECT * FROM members ORDER BY id ASC');
	return rows;
};

// 특정 회원 id로 찾기
const findByUserId = async (user_id) => {
	const { rows } = await pool.query('SELECT * FROM members WHERE user_id = $1', [user_id]);
	return rows[0];
};

// 특정 회원 db id로 찾기
const findById = async (id) => {
	const { rows } = await pool.query('SELECT * FROM members WHERE id = $1', [id]);
	return rows[0];
};

// 특정 회원 생성
const create = async (memberData) => {
	const { user_id, name, email, password } = memberData;

	const { rows } = await pool.query(
		'INSERT INTO members (user_id, name, email, password) VALUES ($1, $2, $3, $4) RETURNING *',
		[user_id, name, email, password]
	);
	delete rows[0].password;
	return rows[0];
};

// 특정 회원 이메일로 찾기
const findByEmail = async (email) => {
	const { rows } = await pool.query('SELECT * FROM members WHERE email = $1', [email]);
	return rows[0];
};

// 특정 회원 정보 업데이트
const update = async (id, memberData) => {
	const { name, profile, status_note, refresh_token } = memberData;
	const { rows } = await pool.query(
		`UPDATE members 
		SET 
			name = COALESCE($1, name),
			profile = COALESCE($2, profile), 
			status_note = COALESCE($3, status_note), 
			refresh_token = COALESCE($4, refresh_token), 
			updated_at = now() 
		WHERE id = $5 
		RETURNING *`,
		[name, profile, status_note, refresh_token, id]
	);
	delete rows[0].password;
	return rows[0];
};

module.exports = {
	findAll,
	findByUserId,
	findById,
	create,
	update,
};