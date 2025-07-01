const express = require('express');
// const morgan  = require('morgan');
// const cors    = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');
const { initSchema, databaseCheck } = require('./config/dbConfig');

const app  = express();
const port = process.env.PORT || 8000;

// ── 공통 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── /api 프리픽스 라우터
const apiRouter = require('./controllers');
app.use('/api', apiRouter);

// ── Swagger UI 엔드포인트
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ── (선택) 전역 에러 핸들러
app.use((err, req, res, next) => {
	console.error(err);
	res.status(500).json({ message: '서버 오류' });
});

async function main() {
	app.listen(port, () => console.log(`${port}번 포트에서 대기 중!`));
	await databaseCheck();
	await initSchema();
}

main();