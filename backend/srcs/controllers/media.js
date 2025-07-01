const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload'); // 메모리 저장을 위한 multer 미들웨어
const azureStorageService = require('../services/azureStorageServices');

/**
 * @openapi
 * /api/media/upload:
 *   post:
 *     summary: 단일 이미지 파일 업로드
 *     tags: [Media]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: 업로드할 이미지 파일.
 *     responses:
 *       201:
 *         description: 파일 업로드 성공. 업로드된 파일의 URL을 반환합니다.
 *         schema:
 *           type: object
 *           properties:
 *             fileUrl:
 *               type: string
 *               format: url
 *               example: "https://<your-storage-account>.blob.core.windows.net/contents-images/uuid-filename.jpg"
 *       400:
 *         description: 파일이 첨부되지 않았습니다.
 *       500:
 *         description: 파일 업로드 중 서버 오류가 발생했습니다.
 */
router.post('/upload', upload.single('image'), async (req, res) => {
	try {
		// upload.single 미들웨어가 파일을 req.file 객체에 담아줍니다.
		if (!req.file) {
			return res.status(400).json({ error: 'No file uploaded.' });
		}

		// Azure Storage 서비스에 파일 업로드 위임
		const fileUrl = await azureStorageService.uploadFile(
			req.file.buffer,
			req.file.originalname,
			req.file.mimetype
		);

		// 성공 시, 업로드된 파일의 URL을 응답
		res.status(201).json({ fileUrl });

	} catch (error) {
		console.error(`File upload error: ${error.message}`);
		res.status(500).json({ error: 'An error occurred during file upload.' });
	}
});

module.exports = router;