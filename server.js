const express = require('express');
// const morgan  = require('morgan');
// const cors    = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');
const { connectDatabase, disconnectDatabase } = require('./config/dbConfig');

// BigInt 직렬화 처리
BigInt.prototype.toJSON = function() {
	return this.toString();
};

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
	try {
		// 데이터베이스 연결
		await connectDatabase();
		
		// 서버 시작
		const server = app.listen(port, () => {
			console.log(`🚀 서버가 ${port}번 포트에서 실행 중입니다!`);
			console.log(`📖 API 문서: http://localhost:${port}/api-docs`);
		});

		// Graceful shutdown 설정
		const gracefulShutdown = async (signal) => {
			console.log(`\n${signal} 신호를 받았습니다. 서버를 안전하게 종료합니다...`);
			
			server.close(async () => {
				console.log('HTTP 서버가 종료되었습니다.');
				await disconnectDatabase();
				process.exit(0);
			});
		};

		// 시그널 핸들러 등록
		process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
		process.on('SIGINT', () => gracefulShutdown('SIGINT'));

	} catch (error) {
		console.error('❌ 서버 시작 실패:', error);
		process.exit(1);
	}
}

main();