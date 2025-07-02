const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// Prisma Client 인스턴스 생성
const prisma = new PrismaClient({
	log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
	errorFormat: 'pretty',
});

// 데이터베이스 연결 테스트
async function connectDatabase() {
	try {
		console.log('🔌 데이터베이스 연결 중...');
		
		// 연결 테스트
		await prisma.$connect();
		console.log('✅ 데이터베이스 연결 성공');
		
		// 간단한 쿼리로 연결 확인
		const userCount = await prisma.user.count();
		console.log(`📊 현재 회원 수: ${userCount}`);
		
	} catch (error) {
		console.error('❌ 데이터베이스 연결 실패:', error);
		process.exit(1);
	}
}

// 애플리케이션 종료 시 연결 정리
async function disconnectDatabase() {
	await prisma.$disconnect();
	console.log('🔌 데이터베이스 연결 해제');
}

// 기존 코드와의 호환성을 위한 pool 객체 (사용 안 함)
const pool = {
	query: () => {
		throw new Error('pool.query()는 더 이상 사용되지 않습니다. Prisma Client를 사용하세요.');
	},
	connect: () => {
		throw new Error('pool.connect()는 더 이상 사용되지 않습니다. Prisma Client를 사용하세요.');
	}
};

// 환경별 설정 정보 (참고용)
const config = {
	development: {
		database: 'PostgreSQL (로컬)',
		orm: 'Prisma',
	},
	production: {
		database: 'Supabase PostgreSQL',
		orm: 'Prisma',
	}
};

console.log(`🛠️ 환경: ${process.env.NODE_ENV || 'development'}`);
console.log(`🏭 데이터베이스: ${config[process.env.NODE_ENV || 'development'].database}`);

module.exports = { 
	prisma, 
	connectDatabase, 
	disconnectDatabase,
	pool // 기존 코드 호환성용 (사용 시 에러 발생)
};