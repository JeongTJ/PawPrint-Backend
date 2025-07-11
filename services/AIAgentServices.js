const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { logger } = require('../config/logger');
const { formatKoreaDate } = require('../config/dateUtils'); // dateUtils 추가
const storageRepository = require('../repository/storageRepository');
const usersRepository = require('../repository/usersRepository');
const missionRepository = require('../repository/missionRepository');
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
        
        // 헤더에서 제목 추출 (axios는 헤더 이름을 소문자로 변환)
        const encodedTitle = response.headers['slideshow-title'] || null;
        const title = encodedTitle ? decodeURIComponent(encodedTitle) : null;

        return { 
            videoUrl: url, 
            videoId: videoId,
            title: title // 제목 추가
        };

    } catch (error) {
        logger.error('AI 에이전트 통신 오류:', error.response ? error.response.data : error.message);
        const newError = new Error('AI 에이전트 서버와 통신하는 중 오류가 발생했습니다.');
        newError.statusCode = error.response ? error.response.status : 500;
        throw newError;
    }
};
    
/**
 * AI 채팅 세션 시작을 위한 데이터를 준비합니다.
 * @param {number} userId - 사용자 ID
 * @returns {Promise<object>} - AI 서버에 보낼 JSON 데이터
 */
const startChat = async (userId) => {
	if (!AI_AGENT_URL || !AI_AGENT_PASSWORD) {
		throw new Error('AI 에이전트 서버의 URL 또는 비밀번호가 설정되지 않았습니다.');
	}
    try {
        // 1. 사용자 정보와 반려동물 정보 조회
        const user = await usersRepository.findById(userId);
        if (!user) {
            const error = new Error('사용자를 찾을 수 없습니다.');
            error.statusCode = 404;
            throw error;
        }
        if (!user.pets || user.pets.length === 0) {
            const error = new Error('채팅을 시작하려면 최소 한 마리의 반려동물이 등록되어 있어야 합니다.');
            error.statusCode = 400;
            throw error;
        }
        const petName = user.pets[0].name;
        const userName = user.nickname;

        // 2. 이미지가 있는 미션 추억 조회
        const allMemories = await missionRepository.missionMemoryRepository.findByUserId(userId);
        const memoriesWithImages = allMemories.filter(m => m.images && m.images.length > 0);

        if (memoriesWithImages.length === 0) {
            const error = new Error('AI와 대화하려면 이미지가 포함된 미션 추억이 하나 이상 있어야 합니다.');
            error.statusCode = 400;
            throw error;
        }

        // 3. 랜덤 추억 선택 및 정보 추출
        const randomMemory = memoriesWithImages[Math.floor(Math.random() * memoriesWithImages.length)];
        const memoryContent = randomMemory.content;
        const imageUrl = randomMemory.images[0].imageUrl;

        // 4. 최종 JSON 데이터 구성
        const chatData = {
            user_id: String(userId),
            user_info: {
                UserName: userName,
                PetName: petName,
                Image: imageUrl,
                Memory: memoryContent
            }
        };

        logger.info({ 'AI Chat Start Data Prepared': chatData }, 'AI 챗봇 시작 데이터 준비 완료');

        logger.info(`AI 챗봇 서버에 요청 전송: ${AI_AGENT_URL}/api/v1/chat/start`);
        const response = await axios.post(`${AI_AGENT_URL}/api/v1/chat/start`, chatData);

        // 6. 외부 서버의 응답과 이미지 URL을 함께 반환
        const aiResponse = response.data;
        logger.info('AI 챗봇 서버로부터 응답 수신 성공');

        return {
            ...aiResponse,
            imageUrl: imageUrl,
        };

    } catch (error) {
        logger.error(error, 'AI 챗봇 시작 로직 처리 중 오류 발생');

        // axios 에러인 경우 좀 더 상세하게 재구성하여 throw
        if (error.response) {
            const newError = new Error('AI 챗봇 서버에서 오류가 발생했습니다.');
            newError.statusCode = error.response.status;
            newError.data = error.response.data;
            throw newError;
        } else if (error.request) {
            const newError = new Error('AI 챗봇 서버에 연결할 수 없습니다.');
            newError.statusCode = 503; // Service Unavailable
            throw newError;
        }
        
        // 그 외 내부 오류 전파
        throw error;
    }
};

/**
 * AI 챗봇에게 메시지를 전송하고 응답을 받습니다.
 * @param {string} sessionId - 현재 채팅 세션 ID
 * @param {string} message - 사용자가 보내는 메시지
 * @returns {Promise<object>} - AI 챗봇의 응답 데이터
 */
const sendChatMessage = async (sessionId, message) => {
    if (!AI_AGENT_URL) {
        throw new Error('AI 에이전트 서버의 URL이 설정되지 않았습니다.');
    }

    try {
        const requestData = {
            session_id: sessionId,
            message: message,
        };
        
        logger.info(`AI 챗봇 서버에 메시지 전송: ${AI_AGENT_URL}/api/v1/chat/send`, requestData);

        const response = await axios.post(
            `${AI_AGENT_URL}/api/v1/chat/send`, 
            requestData
        );
        
		if (response.data.add_date) {
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			response.data.json_date.date = formatKoreaDate(tomorrow, 'YYYY-MM-DD');
			response.data.json_date.reminderOption = 60;
		}
        logger.info('AI 챗봇 서버로부터 응답 수신 성공');
        return response.data;

    } catch (error) {
        logger.error(error, 'AI 챗봇 메시지 전송 중 오류 발생');
        if (error.response) {
            const newError = new Error('AI 챗봇 서버에서 오류가 발생했습니다.');
            newError.statusCode = error.response.status;
            newError.data = error.response.data;
            throw newError;
        } else if (error.request) {
            const newError = new Error('AI 챗봇 서버에 연결할 수 없습니다.');
            newError.statusCode = 503;
            throw newError;
        }
        throw error;
    }
};

/**
 * AI 챗봇과의 세션을 종료합니다.
 * @param {string} sessionId - 종료할 채팅 세션 ID
 * @returns {Promise<object>} - AI 챗봇의 응답 데이터
 */
const endChatSession = async (sessionId) => {
    if (!AI_AGENT_URL) {
        throw new Error('AI 에이전트 서버의 URL이 설정되지 않았습니다.');
    }

    try {
        const requestData = { session_id: sessionId };
        logger.info(`AI 챗봇 서버에 세션 종료 요청: ${AI_AGENT_URL}/api/v1/chat/end`, requestData);

        const response = await axios.post(
            `${AI_AGENT_URL}/api/v1/chat/end`,
            requestData
        );

        logger.info('AI 챗봇 서버로부터 세션 종료 응답 수신 성공');
        return response.data;

    } catch (error) {
        logger.error(error, 'AI 챗봇 세션 종료 중 오류 발생');
        if (error.response) {
            const newError = new Error('AI 챗봇 서버에서 오류가 발생했습니다.');
            newError.statusCode = error.response.status;
            newError.data = error.response.data;
            throw newError;
        } else if (error.request) {
            const newError = new Error('AI 챗봇 서버에 연결할 수 없습니다.');
            newError.statusCode = 503;
            throw newError;
        }
        throw error;
    }
};

module.exports = {
    createSlideshowFromUrls,
    startChat,
    sendChatMessage,
    endChatSession,
}; 