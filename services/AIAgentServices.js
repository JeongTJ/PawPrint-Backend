const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { logger } = require('../config/logger');
const storageRepository = require('../repository/storageRepository');
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
 * 여러 이미지 URL로부터 슬라이드쇼를 생성하고, 임시 저장 후 URL과 ID를 반환합니다.
 * @param {string[]} imageUrls - 슬라이드쇼를 만들 이미지들의 SAS URL 배열
 * @returns {Promise<{videoUrl: string, videoId: string}>} - 임시 비디오 URL과 식별을 위한 videoId(blob이름)
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
        
        logger.info('AI 스트림 수신 완료. 임시 저장소에 업로드를 시작합니다.');

        const blobName = `temp-slideshow-${Date.now()}.mp4`;
        const mimetype = 'video/mp4';
        const containerName = 'temp-videos';
        const expirationHours = 24; // 24시간 후 만료되는 임시 URL

        const { url, blobName: videoId } = await storageRepository.uploadStream(
                videoStream, 
                blobName, 
                mimetype, 
                containerName,
                expirationHours
        );

        logger.info(`임시 비디오 업로드 완료. URL: ${url}, Video ID: ${videoId}`);
        
        return { videoUrl: url, videoId: videoId };

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