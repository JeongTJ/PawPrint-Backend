const winston = require('winston');
const path = require('path');

// 로그 디렉토리 생성
const logDir = 'logs';

// 콘솔 출력 포맷
const consoleFormat = winston.format.combine(
	winston.format.timestamp({ format: 'HH:mm:ss' }),
	winston.format.colorize(),
	winston.format.printf(({ timestamp, level, message, ...meta }) => {
		let logMessage = `${timestamp} [${level}]: ${message}`;
		
		// 사용자 행동 로그를 더 읽기 쉽게 포맷팅
		if (message === 'User Action' && meta.userId && meta.action) {
			const { userId, action, contentId, contentType, url, method } = meta;
			logMessage = `${timestamp} [${level}]: 👤 User ${userId} → ${action}`;
			if (contentId) logMessage += ` (Content: ${contentId})`;
			if (contentType) logMessage += ` [${contentType}]`;
			if (url) logMessage += ` ${method} ${url}`;
		}
		// 민감한 행동 로그
		else if (message === 'Sensitive Action' && meta.userId && meta.action) {
			const { userId, loginId, action, targetId, url, method } = meta;
			logMessage = `${timestamp} [${level}]: ⚠️  ${loginId || userId} → ${action}`;
			if (targetId) logMessage += ` (Target: ${targetId})`;
			if (url) logMessage += ` ${method} ${url}`;
		}
		// 기타 메타데이터가 있으면 간단히 포함
		else if (Object.keys(meta).length > 0 && Object.keys(meta).length <= 3) {
			const simpleFields = ['port', 'environment', 'signal', 'error'];
			const relevantMeta = Object.entries(meta)
				.filter(([key]) => simpleFields.includes(key) || meta[key] !== undefined)
				.map(([key, value]) => `${key}: ${value}`)
				.join(', ');
			if (relevantMeta) logMessage += ` (${relevantMeta})`;
		}
		
		return logMessage;
	})
);

// 파일 출력 포맷 (JSON)
const fileFormat = winston.format.combine(
	winston.format.timestamp(),
	winston.format.errors({ stack: true }),
	winston.format.json()
);

// 일반 로그용 파일 트랜스포트
const createFileTransport = (filename, level = 'info') => {
	return new winston.transports.File({
		filename: path.join(logDir, filename),
		format: fileFormat,
		level: level,
		maxsize: 5242880, // 5MB
		maxFiles: 5,
	});
};

// 메인 로거
const logger = winston.createLogger({
	level: process.env.LOG_LEVEL || 'info',
	transports: [
		// 콘솔 출력 (항상)
		new winston.transports.Console({
			format: consoleFormat
		}),
		// 파일 출력 (프로덕션에서만)
		...(process.env.NODE_ENV === 'production' ? [
			createFileTransport('app.log', 'info'),
			createFileTransport('error.log', 'error')
		] : [])
	],
	// 예외 처리 (콘솔 출력)
	exceptionHandlers: [
		new winston.transports.Console({
			format: consoleFormat
		})
	],
	rejectionHandlers: [
		new winston.transports.Console({
			format: consoleFormat
		})
	]
});

// HTTP 요청 전용 로거 (콘솔 출력)
const requestLogger = winston.createLogger({
	transports: [
		new winston.transports.Console({
			format: winston.format.combine(
				winston.format.timestamp({ format: 'HH:mm:ss' }),
				winston.format.colorize(),
				winston.format.printf(({ timestamp, level, message, ...meta }) => {
					const { method, url, statusCode, responseTime, user } = meta;
					const userInfo = user ? `[${user.nickname || user.loginId || user.id || 'User'}]` : '[Guest]';
					return `${timestamp} ${userInfo} ${method} ${url} ${statusCode} ${responseTime}`;
				})
			)
		}),
		// 파일 출력 (프로덕션에서만)
		...(process.env.NODE_ENV === 'production' ? [
			createFileTransport('requests.log')
		] : [])
	]
});

// 로깅 유틸리티
const logRequest = (req, res, responseTime, statusCode) => {
	const logData = {
		timestamp: new Date().toISOString(),
		method: req.method,
		url: req.originalUrl,
		statusCode,
		responseTime: `${responseTime}ms`,
		userAgent: req.get('User-Agent'),
		ip: req.ip || req.connection.remoteAddress,
		// 사용자 정보 (인증된 경우)
		user: req.user ? {
			id: req.user.id,
			loginId: req.user.loginId
		} : null,
		// 요청 바디 (민감한 정보 제외)
		body: sanitizeRequestBody(req.body),
		// 쿼리 파라미터
		query: req.query,
		// 파라미터
		params: req.params
	};
	
	requestLogger.info('HTTP Request', logData);
};

// 민감한 정보를 제거하는 함수
const sanitizeRequestBody = (body) => {
	if (!body || typeof body !== 'object') return body;
	
	const sensitiveFields = ['password', 'token', 'secret', 'key'];
	const sanitized = { ...body };
	
	sensitiveFields.forEach(field => {
		if (sanitized[field]) {
			sanitized[field] = '***HIDDEN***';
		}
	});
	
	return sanitized;
};

// 사용자 행동 로깅
const logUserAction = (userId, action, details = {}) => {
	logger.info('User Action', {
		userId,
		action,
		timestamp: new Date().toISOString(),
		...details
	});
};

// 에러 로깅 (사용자 정보 포함)
const logError = (error, req = null, additionalInfo = {}) => {
	const errorData = {
		message: error.message,
		stack: error.stack,
		timestamp: new Date().toISOString(),
		...additionalInfo
	};
	
	// 요청 정보가 있으면 포함
	if (req) {
		errorData.request = {
			method: req.method,
			url: req.originalUrl,
			ip: req.ip,
			userAgent: req.get('User-Agent'),
			user: req.user ? {
				id: req.user.id,
				loginId: req.user.loginId
			} : null
		};
	}
	
	logger.error('Application Error', errorData);
};

module.exports = {
	logger,
	requestLogger,
	logRequest,
	logUserAction,
	logError
}; 