const router = require('express').Router();
const membersServices = require('../services/membersServices');
const jwt = require('jsonwebtoken');

/**
 * @openapi
 * /api/auth/test-token:
 *   get:
 *     summary: 테스트용 토큰 발급
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         description: 토큰을 발급할 사용자의 ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 발급된 JWT 토큰
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNjI5MjgxMjk5LCJleHAiOjE2MjkIjg0ODk5fQ.e_..."
 *       400:
 *         description: 쿼리 파라미터에 id가 없는 경우
 *       404:
 *         description: 해당 id의 사용자를 찾을 수 없는 경우
 *       500:
 *         description: 서버 오류 또는 JWT_SECRET이 설정되지 않은 경우
 */

// router.post('/login', async (req, res) => {
// 	const { email, password } = req.body;
// 	const member = await membersServices.findByEmail(email);
// 	res.json(member);
// });

// 테스트용 토큰 발급 API
router.get('/test-token', async (req, res) => {
	try {
		const { id } = req.query;
		if (!id) {
			return res.status(400).json({ error: 'User ID must be provided as a query parameter.' });
		}

		const member = await membersServices.findById(id);
		if (!member) {
			return res.status(404).json({ error: `Member with id ${id} not found.` });
		}

		if (!process.env.JWT_SECRET) {
			console.error('JWT_SECRET is not set in environment variables.');
			return res.status(500).json({ error: 'JWT secret is not configured.' });
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

		res.json({ refreshToken, accessToken });
	} catch (error) {
		console.error('Error generating test token:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

router.post('/refresh-token', async (req, res) => {
	try {
		const { refreshToken } = req.body;
		const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
		const member = await membersServices.findById(decoded.id);
		if (!member) {
			return res.status(404).json({ error: `Member with id ${decoded.id} not found.` });
		}

		if (member.refresh_token !== refreshToken) {
			return res.status(401).json({ error: 'Invalid refresh token.' });
		}

		const newRefreshToken = jwt.sign(
			{ id: member.id, type: 'refresh' }, 
			process.env.JWT_SECRET,
			{ expiresIn: '1d',}
		);

		const newAccessToken = jwt.sign(
			{ id: member.id, type: 'access' }, 
			process.env.JWT_SECRET,
			{ expiresIn: '1d',}
		);

		res.json({ refreshToken: newRefreshToken });
	} catch (error) {
		console.error('Error refreshing token:', error);
		res.status(500).json({ error: 'Internal Server Error'});
	}
});

module.exports = router;