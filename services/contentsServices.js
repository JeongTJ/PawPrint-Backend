const { prisma } = require('../config/dbConfig');
const contentsRepository = require('../repository/contentsRepository');
const usersRepository = require('../repository/usersRepository');
const notificationsServices = require('./notificationsServices');
const storageRepository = require('../repository/storageRepository');

// 모든 게시물을 미디어와 함께 찾기
const findAll = async (userId) => {
	try {
		const [contents, likedContentIds] = await Promise.all([
			contentsRepository.findAll(),
			userId ? contentsRepository.getUserLikedContentIds(userId) : new Set()
		]);
		
		if (contents.length === 0) {
			return contents;
		}
		
		// 유니크한 사용자 ID들 추출
		const uniqueUserIds = [...new Set(contents.map(content => content.userId))];
		
		// 작성자 정보들 한 번에 조회
		const users = await Promise.all(
			uniqueUserIds.map(userId => usersRepository.findById(userId))
		);
		
		// userId를 키로 하는 사용자 정보 맵 생성
		const userMap = {};
		users.forEach(user => {
			if (user) userMap[user.id] = user;
		});
		
		// 각 게시물에 작성자 정보 추가 (nickname, profile만)
		const contentsWithUser = contents.map(content => ({
			...content,
			nickname: userMap[content.userId] ? userMap[content.userId].nickname : null,
			profile: userMap[content.userId] ? userMap[content.userId].profile : null,
			isLiked: likedContentIds.has(content.id)
		}));
		
		return contentsWithUser;
	} catch (error) {
		console.error('모든 게시물 조회 중 오류:', error);
		throw new Error('게시물 목록 조회에 실패했습니다.');
	}
};

// 특정 타입의 게시물들을 미디어와 함께 찾기
const findByContentType = async (content_type, userId) => {
	try {
		// 유효한 content_type 검증
		if (!['qna', 'community'].includes(content_type)) {
			const error = new Error('유효하지 않은 게시물 타입입니다. (qna, community만 허용)');
			error.statusCode = 400;
			throw error;
		}
		
		const [contents, likedContentIds] = await Promise.all([
			contentsRepository.findByContentType(content_type),
			userId ? contentsRepository.getUserLikedContentIds(userId) : new Set()
		]);
		
		if (contents.length === 0) {
			return contents;
		}
		
		// 유니크한 사용자 ID들 추출
		const uniqueUserIds = [...new Set(contents.map(content => content.userId))];
		
		// 작성자 정보들 한 번에 조회
		const users = await Promise.all(
			uniqueUserIds.map(userId => usersRepository.findById(userId))
		);
		
		// userId를 키로 하는 사용자 정보 맵 생성
		const userMap = {};
		users.forEach(user => {
			if (user) userMap[user.id] = user;
		});
		
		// 각 게시물에 작성자 정보 추가 (nickname, profile만)
		const contentsWithUser = contents.map(content => ({
			...content,
			nickname: userMap[content.userId] ? userMap[content.userId].nickname : null,
			profile: userMap[content.userId] ? userMap[content.userId].profile : null,
			isLiked: likedContentIds.has(content.id)
		}));
		
		return contentsWithUser;
	} catch (error) {
		if (error.statusCode) throw error;
		console.error('게시물 타입별 조회 중 오류:', error);
		throw new Error('게시물 조회에 실패했습니다.');
	}
};

// 특정 사용자의 게시물들을 미디어와 함께 찾기
const findByUserId = async (targetUserId, currentUserId) => {
	try {
		if (!targetUserId || isNaN(targetUserId)) {
			const error = new Error('유효하지 않은 사용자 ID입니다.');
			error.statusCode = 400;
			throw error;
		}
		
		const [contents, likedContentIds] = await Promise.all([
			contentsRepository.findByUserId(targetUserId),
			currentUserId ? contentsRepository.getUserLikedContentIds(currentUserId) : new Set()
		]);
		
		if (contents.length === 0) {
			return contents;
		}
		
		// 작성자 정보 조회 (모든 게시물이 같은 사용자의 것이므로 한 번만 조회)
		const user = await usersRepository.findById(parseInt(targetUserId));
		
		// 각 게시물에 작성자 정보 추가 (nickname, profile만)
		const contentsWithUser = contents.map(content => ({
			...content,
			nickname: user ? user.nickname : null,
			profile: user ? user.profile : null,
			isLiked: likedContentIds.has(content.id)
		}));
		
		return contentsWithUser;
	} catch (error) {
		if (error.statusCode) throw error;
		console.error('사용자별 게시물 조회 중 오류:', error);
		throw new Error('사용자의 게시물 조회에 실패했습니다.');
	}
};

// 특정 게시물을 미디어와 함께 ID로 찾기
const findById = async (id, userId) => {
	try {
		if (!id || isNaN(id)) {
			const error = new Error('유효하지 않은 게시물 ID입니다.');
			error.statusCode = 400;
			throw error;
		}
		
		const [content, isLiked] = await Promise.all([
			contentsRepository.findById(id),
			userId ? contentsRepository.isLikedByUser(userId, id) : false
		]);

		if (!content) {
			const error = new Error(`ID ${id}에 해당하는 게시물을 찾을 수 없습니다.`);
			error.statusCode = 404;
			throw error;
		}
		
		// 작성자 정보 조회
		const user = await usersRepository.findById(content.userId);
		
		// 게시물에 작성자 정보 추가 (nickname, profile만)
		const contentWithUser = {
			...content,
			nickname: user ? user.nickname : null,
			profile: user ? user.profile : null,
			isLiked
		};
		
		return contentWithUser;
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
		const { userId, contentType, body } = contentData;
		
		if (!userId || !contentType || !body) {
			const error = new Error('필수 필드가 누락되었습니다. (userId, contentType, body)');
			error.statusCode = 400;
			throw error;
		}
		
		if (!['qna', 'community'].includes(contentType)) {
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
	// 입력 데이터 검증
	const { userId, contentType, body } = contentData;
	if (!userId || !contentType || !body) {
		const error = new Error('필수 필드가 누락되었습니다. (userId, contentType, body)');
		error.statusCode = 400;
		throw error;
	}
	if (!['qna', 'community'].includes(contentType)) {
		const error = new Error('유효하지 않은 게시물 타입입니다. (qna, community만 허용)');
		error.statusCode = 400;
		throw error;
	}
	if (contentType === 'qna' && mediaFiles && mediaFiles.length > 0) {
		const error = new Error('Q&A 게시물에는 이미지를 첨부할 수 없습니다.');
		error.statusCode = 400;
		throw error;
	}
	if (mediaFiles && mediaFiles.length > 5) {
		const error = new Error('이미지는 최대 5개까지만 첨부할 수 있습니다.');
		error.statusCode = 400;
		throw error;
	}

	let uploadedFileUrls = [];
	try {
		// 1. 파일 스토리지에 업로드
		if (mediaFiles && mediaFiles.length > 0) {
			uploadedFileUrls = await storageRepository.uploadMultipleFiles(
				mediaFiles,
				'contents-images'
			);
		}

		// 2. DB 작업을 트랜잭션으로 처리
		const newContentWithMedia = await prisma.$transaction(async (tx) => {
			// 게시물 생성
			const newContent = await contentsRepository.create({ userId, contentType, body }, tx);

			// 미디어 정보 저장
			if (uploadedFileUrls.length > 0) {
				await contentsRepository.createManyMedia(newContent.id, uploadedFileUrls, tx);
			}
			
			// 생성된 전체 정보 다시 조회
			const result = await contentsRepository.findById(newContent.id, tx);
			return result;
		});

		return newContentWithMedia;

	} catch (error) {
		// 롤백: 오류 발생 시 업로드된 파일 삭제
		if (uploadedFileUrls.length > 0) {
			console.log(`🧹 롤백: 오류로 인해 업로드된 파일 ${uploadedFileUrls.length}개를 삭제합니다.`);
			await storageRepository.deleteMultipleFiles(uploadedFileUrls);
		}

		if (error.statusCode) throw error;
		console.error('미디어 포함 게시물 생성 중 오류:', error);
		throw new Error('게시물 생성에 실패했습니다.');
	}
};

/**
 * AI가 생성한 비디오로 게시물을 생성합니다.
 * @param {string} userId - 사용자 ID
 * @param {string} body - 게시물 내용
 * @param {string} videoId - AI 비디오 식별 ID (blob 이름)
 * @returns {Promise<Object>} - 생성된 게시물 정보 (미디어 포함)
 */
const createContentWithVideo = async (userId, body, videoId) => {
    const contentType = 'community'; // 비디오 게시물은 항상 community 타입
    if (!userId || !body || !videoId) {
        const error = new Error('필수 필드가 누락되었습니다. (userId, body, videoId)');
        error.statusCode = 400;
        throw error;
    }

    try {
        // 1. 임시 비디오를 영구 저장소로 이동하고 영구 URL을 받습니다.
        const permanentVideoUrl = await storageRepository.moveBlobToPermanentStorage(videoId);

        // 2. DB 작업을 트랜잭션으로 처리합니다.
        const newContentWithVideo = await prisma.$transaction(async (tx) => {
            // 게시물 본문 생성
            const newContent = await contentsRepository.create({ userId, contentType, body }, tx);

            // 미디어 정보(영구 비디오 URL) 저장
            await contentsRepository.createManyMedia(newContent.id, [permanentVideoUrl], tx);
            
            // 생성된 전체 정보 다시 조회
            return await contentsRepository.findById(newContent.id, tx);
        });

        return newContentWithVideo;

    } catch (error) {
        if (error.statusCode) throw error;
        // Azure 관련 에러 메시지 처리
        if (error.message.includes('임시 비디오')) {
            error.statusCode = 404;
        }
		console.error('AI 비디오 게시물 생성 중 오류:', error);
		throw new Error('AI 비디오 게시물 생성에 실패했습니다.');
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

const searchByKeyword = async (keyword, userId) => {
	try {
		if (!keyword || typeof keyword !== 'string') {
			const error = new Error('검색어는 문자열이어야 합니다.');
			error.statusCode = 400;
			throw error;
		}

		const [contents, likedContentIds] = await Promise.all([
			contentsRepository.searchByKeyword(keyword),
			userId ? contentsRepository.getUserLikedContentIds(userId) : new Set()
		]);

		if (contents.length === 0) {
			return [];
		}

		// 유니크한 사용자 ID들 추출
		const uniqueUserIds = [...new Set(contents.map(content => content.userId))];

		// 작성자 정보들 한 번에 조회
		const users = await Promise.all(
			uniqueUserIds.map(userId => usersRepository.findById(userId))
		);

		// userId를 키로 하는 사용자 정보 맵 생성
		const userMap = {};
		users.forEach(user => {
			if (user) userMap[user.id] = user;
		});

		// 각 게시물에 작성자 정보 추가 (nickname, profile만)
		const contentsWithUser = contents.map(content => ({
			...content,
			nickname: userMap[content.userId] ? userMap[content.userId].nickname : null,
			profile: userMap[content.userId] ? userMap[content.userId].profile : null,
			isLiked: likedContentIds.has(content.id)
		}));

		return contentsWithUser;

	} catch (error) {
		if (error.statusCode) throw error;
		console.error('키워드 검색 중 오류:', error);
		throw new Error('게시물 검색에 실패했습니다.');
	}
};

// 미디어 파일과 함께 게시물 업데이트 (교체 방식)
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
		if (existingContent.contentType === 'qna' && newMediaFiles && newMediaFiles.length > 0) {
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

// ==================== 좋아요 관련 서비스 ====================

// 좋아요 토글 (좋아요/좋아요 취소)
const toggleLike = async (userId, contentId) => {
	try {
		if (!userId || isNaN(userId)) {
			const error = new Error('유효하지 않은 사용자 ID입니다.');
			error.statusCode = 400;
			throw error;
		}
		
		if (!contentId || isNaN(contentId)) {
			const error = new Error('유효하지 않은 게시물 ID입니다.');
			error.statusCode = 400;
			throw error;
		}
		
		// 게시물 존재 확인
		const content = await contentsRepository.findById(contentId);
		if (!content) {
			const error = new Error(`ID ${contentId}에 해당하는 게시물을 찾을 수 없습니다.`);
			error.statusCode = 404;
			throw error;
		}
		
		// 이미 좋아요했는지 확인
		const isLiked = await contentsRepository.isLikedByUser(userId, contentId);
		
		if (isLiked) {
			// 좋아요 취소
			await contentsRepository.removeLike(userId, contentId);
			return { message: '좋아요가 취소되었습니다.', isLiked: false };
		} else {
			// 좋아요 추가
			const like = await contentsRepository.addLike(userId, contentId);
			return { message: '좋아요가 추가되었습니다.', isLiked: true, like };
		}
	} catch (error) {
		if (error.statusCode) throw error;
		console.error('좋아요 토글 중 오류:', error);
		throw new Error('좋아요 처리에 실패했습니다.');
	}
};

// 특정 컨텐츠의 좋아요 목록 조회
const getContentLikes = async (contentId) => {
	try {
		if (!contentId || isNaN(contentId)) {
			const error = new Error('유효하지 않은 게시물 ID입니다.');
			error.statusCode = 400;
			throw error;
		}
		
		// 게시물 존재 확인
		const content = await contentsRepository.findById(contentId);
		if (!content) {
			const error = new Error(`ID ${contentId}에 해당하는 게시물을 찾을 수 없습니다.`);
			error.statusCode = 404;
			throw error;
		}
		
		return await contentsRepository.getLikesByContentId(contentId);
	} catch (error) {
		if (error.statusCode) throw error;
		console.error('게시물 좋아요 목록 조회 중 오류:', error);
		throw new Error('좋아요 목록 조회에 실패했습니다.');
	}
};

// 사용자가 좋아요한 컨텐츠 목록 조회
const getUserLikedContents = async (userId) => {
	try {
		if (!userId || isNaN(userId)) {
			const error = new Error('유효하지 않은 사용자 ID입니다.');
			error.statusCode = 400;
			throw error;
		}
		
		return await contentsRepository.getUserLikedContents(userId);
	} catch (error) {
		if (error.statusCode) throw error;
		console.error('사용자 좋아요 컨텐츠 조회 중 오류:', error);
		throw new Error('좋아요한 게시물 조회에 실패했습니다.');
	}
};

// ==================== 댓글 관련 서비스 ====================

// 댓글 생성
const createComment = async (userId, contentId, body) => {
	try {
		if (!userId || isNaN(userId)) {
			const error = new Error('유효하지 않은 사용자 ID입니다.');
			error.statusCode = 400;
			throw error;
		}
		
		if (!contentId || isNaN(contentId)) {
			const error = new Error('유효하지 않은 게시물 ID입니다.');
			error.statusCode = 400;
			throw error;
		}
		
		if (!body || body.trim() === '') {
			const error = new Error('댓글 내용을 입력해주세요.');
			error.statusCode = 400;
			throw error;
		}
		
		// 게시물 존재 확인
		const content = await contentsRepository.findById(contentId);
		if (!content) {
			const error = new Error(`ID ${contentId}에 해당하는 게시물을 찾을 수 없습니다.`);
			error.statusCode = 404;
			throw error;
		}
		
		// 댓글 생성
		const comment = await contentsRepository.addComment(userId, contentId, body.trim());
		
		// 댓글 알림 생성 (비동기로 처리하여 댓글 생성 성공에 영향 주지 않음)
		try {
			await notificationsServices.createCommentNotification(
				content.userId,      // 게시물 작성자 ID
				userId,             // 댓글 작성자 ID
				contentId,          // 게시물 ID
				comment.id,         // 댓글 ID
				body.trim()         // 댓글 내용
			);
		} catch (notificationError) {
			// 알림 생성 실패해도 댓글 생성 자체는 성공
			console.error('댓글 알림 생성 중 오류:', notificationError);
		}
		
		return comment;
	} catch (error) {
		if (error.statusCode) throw error;
		console.error('댓글 생성 중 오류:', error);
		throw new Error('댓글 작성에 실패했습니다.');
	}
};

// 특정 컨텐츠의 댓글 목록 조회 
const getContentComments = async (contentId) => {
	try {
		if (!contentId || isNaN(contentId)) {
			const error = new Error('유효하지 않은 게시물 ID입니다.');
			error.statusCode = 400;
			throw error;
		}
		
		// 게시물 존재 확인
		const content = await contentsRepository.findById(contentId);
		if (!content) {
			const error = new Error(`ID ${contentId}에 해당하는 게시물을 찾을 수 없습니다.`);
			error.statusCode = 404;
			throw error;
		}
		
		return await contentsRepository.getCommentsByContentId(contentId);
	} catch (error) {
		if (error.statusCode) throw error;
		console.error('게시물 댓글 목록 조회 중 오류:', error);
		throw new Error('댓글 목록 조회에 실패했습니다.');
	}
};

// 사용자가 작성한 댓글 목록 조회
const getUserComments = async (userId) => {
	try {
		if (!userId || isNaN(userId)) {
			const error = new Error('유효하지 않은 사용자 ID입니다.');
			error.statusCode = 400;
			throw error;
		}
		
		return await contentsRepository.getUserComments(userId);
	} catch (error) {
		if (error.statusCode) throw error;
		console.error('사용자 댓글 목록 조회 중 오류:', error);
		throw new Error('댓글 목록 조회에 실패했습니다.');
	}
};

// 댓글 수정
const updateComment = async (commentId, userId, body) => {
	try {
		if (!commentId || isNaN(commentId)) {
			const error = new Error('유효하지 않은 댓글 ID입니다.');
			error.statusCode = 400;
			throw error;
		}
		
		if (!userId || isNaN(userId)) {
			const error = new Error('유효하지 않은 사용자 ID입니다.');
			error.statusCode = 400;
			throw error;
		}
		
		if (!body || body.trim() === '') {
			const error = new Error('댓글 내용을 입력해주세요.');
			error.statusCode = 400;
			throw error;
		}
		
		return await contentsRepository.updateComment(commentId, userId, body.trim());
	} catch (error) {
		if (error.statusCode) throw error;
		console.error('댓글 수정 중 오류:', error);
		
		// Prisma 오류에서 권한 관련 에러 처리
		if (error.message.includes('Record to update not found')) {
			const permissionError = new Error('댓글을 찾을 수 없거나 수정 권한이 없습니다.');
			permissionError.statusCode = 403;
			throw permissionError;
		}
		
		throw new Error('댓글 수정에 실패했습니다.');
	}
};

// 댓글 삭제
const deleteComment = async (commentId, userId) => {
	try {
		if (!commentId || isNaN(commentId)) {
			const error = new Error('유효하지 않은 댓글 ID입니다.');
			error.statusCode = 400;
			throw error;
		}
		
		if (!userId || isNaN(userId)) {
			const error = new Error('유효하지 않은 사용자 ID입니다.');
			error.statusCode = 400;
			throw error;
		}
		
		await contentsRepository.deleteComment(commentId, userId);
		return { message: '댓글이 삭제되었습니다.' };
	} catch (error) {
		if (error.statusCode) throw error;
		console.error('댓글 삭제 중 오류:', error);
		
		// Prisma 오류에서 권한 관련 에러 처리
		if (error.message.includes('Record to delete does not exist')) {
			const permissionError = new Error('댓글을 찾을 수 없거나 삭제 권한이 없습니다.');
			permissionError.statusCode = 403;
			throw permissionError;
		}
		
		throw new Error('댓글 삭제에 실패했습니다.');
	}
};

module.exports = {
	findAll,
	findByContentType,
	findByUserId,
	findById,
	create,
	createWithMedia,
    createContentWithVideo,
	update,
	searchByKeyword,
	updateWithMedia,
	deleteById,
	findMediaByContentId,
	deleteMediaById,
	toggleLike,
	getContentLikes,
	getUserLikedContents,
	createComment,
	getContentComments,
	getUserComments,
	updateComment,
	deleteComment,
	findByType,
};