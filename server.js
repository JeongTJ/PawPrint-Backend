const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerSpec = require('./docs/swagger');
const { requestLoggingMiddleware } = require('./middlewares/logging');
const { connectDatabase, disconnectDatabase } = require('./config/dbConfig');
const { logger } = require('./config/logger');
const { startScheduler, stopScheduler } = require('./services/planScheduler');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS 설정
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// 미들웨어 설정
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 로그 설정 (깔끔한 HTTP 요청 로그만)
app.use(requestLoggingMiddleware);

// Swagger 설정
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 라우터 설정
app.use('/api', require('./controllers'));

// 기본 라우트
app.get('/', (req, res) => {
  res.json({
    message: 'PawPrint Backend Server',
    version: '1.0.0',
    features: {
      database: 'PostgreSQL + Prisma',
      swagger: '/api-docs'
    }
  });
});

// 404 에러 핸들러
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API 엔드포인트를 찾을 수 없습니다.',
    path: req.originalUrl
  });
});

// 전역 에러 핸들러
app.use((err, req, res, next) => {
  logger.error('서버 에러:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || '내부 서버 오류가 발생했습니다.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 서버 시작
async function startServer() {
  try {
    console.log('🚀 서버 시작 중...');
    
    // 데이터베이스 연결
    console.log('🔌 데이터베이스 연결 중...');
    await connectDatabase();
    
    // 서버 시작
    const server = app.listen(PORT, () => {
      console.log('✅ 서버 시작 완료!');
      console.log(`🌐 서버 주소: http://localhost:${PORT}`);
      console.log(`📚 API 문서: http://localhost:${PORT}/api-docs`);
      
      // 계획 알림 스케줄러 시작
      console.log('📅 계획 알림 스케줄러 시작 중...');
      startScheduler();
    });
    
    // Graceful shutdown 처리
    const shutdown = async (signal) => {
      console.log(`\n🛑 ${signal} 신호를 받았습니다. 서버를 종료합니다...`);
      
      // 새로운 연결 차단
      server.close(async () => {
        console.log('📪 HTTP 서버 종료');
        
        try {
          // 스케줄러 종료
          console.log('📅 계획 알림 스케줄러 종료 중...');
          stopScheduler();
          
          // 데이터베이스 연결 종료
          await disconnectDatabase();
          
          console.log('✅ 서버 종료 완료');
          process.exit(0);
        } catch (error) {
          console.error('❌ 서버 종료 중 오류:', error);
          process.exit(1);
        }
      });
      
      // 강제 종료 타이머 (10초)
      setTimeout(() => {
        console.error('⏰ 강제 종료 타이머 실행');
        process.exit(1);
      }, 10000);
    };
    
    // 시그널 핸들러 등록
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // 예외 처리
    process.on('uncaughtException', (error) => {
      console.error('💥 처리되지 않은 예외:', error);
      process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 처리되지 않은 Promise 거부:', reason);
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ 서버 시작 실패:', error);
    process.exit(1);
  }
}

// 서버 시작
startServer();