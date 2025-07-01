const jwt = require('jsonwebtoken');
const membersServices = require('./membersServices');

const generateTokens = async (id) => {
	if (!id) {
		const error = new Error('User ID must be provided as a query parameter.');
		error.statusCode = 404;
		throw error;
	}

	const member = await membersServices.findById(id);

	if (!member) {
		const error = new Error(`Member with id ${id} not found.`);
		error.statusCode = 404;
		throw error;
	}

	if (!process.env.JWT_SECRET) {
		const error = new Error('JWT_SECRET is not set in environment variables.');
		error.statusCode = 500;
		throw error;
	}

	const refreshToken = jwt.sign(
		{ id: parseInt(member.id, 10), type: 'refresh' }, 
		process.env.JWT_SECRET, 
		{ expiresIn: '1d',}
	);

	const accessToken = jwt.sign(
		{ id: parseInt(member.id, 10), type: 'access'}, 
		process.env.JWT_SECRET, 
		{ expiresIn: '1h',}
	);
	
	await membersServices.update(member.id, { refresh_token: refreshToken });
	
	return { refreshToken, accessToken };
}

const refreshToken = async (refreshToken) => {
	const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
	const member = await membersServices.findById(decoded.id);
	
	if (!member) {
		const error = new Error(`Member with id ${decoded.id} not found.`);
		error.statusCode = 404;
		throw error;
	}
	
	if (decoded.type !== 'refresh') {
		const error = new Error('Invalid token type. An access token is required.');
		error.statusCode = 401;
		throw error;
	}
	
	if (member.refresh_token !== refreshToken) {
		const error = new Error('Invalid refresh token.');
		error.statusCode = 401;
		throw error;
	}
	
	const newRefreshToken = jwt.sign(
		{ id: parseInt(member.id, 10), type: 'refresh' }, 
		process.env.JWT_SECRET,
		{ expiresIn: '1d' }
	);
	
	const newAccessToken = jwt.sign(
		{ id: parseInt(member.id, 10), type: 'access' }, 
		process.env.JWT_SECRET,
		{ expiresIn: '1d' }
	);
	await membersServices.update(member.id, { refresh_token: newRefreshToken });
	
	return { newRefreshToken, newAccessToken };
}

module.exports = {
	generateTokens,
	refreshToken,
}