const multer = require('multer');

// 파일을 디스크가 아닌 메모리에 저장
const storage = multer.memoryStorage();

const upload = multer({
	storage: storage,
	limits: { fileSize: 10 * 1024 * 1024 } // 10MB 파일 사이즈 제한
});

module.exports = upload;