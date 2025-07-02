const express = require('express');
// const morgan  = require('morgan');
const cors    = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');
const { connectDatabase, disconnectDatabase } = require('./config/dbConfig');
const { requestLoggingMiddleware, errorLoggingMiddleware } = require('./middlewares/logging');
const { logger } = require('./config/logger');
const fs = require('fs');
const path = require('path');

// BigInt 직렬화 처리
// BigInt.prototype.toJSON = function() {
// 	return this.toString();
// };

const app  = express();
const port = process.env.PORT || 8000;

// 로그 디렉토리 생성 (프로덕션에서만)
if (process.env.NODE_ENV === 'production') {
	const logDir = path.join(__dirname, 'logs');
	if (!fs.existsSync(logDir)) {
		fs.mkdirSync(logDir, { recursive: true });
	}
}

// ── 공통 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// // ── CORS 설정 (Flutter 웹 앱 지원)
// const corsOptions = {
//   origin: function (origin, callback) {
//     // 개발 환경에서는 모든 origin 허용
//     if (process.env.NODE_ENV === 'development') {
//       return callback(null, true);
//     }
    
//     // 프로덕션에서는 특정 도메인만 허용
//     const allowedOrigins = [
//       'https://your-flutter-web-domain.com',  // 실제 Flutter 웹 도메인으로 변경
//       'http://localhost:3000',  // Flutter 웹 개발 서버
//       'http://localhost:8080',  // Flutter 웹 대체 포트
//     ];
    
//     if (!origin || allowedOrigins.includes(origin)) {
//       return callback(null, true);
//     }
    
//     callback(new Error('CORS 정책에 의해 차단되었습니다.'));
//   },
//   credentials: true,  // 쿠키 및 인증 헤더 허용
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
// };

// app.use(cors(corsOptions));

// ── 요청 로깅 미들웨어 (가장 먼저 적용)
app.use(requestLoggingMiddleware);

// ── /api 프리픽스 라우터
const apiRouter = require('./controllers');
app.use('/api', apiRouter);

// ── Swagger UI 엔드포인트
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ── 에러 로깅 미들웨어 + 전역 에러 핸들러
app.use(errorLoggingMiddleware);
app.use((err, req, res, next) => {
	// 에러가 이미 로깅된 상태이므로 응답만 처리
	const statusCode = err.statusCode || 500;
	res.status(statusCode).json({ 
		message: statusCode === 500 ? '서버 오류' : err.message 
	});
});

async function main() {
	try {
		// 데이터베이스 연결
		await connectDatabase();
		logger.info('Database connection established');
		
		// 서버 시작
		const server = app.listen(port, () => {
			console.log(`🚀 서버가 ${port}번 포트에서 실행 중입니다!`);
			console.log(`📖 API 문서: http://localhost:${port}/api-docs`);
			logger.info('Server Started', { 
				port, 
				environment: process.env.NODE_ENV || 'development' 
			});
		});

		// Graceful shutdown 설정
		const gracefulShutdown = async (signal) => {
			console.log(`\n${signal} 신호를 받았습니다. 서버를 안전하게 종료합니다...`);
			logger.info(`Graceful shutdown initiated`, { signal });
			
			server.close(async () => {
				console.log('HTTP 서버가 종료되었습니다.');
				await disconnectDatabase();
				logger.info('Server shutdown completed');
				process.exit(0);
			});
		};

		// 시그널 핸들러 등록
		process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
		process.on('SIGINT', () => gracefulShutdown('SIGINT'));

	} catch (error) {
		console.error('❌ 서버 시작 실패:', error);
		logger.error('Server startup failed', { 
			error: error.message, 
			stack: error.stack 
		});
		process.exit(1);
	}
}

main();