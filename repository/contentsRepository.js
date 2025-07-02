const { prisma } = require('../config/dbConfig');
const storageRepository = require('./storageRepository');

// 미디어 배열의 만료된 SAS URL을 재생성하는 헬퍼 함수
const refreshExpiredSasUrls = async (contentIds) => {
	if (!Array.isArray(contentIds) || contentIds.length === 0) {
		return [];
	}
	
	// 현재 미디어 정보 조회
	const currentMedia = await prisma.media.findMany({
		where: {
			contentId: {
				in: contentIds
			}
		},
		orderBy: [
			{ contentId: 'asc' },
			{ id: 'asc' }
		]
	});
	
	const expiredMedia = currentMedia.filter(media => 
		storageRepository.isSasUrlExpired(media.fileUrl)
	);
	
	if (expiredMedia.length === 0) {
		return currentMedia; // 만료된 URL이 없으면 그대로 반환
	}
	
	console.log(`${expiredMedia.length}개의 만료된 SAS URL 발견, 재생성 중...`);
	
	// 만료된 URL들을 재생성
	const regenerateResult = await storageRepository.regenerateMultipleSasUrls(
		expiredMedia.map(media => media.fileUrl)
	);
	
	// 성공적으로 재생성된 URL들을 DB에 업데이트
	try {
		await prisma.$transaction(async (tx) => {
			for (const {old: oldUrl, new: newUrl} of regenerateResult.success) {
				await tx.media.updateMany({
					where: { fileUrl: oldUrl },
					data: { 
						fileUrl: newUrl,
						updatedAt: new Date()
					}
				});
			}
		});
		
		console.log(`${regenerateResult.success.length}개의 SAS URL 재생성 및 DB 업데이트 완료`);
		
		if (regenerateResult.failed.length > 0) {
			console.warn(`${regenerateResult.failed.length}개의 SAS URL 재생성 실패:`, regenerateResult.failed);
		}
		
		// DB 업데이트 후 최신 데이터 재조회
		const updatedMedia = await prisma.media.findMany({
			where: {
				contentId: {
					in: contentIds
				}
			},
			orderBy: [
				{ contentId: 'asc' },
				{ id: 'asc' }
			]
		});
		
		return updatedMedia;
		
	} catch (error) {
		console.error('SAS URL DB 업데이트 실패:', error);
		return currentMedia; // 실패 시 원본 데이터 반환
	}
};

// 모든 게시물을 미디어와 함께 찾기
const findAll = async () => {
	const contents = await prisma.content.findMany({
		include: {
			media: {
				orderBy: { id: 'asc' }
			}
		},
		orderBy: { id: 'asc' }
	});
	
	if (contents.length === 0) {
		return contents;
	}
	
	// 만료된 SAS URL 갱신 후 최신 데이터 재조회
	const contentIds = contents.map(content => content.id);
	await refreshExpiredSasUrls(contentIds);
	
	// 최신 데이터 재조회
	return await prisma.content.findMany({
		include: {
			media: {
				orderBy: { id: 'asc' }
			}
		},
		orderBy: { id: 'asc' }
	});
};

// 특정 게시물 타입으로 미디어와 함께 찾기 (qna, community)
const findByContentType = async (contentType) => {
	const contents = await prisma.content.findMany({
		where: { contentType },
		include: {
			media: {
				orderBy: { id: 'asc' }
			}
		},
		orderBy: { id: 'asc' }
	});
	
	if (contents.length === 0) {
		return contents;
	}
	
	// 만료된 SAS URL 갱신 후 최신 데이터 재조회
	const contentIds = contents.map(content => content.id);
	await refreshExpiredSasUrls(contentIds);
	
	// 최신 데이터 재조회
	return await prisma.content.findMany({
		where: { contentType },
		include: {
			media: {
				orderBy: { id: 'asc' }
			}
		},
		orderBy: { id: 'asc' }
	});
};

// 특정 사용자의 게시물을 미디어와 함께 찾기
const findByUserId = async (userId) => {
	const contents = await prisma.content.findMany({
		where: { userId: BigInt(userId) },
		include: {
			media: {
				orderBy: { id: 'asc' }
			}
		},
		orderBy: { id: 'asc' }
	});
	
	if (contents.length === 0) {
		return contents;
	}
	
	// 만료된 SAS URL 갱신 후 최신 데이터 재조회
	const contentIds = contents.map(content => content.id);
	await refreshExpiredSasUrls(contentIds);
	
	// 최신 데이터 재조회
	return await prisma.content.findMany({
		where: { userId: BigInt(userId) },
		include: {
			media: {
				orderBy: { id: 'asc' }
			}
		},
		orderBy: { id: 'asc' }
	});
};

// 특정 게시물을 미디어와 함께 생성 (트랜잭션 사용)
const createWithMedia = async (contentData, mediaFiles = []) => {
	let uploadedFileUrls = [];
	
	try {
		// 1. 먼저 파일들을 Storage에 업로드
		if (mediaFiles && mediaFiles.length > 0) {
			uploadedFileUrls = await storageRepository.uploadMultipleFiles(mediaFiles);
		}
		
		// 2. DB 트랜잭션으로 콘텐츠와 미디어 생성
		const result = await prisma.$transaction(async (tx) => {
			const { userId, contentType, body } = contentData;
			
			// 콘텐츠 생성
			const content = await tx.content.create({
				data: {
					userId: BigInt(userId),
					contentType,
					body
				}
			});
			
			// 미디어 파일들 DB에 저장
			const mediaRecords = [];
			if (uploadedFileUrls.length > 0) {
				for (const fileUrl of uploadedFileUrls) {
					const media = await tx.media.create({
						data: {
							contentId: content.id,
							fileUrl
						}
					});
					mediaRecords.push(media);
				}
			}
			
			return {
				...content,
				media: mediaRecords
			};
		});
		
		console.log(`✅ 콘텐츠 생성 완료 (ID: ${result.id})`);
		return result;
		
	} catch (error) {
		console.error('❌ 콘텐츠 생성 실패:', error);
		
		// 롤백: 업로드된 파일들 삭제
		if (uploadedFileUrls.length > 0) {
			try {
				await storageRepository.deleteMultipleFiles(uploadedFileUrls);
				console.log('🧹 업로드된 파일 정리 완료');
			} catch (cleanupError) {
				console.error('파일 정리 실패:', cleanupError);
			}
		}
		
		throw error;
	}
};

// 미디어 없이 콘텐츠만 생성
const create = async (contentData) => {
	const { userId, contentType, body } = contentData;
	
	return await prisma.content.create({
		data: {
			userId: BigInt(userId),
			contentType,
			body
		},
		include: {
			media: true
		}
	});
};

// ID로 특정 게시물을 미디어와 함께 찾기
const findById = async (id) => {
	const content = await prisma.content.findUnique({
		where: { id: BigInt(id) },
		include: {
			media: {
				orderBy: { id: 'asc' }
			}
		}
	});
	
	if (!content) {
		return null;
	}
	
	// 만료된 SAS URL 갱신
	await refreshExpiredSasUrls([content.id]);
	
	// 최신 데이터 재조회
	return await prisma.content.findUnique({
		where: { id: BigInt(id) },
		include: {
			media: {
				orderBy: { id: 'asc' }
			}
		}
	});
};

// 게시물과 미디어를 함께 업데이트 (트랜잭션 사용)
const updateWithMedia = async (id, contentData, newMediaFiles = null) => {
	let uploadedFileUrls = [];
	let oldMediaUrls = [];
	
	try {
		const result = await prisma.$transaction(async (tx) => {
			// 현재 콘텐츠와 미디어 정보 조회
			const currentContent = await tx.content.findUnique({
				where: { id: BigInt(id) },
				include: { media: true }
			});
			
			if (!currentContent) {
				throw new Error('게시물을 찾을 수 없습니다');
			}
			
			// 새 파일들이 있으면 업로드
			if (newMediaFiles && newMediaFiles.length > 0) {
				uploadedFileUrls = await storageRepository.uploadMultipleFiles(newMediaFiles);
			}
			
			// 기존 미디어 URL들 백업 (롤백용)
			oldMediaUrls = currentContent.media.map(media => media.fileUrl);
			
			// 콘텐츠 업데이트
			const updatedContent = await tx.content.update({
				where: { id: BigInt(id) },
				data: {
					body: contentData.body,
					updatedAt: new Date()
				}
			});
			
			// 새 미디어가 있으면 교체
			if (uploadedFileUrls.length > 0) {
				// 기존 미디어 삭제
				await tx.media.deleteMany({
					where: { contentId: BigInt(id) }
				});
				
				// 새 미디어 추가
				const newMediaRecords = [];
				for (const fileUrl of uploadedFileUrls) {
					const media = await tx.media.create({
						data: {
							contentId: BigInt(id),
							fileUrl
						}
					});
					newMediaRecords.push(media);
				}
				
				return {
					...updatedContent,
					media: newMediaRecords
				};
			}
			
			// 새 미디어가 없으면 기존 미디어 유지
			return {
				...updatedContent,
				media: currentContent.media
			};
		});
		
		// 트랜잭션 성공 후 기존 파일들 삭제
		if (uploadedFileUrls.length > 0 && oldMediaUrls.length > 0) {
			try {
				await storageRepository.deleteMultipleFiles(oldMediaUrls);
				console.log(`🧹 기존 미디어 파일 ${oldMediaUrls.length}개 삭제 완료`);
			} catch (deleteError) {
				console.warn('기존 파일 삭제 실패:', deleteError);
			}
		}
		
		console.log(`✅ 콘텐츠 업데이트 완료 (ID: ${id})`);
		return result;
		
	} catch (error) {
		console.error('❌ 콘텐츠 업데이트 실패:', error);
		
		// 롤백: 새로 업로드된 파일들 삭제
		if (uploadedFileUrls.length > 0) {
			try {
				await storageRepository.deleteMultipleFiles(uploadedFileUrls);
				console.log('🧹 롤백: 새로 업로드된 파일 정리 완료');
			} catch (cleanupError) {
				console.error('롤백 파일 정리 실패:', cleanupError);
			}
		}
		
		throw error;
	}
};

// 미디어 없이 콘텐츠만 업데이트
const update = async (id, contentData) => {
	return await prisma.content.update({
		where: { id: BigInt(id) },
		data: {
			body: contentData.body,
			updatedAt: new Date()
		},
		include: {
			media: true
		}
	});
};

// 게시물과 모든 관련 데이터 삭제 (트랜잭션 사용)
const deleteById = async (id, userId) => {
	try {
		const result = await prisma.$transaction(async (tx) => {
			// 삭제할 콘텐츠와 미디어 조회
			const contentToDelete = await tx.content.findUnique({
				where: { 
					id: BigInt(id),
					userId: BigInt(userId) 
				},
				include: { media: true }
			});
			
			if (!contentToDelete) {
				throw new Error('게시물을 찾을 수 없거나 삭제 권한이 없습니다');
			}
			
			const mediaUrls = contentToDelete.media.map(media => media.fileUrl);
			
			// DB에서 삭제 (CASCADE로 관련 데이터 자동 삭제)
			await tx.content.delete({
				where: { id: BigInt(id) }
			});
			
			return { deletedContent: contentToDelete, mediaUrls };
		});
		
		// 트랜잭션 성공 후 Storage에서 파일 삭제
		if (result.mediaUrls.length > 0) {
			try {
				await storageRepository.deleteMultipleFiles(result.mediaUrls);
				console.log(`🧹 미디어 파일 ${result.mediaUrls.length}개 삭제 완료`);
			} catch (deleteError) {
				console.warn('미디어 파일 삭제 실패:', deleteError);
			}
		}
		
		console.log(`✅ 콘텐츠 삭제 완료 (ID: ${id})`);
		return { success: true, message: '게시물이 삭제되었습니다' };
		
	} catch (error) {
		console.error('❌ 콘텐츠 삭제 실패:', error);
		throw error;
	}
};

// 특정 콘텐츠의 미디어만 조회
const findMediaByContentId = async (contentId) => {
	const media = await prisma.media.findMany({
		where: { contentId: BigInt(contentId) },
		orderBy: { id: 'asc' }
	});
	
	// 만료된 SAS URL 갱신
	await refreshExpiredSasUrls([BigInt(contentId)]);
	
	// 최신 데이터 재조회
	return await prisma.media.findMany({
		where: { contentId: BigInt(contentId) },
		orderBy: { id: 'asc' }
	});
};

// 특정 미디어 삭제
const deleteMediaById = async (mediaId, contentId) => {
	try {
		const result = await prisma.$transaction(async (tx) => {
			// 삭제할 미디어 조회
			const mediaToDelete = await tx.media.findUnique({
				where: { 
					id: BigInt(mediaId),
					contentId: BigInt(contentId)
				}
			});
			
			if (!mediaToDelete) {
				throw new Error('미디어를 찾을 수 없습니다');
			}
			
			// DB에서 삭제
			await tx.media.delete({
				where: { id: BigInt(mediaId) }
			});
			
			return mediaToDelete;
		});
		
		// Storage에서 파일 삭제
		try {
			await storageRepository.deleteFile(result.fileUrl);
			console.log(`🧹 미디어 파일 삭제 완료: ${result.fileUrl}`);
		} catch (deleteError) {
			console.warn('미디어 파일 삭제 실패:', deleteError);
		}
		
		return { success: true, message: '미디어가 삭제되었습니다' };
		
	} catch (error) {
		console.error('❌ 미디어 삭제 실패:', error);
		throw error;
	}
};

// SAS URL 수동 재생성
const regenerateSasUrlsForContent = async (contentId) => {
	const media = await prisma.media.findMany({
		where: { contentId: BigInt(contentId) }
	});
	
	if (media.length === 0) {
		return { message: '미디어가 없습니다' };
	}
	
	await refreshExpiredSasUrls([BigInt(contentId)]);
	
	return { 
		success: true, 
		message: `${media.length}개의 SAS URL이 갱신되었습니다` 
	};
};

// ==================== 좋아요 관련 함수들 ====================

// 좋아요 추가
const addLike = async (userId, contentId) => {
	return await prisma.contentLike.create({
		data: {
			userId: BigInt(userId),
			contentId: BigInt(contentId)
		},
		include: {
			user: {
				select: {
					id: true,
					loginId: true,
					nickname: true,
					profile: true
				}
			}
		}
	});
};

// 좋아요 제거
const removeLike = async (userId, contentId) => {
	return await prisma.contentLike.delete({
		where: {
			userId_contentId: {
				userId: BigInt(userId),
				contentId: BigInt(contentId)
			}
		}
	});
};

// 사용자가 특정 컨텐츠에 좋아요했는지 확인
const isLikedByUser = async (userId, contentId) => {
	const like = await prisma.contentLike.findUnique({
		where: {
			userId_contentId: {
				userId: BigInt(userId),
				contentId: BigInt(contentId)
			}
		}
	});
	return !!like;
};

// 특정 컨텐츠의 좋아요 목록 조회
const getLikesByContentId = async (contentId) => {
	return await prisma.contentLike.findMany({
		where: { contentId: BigInt(contentId) },
		include: {
			user: {
				select: {
					id: true,
					loginId: true,
					nickname: true,
					profile: true
				}
			}
		},
		orderBy: { createdAt: 'desc' }
	});
};

// 사용자가 좋아요한 컨텐츠 목록 조회
const getUserLikedContents = async (userId) => {
	const likes = await prisma.contentLike.findMany({
		where: { userId: BigInt(userId) },
		include: {
			content: {
				include: {
					media: {
						orderBy: { id: 'asc' }
					},
					user: {
						select: {
							id: true,
							loginId: true,
							nickname: true,
							profile: true
						}
					}
				}
			}
		},
		orderBy: { createdAt: 'desc' }
	});
	
	return likes.map(like => like.content);
};

// ==================== 댓글 관련 함수들 ====================

// 댓글 추가
const addComment = async (userId, contentId, body) => {
	return await prisma.comment.create({
		data: {
			userId: BigInt(userId),
			contentId: BigInt(contentId),
			body
		},
		include: {
			user: {
				select: {
					id: true,
					loginId: true,
					nickname: true,
					profile: true
				}
			}
		}
	});
};

// 특정 컨텐츠의 댓글 목록 조회
const getCommentsByContentId = async (contentId) => {
	return await prisma.comment.findMany({
		where: { contentId: BigInt(contentId) },
		include: {
			user: {
				select: {
					id: true,
					loginId: true,
					nickname: true,
					profile: true
				}
			}
		},
		orderBy: { createdAt: 'asc' }
	});
};

// 사용자가 작성한 댓글 목록 조회
const getUserComments = async (userId) => {
	return await prisma.comment.findMany({
		where: { userId: BigInt(userId) },
		include: {
			user: {
				select: {
					id: true,
					loginId: true,
					nickname: true,
					profile: true
				}
			},
			content: {
				select: {
					id: true,
					contentType: true,
					body: true,
					createdAt: true
				}
			}
		},
		orderBy: { createdAt: 'desc' }
	});
};

// 댓글 수정
const updateComment = async (commentId, userId, body) => {
	return await prisma.comment.update({
		where: { 
			id: BigInt(commentId),
			userId: BigInt(userId) // 작성자만 수정 가능
		},
		data: {
			body,
			updatedAt: new Date()
		},
		include: {
			user: {
				select: {
					id: true,
					loginId: true,
					nickname: true,
					profile: true
				}
			}
		}
	});
};

// 댓글 삭제
const deleteComment = async (commentId, userId) => {
	return await prisma.comment.delete({
		where: { 
			id: BigInt(commentId),
			userId: BigInt(userId) // 작성자만 삭제 가능
		}
	});
};

module.exports = {
	findAll,
	findByContentType,
	findByUserId,
	createWithMedia,
	create,
	findById,
	updateWithMedia,
	update,
	deleteById,
	findMediaByContentId,
	deleteMediaById,
	regenerateSasUrlsForContent,
	// 좋아요 관련
	addLike,
	removeLike,
	isLikedByUser,
	getLikesByContentId,
	getUserLikedContents,
	// 댓글 관련
	addComment,
	getCommentsByContentId,
	getUserComments,
	updateComment,
	deleteComment
};