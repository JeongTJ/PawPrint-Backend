const router = require('express').Router();
const membersServices = require('../services/membersServices');
const jwt = require('jsonwebtoken');
const authServices = require('../services/authServices');

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
 *               $ref: '#/components/schemas/Auth'
 *       400:
 *         description: 쿼리 파라미터에 id가 없는 경우
 *       404:
 *         description: 해당 id의 사용자를 찾을 수 없는 경우
 *       500:
 *         description: 서버 오류 또는 JWT_SECRET이 설정되지 않은 경우
 * 
 * /api/auth/refresh-token:
 *   post:
 *     summary: 토큰 리프레시
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthRefresh'
 *     responses:
 *       200:
 *         description: 발급된 JWT 토큰
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Auth'
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
		const { refreshToken, accessToken } = await authServices.generateTokens(id);

		res.json({ refreshToken, accessToken });
	} catch (error) {
		console.error('Error generating test token:', error);
		res.status(error.statusCode || 500).json({ error: error.message || 'Internal server error' });
	}
});

router.post('/refresh-token', async (req, res) => {
	try {
		const { refreshToken } = req.body;
		const { newRefreshToken, newAccessToken } = await authServices.refreshToken(refreshToken);
		
		res.json({ refreshToken: newRefreshToken, accessToken: newAccessToken });
	} catch (error) {
		console.error('Error refreshing token:', error);
		res.status(error.statusCode || 500).json({ error: error.message || 'Internal server error' });
	}
});

module.exports = router;