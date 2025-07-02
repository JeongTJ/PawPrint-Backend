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
 *             type: object
 *             required:
 *               - loginId
 *               - password
 *             properties:
 *               loginId:
 *                 type: string
 *                 example: "user123"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: 로그인 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "로그인 성공"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/UserResponse'
 *                     tokens:
 *                       type: object
 *                       properties:
 *                         accessToken:
 *                           type: string
 *                         refreshToken:
 *                           type: string
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
 *       409:
 *         description: 이미 사용 중인 아이디
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
 *               petProfileImage:
 *                 type: string
 *                 format: binary
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

// POST /api/auth/login - 로그인
router.post('/login', async (req, res) => {
	try {
		const { loginId, password } = req.body;

		// 입력값 검증
		if (!loginId || !password) {
			return res.status(400).json({
				success: false,
				message: '아이디와 비밀번호를 입력해주세요',
				data: null,
				timestamp: new Date().toISOString()
			});
		}

		// 사용자 인증
		const user = await usersServices.authenticateUser(loginId, password);
		
		// 토큰 생성
		const { refreshToken, accessToken } = await authServices.generateTokens(user.id);

		// 성공 응답
		res.json({
			success: true,
			message: '로그인 성공',
			data: {
				user: {
					id: user.id.toString(),
					loginId: user.loginId,
					nickname: user.nickname,
					statusNote: user.statusNote,
					profile: user.profile
				},
				tokens: {
					accessToken,
					refreshToken
				}
			},
			timestamp: new Date().toISOString()
		});

	} catch (error) {
		console.error('로그인 오류:', error);
		
		// 인증 실패
		if (error.message === 'INVALID_CREDENTIALS') {
			return res.status(401).json({
				success: false,
				message: '아이디 또는 비밀번호가 올바르지 않습니다',
				data: null,
				timestamp: new Date().toISOString()
			});
		}

		// 서버 오류
		res.status(500).json({
			success: false,
			message: '로그인 중 오류가 발생했습니다',
			data: null,
			timestamp: new Date().toISOString()
		});
	}
});

// POST /api/auth/check-loginid - 아이디 중복 확인
router.post('/check-loginid', async (req, res) => {
	try {
		const { loginId } = req.body;

		// 입력값 검증
		if (!loginId) {
			return res.status(400).json({
				success: false,
				message: '아이디를 입력해주세요',
				data: null,
				timestamp: new Date().toISOString()
			});
		}

		// 아이디 길이 검증 (4-20자)
		if (loginId.length < 4 || loginId.length > 20) {
			return res.status(400).json({
				success: false,
				message: '아이디는 4~20자 사이로 입력해주세요',
				data: null,
				timestamp: new Date().toISOString()
			});
		}

		// 중복 확인
		const exists = await usersServices.checkLoginIdExists(loginId);
		
		if (exists) {
			return res.status(409).json({
				success: false,
				message: '이미 사용 중인 아이디입니다',
				data: { available: false },
				timestamp: new Date().toISOString()
			});
		}

		// 사용 가능
		res.json({
			success: true,
			message: '사용 가능한 아이디입니다',
			data: { available: true },
			timestamp: new Date().toISOString()
		});

	} catch (error) {
		console.error('아이디 중복 확인 오류:', error);
		res.status(500).json({
			success: false,
			message: '아이디 확인 중 오류가 발생했습니다',
			data: null,
			timestamp: new Date().toISOString()
		});
	}
});

// POST /api/auth/register - 회원가입
router.post('/register', upload.fields([
	{ name: 'profileImage', maxCount: 1 },
	{ name: 'petProfileImage', maxCount: 1 }
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
				success: false,
				message: '필수 정보를 모두 입력해주세요',
				data: null,
				timestamp: new Date().toISOString()
			});
		}

		// 아이디 중복 확인
		const exists = await usersServices.checkLoginIdExists(loginId);
		if (exists) {
			return res.status(409).json({
				success: false,
				message: '이미 사용 중인 아이디입니다',
				data: null,
				timestamp: new Date().toISOString()
			});
		}

		    // 프로필 이미지 업로드 처리 (Azure Storage)
    let userProfileUrl = null;
    let petProfileUrl = null;

    if (req.files?.profileImage?.[0]) {
      const storageRepository = require('../repository/storageRepository');
      const file = req.files.profileImage[0];
      userProfileUrl = await storageRepository.uploadFile(
        file.buffer, 
        file.originalname, 
        file.mimetype, 
        'profiles'
      );
    }

    if (req.files?.petProfileImage?.[0]) {
      const storageRepository = require('../repository/storageRepository');
      const file = req.files.petProfileImage[0];
      petProfileUrl = await storageRepository.uploadFile(
        file.buffer, 
        file.originalname, 
        file.mimetype, 
        'pets'
      );
    }

		// 회원가입 처리 (사용자 + 반려동물 정보)
		const result = await usersServices.registerUserWithPet({
			// 사용자 정보
			loginId,
			password,
			nickname,
			statusNote: statusNote || null,
			profile: userProfileUrl,
			// 반려동물 정보
			pet: {
				name: petName,
				birthDate: petBirthDate ? new Date(petBirthDate) : null,
				gender: petGender,
				profile: petProfileUrl
			}
		});

		// 토큰 생성
		const { refreshToken, accessToken } = await authServices.generateTokens(result.user.id);

		// 성공 응답
		res.status(201).json({
			success: true,
			message: '회원가입이 완료되었습니다',
			data: {
				user: {
					id: result.user.id.toString(),
					loginId: result.user.loginId,
					nickname: result.user.nickname,
					statusNote: result.user.statusNote,
					profile: result.user.profile
				},
				pet: {
					id: result.pet.id.toString(),
					name: result.pet.name,
					birthDate: result.pet.birthDate,
					gender: result.pet.gender,
					profile: result.pet.profile
				},
				tokens: {
					accessToken,
					refreshToken
				}
			},
			timestamp: new Date().toISOString()
		});

	} catch (error) {
		console.error('회원가입 오류:', error);
		res.status(500).json({
			success: false,
			message: '회원가입 중 오류가 발생했습니다',
			data: null,
			timestamp: new Date().toISOString()
		});
	}
});

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