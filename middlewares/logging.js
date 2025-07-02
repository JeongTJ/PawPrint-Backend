const { logRequest, logError } = require('../config/logger');

// HTTP 요청 로깅 미들웨어
const requestLoggingMiddleware = (req, res, next) => {
	const startTime = Date.now();
	
	// 응답이 끝나면 로깅
	res.on('finish', () => {
		const responseTime = Date.now() - startTime;
		const statusCode = res.statusCode;
		logRequest(req, res, responseTime, statusCode);
	});
	
	next();
};

// 에러 로깅 미들웨어 (전역 에러 핸들러에서 사용)
const errorLoggingMiddleware = (err, req, res, next) => {
	// 에러 로깅
	logError(err, req, {
		requestBody: req.body,
		requestParams: req.params,
		requestQuery: req.query
	});
	
	next(err);
};

// 성공적인 로그인 로깅
const logSuccessfulLogin = (req, loginId) => {
	const { logger } = require('../config/logger');
	logger.info('Successful Login', {
		loginId,
		ip: req.ip || req.connection.remoteAddress,
		userAgent: req.get('User-Agent'),
		timestamp: new Date().toISOString()
	});
};

// 실패한 로그인 로깅
const logFailedLogin = (req, loginId, reason) => {
	const { logger } = require('../config/logger');
	logger.warn('Failed Login Attempt', {
		loginId,
		reason,
		ip: req.ip || req.connection.remoteAddress,
		userAgent: req.get('User-Agent'),
		timestamp: new Date().toISOString()
	});
};

// 민감한 행동 로깅 (게시물 삭제, 회원 정보 수정 등)
const logSensitiveAction = (req, action, targetId = null) => {
	const { logger } = require('../config/logger');
	logger.warn('Sensitive Action', {
		userId: req.user?.id,
		loginId: req.user?.loginId,
		action,
		targetId,
		url: req.originalUrl,
		method: req.method,
		ip: req.ip || req.connection.remoteAddress,
		userAgent: req.get('User-Agent'),
		timestamp: new Date().toISOString()
	});
};

module.exports = {
	requestLoggingMiddleware,
	errorLoggingMiddleware,
	logSuccessfulLogin,
	logFailedLogin,
	logSensitiveAction
}; 