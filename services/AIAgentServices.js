const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { logger } = require('../config/logger');
// storageRepository는 더 이상 필요 없습니다.

// AI 서버 정보 (환경 변수에서 가져오기)
const AI_AGENT_URL = process.env.AI_AGENT_URL;
const AI_AGENT_PASSWORD = process.env.AI_AGENT_PASSWORD;


/**
 * Azure Blob URL에서 이미지 데이터를 다운로드하는 헬퍼 함수
 * @param {string} url - 다운로드할 이미지의 SAS URL
 * @returns {Promise<Buffer>} - 이미지 데이터 버퍼
 */
const downloadImage = async (url) => {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer' // 바이너리 데이터를 버퍼로 받기 위해 필수
    });
    return response.data;
  } catch (error) {
    logger.error(`이미지 다운로드 실패: ${url}`, error);
    // 에러를 다시 던져서 Promise.all이 실패하도록 함
    throw new Error(`Failed to download image from ${url}`);
  }
};


/**
 * 여러 이미지 URL로부터 슬라이드쇼를 생성하고, 결과 비디오를 로컬에 저장합니다.
 * @param {string[]} imageUrls - 슬라이드쇼를 만들 이미지들의 SAS URL 배열
 * @returns {Promise<string>} - 로컬에 저장된 비디오 파일의 절대 경로
 */
const createSlideshowFromUrls = async (imageUrls) => {
  if (!AI_AGENT_URL || !AI_AGENT_PASSWORD) {
    throw new Error('AI 에이전트 서버의 URL 또는 비밀번호가 설정되지 않았습니다.');
  }

  logger.info('이미지 다운로드 시작...');
  const imageBuffers = await Promise.all(
    imageUrls.map(url => downloadImage(url))
  );
  logger.info('모든 이미지 다운로드 완료.');

  const formData = new FormData();
  formData.append('password', AI_AGENT_PASSWORD);
  imageBuffers.forEach((buffer, index) => {
    formData.append('files', buffer, { filename: `image${index}.jpg` });
  });

  try {
    logger.info('AI 에이전트 서버에 슬라이드쇼 생성 요청 전송...');
    const response = await axios.post(
      `${AI_AGENT_URL}/api/v1/create-slideshow`,
      formData,
      {
        headers: formData.getHeaders(),
        responseType: 'stream'
      }
    );
    
    const videoStream = response.data;
    
    // 1. 비디오를 저장할 디렉토리 경로를 설정하고, 없으면 생성합니다.
    const downloadsDir = path.join(__dirname, '..', 'downloads', 'videos');
    fs.mkdirSync(downloadsDir, { recursive: true });

    // 2. 고유한 파일 이름과 전체 경로를 생성합니다.
    const filename = `slideshow-${Date.now()}.mp4`;
    const filePath = path.join(downloadsDir, filename);

    // 3. 로컬 파일에 데이터를 쓰기 위한 쓰기 스트림을 생성합니다.
    const writer = fs.createWriteStream(filePath);

    // 4. AI 서버로부터 받은 비디오 스트림을 파일 스트림으로 파이핑합니다.
    videoStream.pipe(writer);

    // 5. 파일 쓰기가 완료되면 파일 경로를, 오류 발생 시 에러를 반환하는 Promise를 생성합니다.
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        logger.info(`비디오가 로컬에 저장되었습니다: ${filePath}`);
        resolve(filePath);
      });
      writer.on('error', (err) => {
        logger.error('로컬 파일 저장 중 오류 발생:', err);
        reject(new Error('비디오 파일을 로컬에 저장하는 중 오류가 발생했습니다.'));
      });
      videoStream.on('error', (err) => {
        logger.error('비디오 스트림 수신 중 오류:', err);
        // 쓰기 스트림을 닫고 부분적으로 생성된 파일을 삭제합니다.
        writer.close();
        fs.unlink(filePath, () => {}); // 에러는 무시
        reject(new Error('AI 서버로부터 비디오 스트림을 받는 중 오류가 발생했습니다.'));
      });
    });

  } catch (error) {
    logger.error('AI 에이전트 통신 오류:', error.response ? error.response.data : error.message);
    const newError = new Error('AI 에이전트 서버와 통신하는 중 오류가 발생했습니다.');
    newError.statusCode = error.response ? error.response.status : 500;
    throw newError;
  }
};


module.exports = {
  createSlideshowFromUrls
}; 