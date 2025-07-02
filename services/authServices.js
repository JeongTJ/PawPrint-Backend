const jwt = require('jsonwebtoken');
const usersServices = require('./usersServices');

const generateTokens = async (id) => {
	if (!id) {
		const error = new Error('User ID must be provided as a query parameter.');
		error.statusCode = 404;
		throw error;
	}

	const user = await usersServices.findById(id);

	if (!user) {
		const error = new Error(`user with id ${id} not found.`);
		error.statusCode = 404;
		throw error;
	}

	if (!process.env.JWT_SECRET) {
		const error = new Error('JWT_SECRET is not set in environment variables.');
		error.statusCode = 500;
		throw error;
	}

	const refreshToken = jwt.sign(
		{ 
			id: parseInt(user.id, 10), 
			loginId: user.loginId || user.user_id,
			nickname: user.nickname || user.name,
			type: 'refresh' 
		}, 
		process.env.JWT_SECRET, 
		{ expiresIn: '1d',}
	);

	const accessToken = jwt.sign(
		{ 
			id: parseInt(user.id, 10), 
			loginId: user.loginId || user.user_id,
			nickname: user.nickname || user.name,
			type: 'access'
		}, 
		process.env.JWT_SECRET, 
		{ expiresIn: '1h',}
	);
	
	await usersServices.update(user.id, { refresh_token: refreshToken });
	
	return { refreshToken, accessToken };
}

const refreshToken = async (refreshToken) => {
	const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
	const user = await usersServices.findById(decoded.id);
	
	if (!user) {
		const error = new Error(`user with id ${decoded.id} not found.`);
		error.statusCode = 404;
		throw error;
	}
	
	if (decoded.type !== 'refresh') {
		const error = new Error('Invalid token type. An access token is required.');
		error.statusCode = 401;
		throw error;
	}
	
	if (user.refresh_token !== refreshToken) {
		const error = new Error('Invalid refresh token.');
		error.statusCode = 401;
		throw error;
	}
	
	const newRefreshToken = jwt.sign(
		{ 
			id: parseInt(user.id, 10), 
			loginId: user.loginId || user.user_id,
			nickname: user.nickname || user.name,
			type: 'refresh' 
		}, 
		process.env.JWT_SECRET,
		{ expiresIn: '1d' }
	);
	
	const newAccessToken = jwt.sign(
		{ 
			id: parseInt(user.id, 10), 
			loginId: user.loginId || user.user_id,
			nickname: user.nickname || user.name,
			type: 'access' 
		}, 
		process.env.JWT_SECRET,
		{ expiresIn: '1d' }
	);
	await usersServices.update(user.id, { refresh_token: newRefreshToken });
	
	return { newRefreshToken, newAccessToken };
}

module.exports = {
	generateTokens,
	refreshToken,
}