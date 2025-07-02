const contentsRepository = require('../repository/contentsRepository');

// 모든 게시물을 미디어와 함께 찾기
const findAll = async () => {
	try {
		return await contentsRepository.findAll();
	} catch (error) {
		console.error('모든 게시물 조회 중 오류:', error);
		throw new Error('게시물 목록 조회에 실패했습니다.');
	}
};

// 특정 타입의 게시물들을 미디어와 함께 찾기
const findByContentType = async (content_type) => {
	try {
		// 유효한 content_type 검증
		if (!['qna', 'community'].includes(content_type)) {
			const error = new Error('유효하지 않은 게시물 타입입니다. (qna, community만 허용)');
			error.statusCode = 400;
			throw error;
		}
		
		return await contentsRepository.findByContentType(content_type);
	} catch (error) {
		if (error.statusCode) throw error;
		console.error('게시물 타입별 조회 중 오류:', error);
		throw new Error('게시물 조회에 실패했습니다.');
	}
};

// 특정 사용자의 게시물들을 미디어와 함께 찾기
const findByUserId = async (userId) => {
	try {
		if (!userId || isNaN(userId)) {
			const error = new Error('유효하지 않은 사용자 ID입니다.');
			error.statusCode = 400;
			throw error;
		}
		
		return await contentsRepository.findByUserId(userId);
	} catch (error) {
		if (error.statusCode) throw error;
		console.error('사용자별 게시물 조회 중 오류:', error);
		throw new Error('사용자의 게시물 조회에 실패했습니다.');
	}
};

// 특정 게시물을 미디어와 함께 ID로 찾기
const findById = async (id) => {
	try {
		if (!id || isNaN(id)) {
			const error = new Error('유효하지 않은 게시물 ID입니다.');
			error.statusCode = 400;
			throw error;
		}
		
		const content = await contentsRepository.findById(id);

		if (!content) {
			const error = new Error(`ID ${id}에 해당하는 게시물을 찾을 수 없습니다.`);
			error.statusCode = 404;
			throw error;
		}
		
		return content;
	} catch (error) {
		if (error.statusCode) throw error;
		console.error('게시물 단일 조회 중 오류:', error);
		throw new Error('게시물 조회에 실패했습니다.');
	}
};

// 미디어 파일 없이 게시물만 생성
const create = async (contentData) => {
	try {
		// 입력 데이터 검증
		const { userId, content_type, body } = contentData;
		
		if (!userId || !content_type || !body) {
			const error = new Error('필수 필드가 누락되었습니다. (userId, content_type, body)');
			error.statusCode = 400;
			throw error;
		}
		
		if (!['qna', 'community'].includes(content_type)) {
			const error = new Error('유효하지 않은 게시물 타입입니다. (qna, community만 허용)');
			error.statusCode = 400;
			throw error;
		}
		
		return await contentsRepository.create(contentData);
	} catch (error) {
		if (error.statusCode) throw error;
		console.error('게시물 생성 중 오류:', error);
		throw new Error('게시물 생성에 실패했습니다.');
	}
};

// 미디어 파일과 함께 게시물 생성
const createWithMedia = async (contentData, mediaFiles = []) => {
	try {
		// 입력 데이터 검증
		const { user_id, content_type, body } = contentData;
		
		if (!user_id || !content_type || !body) {
			const error = new Error('필수 필드가 누락되었습니다. (user_id, content_type, body)');
			error.statusCode = 400;
			throw error;
		}
		
		if (!['qna', 'community'].includes(content_type)) {
			const error = new Error('유효하지 않은 게시물 타입입니다. (qna, community만 허용)');
			error.statusCode = 400;
			throw error;
		}
		
		// QNA 게시물에 이미지 첨부 시도 검증 (DB 트리거가 있지만 미리 체크)
		if (content_type === 'qna' && mediaFiles && mediaFiles.length > 0) {
			const error = new Error('Q&A 게시물에는 이미지를 첨부할 수 없습니다.');
			error.statusCode = 400;
			throw error;
		}
		
		// 미디어 파일 개수 제한 (5개까지)
		if (mediaFiles && mediaFiles.length > 5) {
			const error = new Error('이미지는 최대 5개까지만 첨부할 수 있습니다.');
			error.statusCode = 400;
			throw error;
		}
		
		return await contentsRepository.createWithMedia(contentData, mediaFiles);
	} catch (error) {
		if (error.statusCode) throw error;
		console.error('미디어 포함 게시물 생성 중 오류:', error);
		throw new Error('게시물 생성에 실패했습니다.');
	}
};

// 게시물 내용만 업데이트 (미디어 변경 없음)
const update = async (id, contentData) => {
	try {
		if (!id || isNaN(id)) {
			const error = new Error('유효하지 않은 게시물 ID입니다.');
			error.statusCode = 400;
			throw error;
		}
		
		// 기존 게시물 존재 확인
		const existingContent = await contentsRepository.findById(id);
		if (!existingContent) {
			const error = new Error(`ID ${id}에 해당하는 게시물을 찾을 수 없습니다.`);
			error.statusCode = 404;
			throw error;
		}
		
		const updatedContent = await contentsRepository.update(id, contentData);
		
		if (!updatedContent) {
			const error = new Error('게시물 업데이트에 실패했습니다.');
			error.statusCode = 500;
			throw error;
		}
		
		return updatedContent;
	} catch (error) {
		if (error.statusCode) throw error;
		console.error('게시물 업데이트 중 오류:', error);
		throw new Error('게시물 수정에 실패했습니다.');
	}
};

// 게시물과 미디어를 함께 업데이트
const updateWithMedia = async (id, contentData, newMediaFiles = null) => {
	try {
		if (!id || isNaN(id)) {
			const error = new Error('유효하지 않은 게시물 ID입니다.');
			error.statusCode = 400;
			throw error;
		}
		
		// 기존 게시물 존재 확인
		const existingContent = await contentsRepository.findById(id);
		if (!existingContent) {
			const error = new Error(`ID ${id}에 해당하는 게시물을 찾을 수 없습니다.`);
			error.statusCode = 404;
			throw error;
		}
		
		// QNA 게시물에 이미지 첨부 시도 검증
		if (existingContent.content_type === 'qna' && newMediaFiles && newMediaFiles.length > 0) {
			const error = new Error('Q&A 게시물에는 이미지를 첨부할 수 없습니다.');
			error.statusCode = 400;
			throw error;
		}
		
		// 미디어 파일 개수 제한 (5개까지)
		if (newMediaFiles && newMediaFiles.length > 5) {
			const error = new Error('이미지는 최대 5개까지만 첨부할 수 있습니다.');
			error.statusCode = 400;
			throw error;
		}
		
		return await contentsRepository.updateWithMedia(id, contentData, newMediaFiles);
	} catch (error) {
		if (error.statusCode) throw error;
		console.error('미디어 포함 게시물 업데이트 중 오류:', error);
		throw new Error('게시물 수정에 실패했습니다.');
	}
};

// 게시물과 관련 미디어 모두 삭제
const deleteById = async (id, userId) => {
	try {
		if (!id || isNaN(id)) {
			const error = new Error('유효하지 않은 게시물 ID입니다.');
			error.statusCode = 400;
			throw error;
		}
		
		if (!userId || isNaN(userId)) {
			const error = new Error('유효하지 않은 사용자 ID입니다.');
			error.statusCode = 400;
			throw error;
		}
		
		// 게시물 존재 및 권한 확인
		const content = await contentsRepository.findById(id);
		if (!content) {
			const error = new Error(`ID ${id}에 해당하는 게시물을 찾을 수 없습니다.`);
			error.statusCode = 404;
			throw error;
		}

		// 작성자 확인
		if (parseInt(content.userId) !== parseInt(userId)) {	
			const error = new Error('본인이 작성한 게시물만 삭제할 수 있습니다.');
			error.statusCode = 403;
			throw error;
		}

		const deletedContent = await contentsRepository.deleteById(id, userId);
		
		if (!deletedContent) {
			const error = new Error('게시물 삭제에 실패했습니다.');
			error.statusCode = 500;
			throw error;
		}
		
		return deletedContent;
	} catch (error) {
		if (error.statusCode) throw error;
		console.error('게시물 삭제 중 오류:', error);
		throw new Error('게시물 삭제에 실패했습니다.');
	}
};

// 특정 게시물의 미디어만 조회
const findMediaByContentId = async (content_id) => {
	try {
		if (!content_id || isNaN(content_id)) {
			const error = new Error('유효하지 않은 게시물 ID입니다.');
			error.statusCode = 400;
			throw error;
		}
		
		// 게시물 존재 확인
		const content = await contentsRepository.findById(content_id);
		if (!content) {
			const error = new Error(`ID ${content_id}에 해당하는 게시물을 찾을 수 없습니다.`);
			error.statusCode = 404;
			throw error;
		}
		
		return await contentsRepository.findMediaByContentId(content_id);
	} catch (error) {
		if (error.statusCode) throw error;
		console.error('게시물 미디어 조회 중 오류:', error);
		throw new Error('미디어 조회에 실패했습니다.');
	}
};

// 특정 미디어 파일만 삭제
const deleteMediaById = async (media_id, content_id, userId) => {
	try {
		if (!media_id || isNaN(media_id)) {
			const error = new Error('유효하지 않은 미디어 ID입니다.');
			error.statusCode = 400;
			throw error;
		}
		
		if (!content_id || isNaN(content_id)) {
			const error = new Error('유효하지 않은 게시물 ID입니다.');
			error.statusCode = 400;
			throw error;
		}
		
		// 게시물 존재 및 권한 확인
		const content = await contentsRepository.findById(content_id);
		if (!content) {
			const error = new Error(`ID ${content_id}에 해당하는 게시물을 찾을 수 없습니다.`);
			error.statusCode = 404;
			throw error;
		}
		
		if (parseInt(content.userId) !== parseInt(userId)) {
			const error = new Error('본인이 작성한 게시물의 미디어만 삭제할 수 있습니다.');
			error.statusCode = 403;
			throw error;
		}
		
		const deletedMedia = await contentsRepository.deleteMediaById(media_id, content_id);
		
		if (!deletedMedia) {
			const error = new Error('해당 미디어 파일을 찾을 수 없습니다.');
			error.statusCode = 404;
			throw error;
		}
		
		return deletedMedia;
	} catch (error) {
		if (error.statusCode) throw error;
		console.error('미디어 파일 삭제 중 오류:', error);
		throw new Error('미디어 파일 삭제에 실패했습니다.');
	}
};

// 하위 호환성을 위한 별칭 함수
const findByType = async (content_type) => {
	return await findByContentType(content_type);
};

module.exports = { 
	// 기본 CRUD
	findAll, 
	findById,
	findByContentType,
	findByUserId,
	create, 
	update, 
	deleteById,
	
	// 미디어 관련 기능
	createWithMedia,
	updateWithMedia,
	findMediaByContentId,
	deleteMediaById,
	
	// 하위 호환성
	findByType,
};