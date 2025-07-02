const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
	const authHeader = req.headers.authorization;

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res.status(401).json({
			code: 401,
			message: 'Authentication token required.',
			result: null
		});
	}

	const token = authHeader.split(' ')[1];
	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		if (decoded.type === 'access') {
			req.user = decoded;
		} else if (decoded.type === 'refresh') {
			throw new Error();
		}
	} catch (error) {
		return res.status(401).json({
			code: 401,
			message: 'Invalid or expired token.',
			result: null
		});
	}
	next();
};

module.exports = {
	authMiddleware
};