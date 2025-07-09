const router = require('express').Router();
const usersServices = require('../services/usersServices');
const jwt = require('jsonwebtoken');
const authServices = require('../services/authServices');
const upload = require('../middlewares/upload');

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: 로그인
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: 로그인 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 * 
 * /api/auth/check-loginid:
 *   post:
 *     summary: 아이디 중복 확인
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - loginId
 *             properties:
 *               loginId:
 *                 type: string
 *                 example: "user123"
 *     responses:
 *       200:
 *         description: 사용 가능한 아이디
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CheckLoginIdResponse'
 *       409:
 *         description: 이미 사용 중인 아이디
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CheckLoginIdResponse'
 * 
 * /api/auth/register:
 *   post:
 *     summary: 회원가입
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - loginId
 *               - password
 *               - nickname
 *               - petName
 *               - petGender
 *             properties:
 *               loginId:
 *                 type: string
 *               password:
 *                 type: string
 *               nickname:
 *                 type: string
 *               statusNote:
 *                 type: string
 *               profileImage:
 *                 type: string
 *                 format: binary
 *               petName:
 *                 type: string
 *               petBirthDate:
 *                 type: string
 *                 format: date
 *               petGender:
 *                 type: string
 *                 enum: [male, female]
 *     responses:
 *       201:
 *         description: 회원가입 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RegisterResponse'
 * 
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
 *               $ref: '#/components/schemas/JwtTokenResponse'
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
 *             $ref: '#/components/schemas/JwtTokenRefreshRequest'
 *     responses:
 *       200:
 *         description: 갱신된 JWT 토큰
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JwtTokenResponse'
 *       400:
 *         description: 유효하지 않은 토큰
 *       500:
 *         description: 서버 오류
 */

// POST /api/auth/login - 로그인
router.post('/login', async (req, res) => {
	try {
		const { loginId, password } = req.body;
		// 사용자 인증
		const user = await usersServices.authenticateUser(loginId, password);

		// 토큰 생성
		const { refreshToken, accessToken } = await authServices.generateTokens(user.id);

		// 성공 응답
		res.json({
			code: 200,
			message: "로그인이 완료되었습니다.",
			result: {
				user: {
					id: user.id,
					loginId: user.loginId,
					nickname: user.nickname,
					statusNote: user.statusNote,
					profile: user.profile
				},
				tokens: {
					accessToken,
					refreshToken
				}
			}
		});

	} catch (error) {
		console.error('로그인 오류:', error);
		// 서버 오류
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message || 'Internal server error',
			result: null
		});
	}
});

// POST /api/auth/check-loginid - 아이디 중복 확인
router.post('/check-loginid', async (req, res) => {
	try {
		const { loginId } = req.body;

		// 중복 확인
		const exists = await usersServices.checkLoginIdExists(loginId);
		
		if (exists) {
			return res.status(409).json({
				code: 400,
				message: "이미 사용 중인 아이디입니다.",
				result: { available: false }
			});
		}
		// 사용 가능
		res.json({
			code: 200,
			message: "사용 가능한 아이디입니다.",
			result: { available: true }
		});

	} catch (error) {
		console.error('아이디 중복 확인 오류:', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message || 'Internal server error',
			result: null
		});
	}
});

// POST /api/auth/register - 회원가입
router.post('/register', upload.fields([
	{ name: 'profileImage', maxCount: 1 },
]), async (req, res) => {
	try {
		const {
			loginId,
			password,
			nickname,
			statusNote,
			petName,
			petBirthDate,
			petGender
		} = req.body;

		// 필수 입력값 검증
		if (!loginId || !password || !nickname || !petName || !petGender) {
			return res.status(400).json({
				code: 400,
				message: '필수 정보를 모두 입력해주세요',
				result: null
			});
		}

		// 아이디 중복 확인
		const exists = await usersServices.checkLoginIdExists(loginId);
		if (exists) {
			return res.status(409).json({
				code: 400,
				message: '이미 사용 중인 아이디입니다',
				result: null
			});
		}

		// 파일 정리 (multipart에서 배열로 오므로 단일 파일로 변환)
		const files = {
			profileImage: req.files?.profileImage?.[0],
		};

		// 회원가입 처리 (사용자 + 반려동물 정보 + 프로필 이미지 업로드)
		const result = await usersServices.registerUserWithPet({
			// 사용자 정보
			loginId,
			password,
			nickname,
			statusNote: statusNote || null,
			// 반려동물 정보
			pet: {
				name: petName,
				birthDate: petBirthDate ? new Date(petBirthDate) : null,
				gender: petGender
			}
		}, files);

		// 토큰 생성
		const { refreshToken, accessToken } = await authServices.generateTokens(result.user.id);

		// 성공 응답
		res.status(201).json({
			code: 200,
			message: "회원가입이 완료되었습니다.",
			result: {
				user: {
					id: result.user.id,
					loginId: result.user.loginId,
					nickname: result.user.nickname,
					statusNote: result.user.statusNote,
					profile: result.user.profile
				},
				pet: {
					id: result.pet.id,
					name: result.pet.name,
					birthDate: result.pet.birthDate,
					gender: result.pet.gender,
					profile: result.pet.profile
				},
				tokens: {
					accessToken,
					refreshToken
				}
			}
		});

	} catch (error) {
		console.error('회원가입 오류:', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message || 'Internal server error',
			result: null
		});
	}
});

// 테스트용 토큰 발급 API
router.get('/test-token', async (req, res) => {
	try {
		const { id } = req.query;
		const { refreshToken, accessToken } = await authServices.generateTokens(id);

		res.json({
			code: 200,
			message: "테스트 토큰이 발급되었습니다.",
			result: { refreshToken, accessToken }
		});
	} catch (error) {
		console.error('Error generating test token:', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message || 'Internal server error',
			result: null
		});
	}
});

router.post('/refresh-token', async (req, res) => {
	try {
		const { refreshToken } = req.body;
		const { newRefreshToken, newAccessToken } = await authServices.refreshToken(refreshToken);
		
		res.json({
			code: 200,
			message: "토큰이 갱신되었습니다.",
			result: { refreshToken: newRefreshToken, accessToken: newAccessToken }
		});
	} catch (error) {
		console.error('Error refreshing token:', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode === 402 ? statusCode : (statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500)),
			message: error.message || 'Internal server error',
			result: null
		});
	}
});

module.exports = router;