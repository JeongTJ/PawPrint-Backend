const { Pool } = require('pg');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

const pool = new Pool({
	user: process.env.DB_USER,
	host: process.env.DB_HOST,
	database: process.env.DB_NAME,
	password: process.env.DB_PASSWORD,
	port: process.env.DB_PORT,
});

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1초

// 1초 대기하는 헬퍼 함수
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


async function initSchema() {
	const sql = await readFile(path.join(__dirname, '/sql/01_schema.sql'), 'utf8');
	await pool.query(sql);     // 여러 스테이트먼트 한번에 실행
	console.log('✅ Schema ready');
}

async function databaseCheck() {
	for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
		try {
			console.log(`[Attempt ${attempt}/${MAX_RETRIES}] Connecting to database...`);
			
			const sqlSeed = await readFile(path.join(__dirname, '/sql/02_seed.sql'), 'utf8');
			await pool.query(sqlSeed);
			
			console.log('✅ Database ready');
			return; // 성공 시 함수 종료
			
		} catch (error) {
			console.error(`❌ Attempt ${attempt} failed:`, error.message);
			
			if (attempt < MAX_RETRIES) {
				console.log(`Retrying in ${RETRY_DELAY / 1000} second(s)...`);
				await delay(RETRY_DELAY); // 다음 시도 전 1초 대기
			} else {
				console.error('❌ Database check failed after all retries.');
				// 모든 재시도 실패 시 프로세스 종료 또는 다른 에러 처리
				process.exit(1); 
			}
		}
	}
}

module.exports = { pool, initSchema, databaseCheck };