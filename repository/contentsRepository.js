const { prisma } = require('../config/dbConfig');
const storageRepository = require('./storageRepository');
const bcrypt = require('bcrypt');

// 미디어 SAS URL 리프레시 (간소화된 버전 - storageRepository 범용 함수 사용)
const refreshMediaUrlsIfExpired = async (mediaArray) => {
	if (!mediaArray || mediaArray.length === 0) return mediaArray;
	
	// 각 미디어의 URL을 개별적으로 처리
	const refreshedMedia = await Promise.all(
		mediaArray.map(async (media) => {
			const newUrl = await storageRepository.refreshUrlIfExpired(
				media.fileUrl,
				async (oldUrl, newUrl) => {
					// DB 업데이트 콜백
					await prisma.media.update({
						where: { id: media.id },
						data: { 
							fileUrl: newUrl,
							updatedAt: new Date()
						}
					});
				}
			);
			
			return { ...media, fileUrl: newUrl };
		})
	);
	
	return refreshedMedia;
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
	
	// 각 컨텐츠의 미디어 SAS URL 리프레시
	const refreshedContents = await Promise.all(
		contents.map(async (content) => ({
			...content,
			media: await refreshMediaUrlsIfExpired(content.media)
		}))
	);
	
	return refreshedContents;
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
	
	// 각 컨텐츠의 미디어 SAS URL 리프레시
	const refreshedContents = await Promise.all(
		contents.map(async (content) => ({
			...content,
			media: await refreshMediaUrlsIfExpired(content.media)
		}))
	);
	
	return refreshedContents;
};

const searchByKeyword = async (keyword) => {
	if (!keyword) {
		return [];
	}

	const contents = await prisma.content.findMany({
		where: {
			body: {
				contains: keyword,
			},
		},
		include: {
			media: {
				orderBy: { id: 'asc' },
			},
		},
		orderBy: { id: 'asc' },
	});

	// 각 컨텐츠의 미디어 SAS URL 리프레시
	const refreshedContents = await Promise.all(
		contents.map(async (content) => ({
			...content,
			media: await refreshMediaUrlsIfExpired(content.media),
		})),
	);

	return refreshedContents;
};

// 특정 사용자의 게시물을 미디어와 함께 찾기
const findByUserId = async (userId) => {
	const contents = await prisma.content.findMany({
		where: { userId: parseInt(userId) },
		include: {
			media: {
				orderBy: { id: 'asc' }
			}
		},
		orderBy: { id: 'asc' }
	});
	
	// 각 컨텐츠의 미디어 SAS URL 리프레시
	const refreshedContents = await Promise.all(
		contents.map(async (content) => ({
			...content,
			media: await refreshMediaUrlsIfExpired(content.media)
		}))
	);
	
	return refreshedContents;
};

const create = async (contentData, tx) => {
	const prismaClient = tx || prisma;
	const { userId, contentType, body } = contentData;

	return await prismaClient.content.create({
		data: {
			userId: parseInt(userId),
			contentType,
			body,
		},
	});
};

const createManyMedia = async (contentId, imageUrls, tx) => {
	const prismaClient = tx || prisma;
	const mediaData = imageUrls.map((url) => ({
		contentId,
		fileUrl: url,
	}));

	return await prismaClient.media.createMany({
		data: mediaData,
	});
};


// ID로 특정 게시물을 미디어와 함께 찾기
const findById = async (id, tx) => {
	const prismaClient = tx || prisma;
	const content = await prismaClient.content.findUnique({
		where: { id: parseInt(id) },
		include: {
			media: {
				orderBy: { id: 'asc' }
			}
		}
	});
	
	if (!content) {
		return null;
	}
	
	// 미디어 SAS URL 리프레시
	const refreshedMedia = await refreshMediaUrlsIfExpired(content.media);
	
	return {
		...content,
		media: refreshedMedia
	};
};

// 게시물과 미디어를 함께 업데이트 (트랜잭션 사용)
const updateWithMedia = async (id, contentData, newMediaFiles = null) => {
	let uploadedFileUrls = [];
	let oldMediaUrls = [];
	
	try {
		const result = await prisma.$transaction(async (tx) => {
			// 현재 콘텐츠와 미디어 정보 조회
			const currentContent = await tx.content.findUnique({
				where: { id: parseInt(id) },
				include: { media: true }
			});
			
			if (!currentContent) {
				throw new Error('게시물을 찾을 수 없습니다');
			}
			
			// 새 파일들이 있으면 업로드
			if (newMediaFiles && newMediaFiles.length > 0) {
				uploadedFileUrls = await storageRepository.uploadMultipleFiles(newMediaFiles, 'contents-images');
			}
			
			// 기존 미디어 URL들 백업 (롤백용)
			oldMediaUrls = currentContent.media.map(media => media.fileUrl);
			
			// 콘텐츠 업데이트
			const updatedContent = await tx.content.update({
				where: { id: parseInt(id) },
				data: {
					body: contentData.body,
					updatedAt: new Date()
				}
			});
			
			// 새 미디어가 있으면 교체
			if (uploadedFileUrls.length > 0) {
				// 기존 미디어 삭제
				await tx.media.deleteMany({
					where: { contentId: parseInt(id) }
				});
				
				// 새 미디어 추가
				const newMediaRecords = [];
				for (const fileUrl of uploadedFileUrls) {
					const media = await tx.media.create({
						data: {
							contentId: parseInt(id),
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
		where: { id: parseInt(id) },
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
					id: parseInt(id),
					userId: parseInt(userId) 
				},
				include: { media: true }
			});
			
			if (!contentToDelete) {
				throw new Error('게시물을 찾을 수 없거나 삭제 권한이 없습니다');
			}
			
			const mediaUrls = contentToDelete.media.map(media => media.fileUrl);
			
			// DB에서 삭제 (CASCADE로 관련 데이터 자동 삭제)
			await tx.content.delete({
				where: { id: parseInt(id) }
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
		where: { contentId: parseInt(contentId) },
		orderBy: { id: 'asc' }
	});
	
	// 만료된 SAS URL 갱신
	await refreshMediaUrlsIfExpired(media);
	
	// 최신 데이터 재조회
	return await prisma.media.findMany({
		where: { contentId: parseInt(contentId) },
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
					id: parseInt(mediaId),
					contentId: parseInt(contentId)
				}
			});
			
			if (!mediaToDelete) {
				throw new Error('미디어를 찾을 수 없습니다');
			}
			
			// DB에서 삭제
			await tx.media.delete({
				where: { id: parseInt(mediaId) }
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
		where: { contentId: parseInt(contentId) }
	});
	
	if (media.length === 0) {
		return { message: '미디어가 없습니다' };
	}
	
	// 각 미디어 URL 리프레시
	await refreshMediaUrlsIfExpired(media);
	
	return { 
		success: true, 
		message: `${media.length}개의 SAS URL이 갱신되었습니다` 
	};
};

// ==================== 좋아요 관련 함수들 ====================

// 좋아요 추가
const addLike = async (userId, contentId) => {
	return await prisma.$transaction(async (tx) => {
		// 좋아요 추가
		const like = await tx.contentLike.create({
			data: {
				userId: parseInt(userId),
				contentId: parseInt(contentId)
			},
			include: {
				user: {
					select: {
						id: true,
						nickname: true,
						profile: true
					}
				}
			}
		});
		
		// 콘텐츠의 좋아요 수 증가
		await tx.content.update({
			where: { id: parseInt(contentId) },
			data: {
				likesCount: {
					increment: 1
				},
				updatedAt: new Date()
			}
		});
		
		return like;
	});
};

// 좋아요 제거
const removeLike = async (userId, contentId) => {
	return await prisma.$transaction(async (tx) => {
		// 좋아요 제거
		const like = await tx.contentLike.delete({
			where: {
				userId_contentId: {
					userId: parseInt(userId),
					contentId: parseInt(contentId)
				}
			}
		});
		
		// 콘텐츠의 좋아요 수 감소
		await tx.content.update({
			where: { id: parseInt(contentId) },
			data: {
				likesCount: {
					decrement: 1
				},
				updatedAt: new Date()
			}
		});
		
		return like;
	});
};

// 사용자가 특정 컨텐츠에 좋아요했는지 확인
const isLikedByUser = async (userId, contentId) => {
	const like = await prisma.contentLike.findUnique({
		where: {
			userId_contentId: {
				userId: parseInt(userId),
				contentId: parseInt(contentId)
			}
		}
	});
	return !!like;
};

// 특정 컨텐츠의 좋아요 목록 조회
const getLikesByContentId = async (contentId) => {
	return await prisma.contentLike.findMany({
		where: { contentId: parseInt(contentId) },
		include: {
			user: {
				select: {
					id: true,
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
		where: { userId: parseInt(userId) },
		include: {
			content: {
				include: {
					media: {
						orderBy: { id: 'asc' }
					},
					user: {
						select: {
							id: true,
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

// 사용자가 좋아요한 컨텐츠의 ID 목록 조회
const getUserLikedContentIds = async (userId) => {
	const likes = await prisma.contentLike.findMany({
		where: { userId: parseInt(userId) },
		select: {
			contentId: true,
		},
	});
	return new Set(likes.map(like => like.contentId));
};

// ==================== 댓글 관련 함수들 ====================

// 댓글 추가
const addComment = async (userId, contentId, body) => {
	return await prisma.$transaction(async (tx) => {
		// 댓글 생성
		const comment = await tx.comment.create({
			data: {
				userId: parseInt(userId),
				contentId: parseInt(contentId),
				body
			},
			include: {
				user: {
					select: {
						id: true,
						nickname: true,
						profile: true
					}
				}
			}
		});
		
		// 콘텐츠의 댓글 수 증가
		await tx.content.update({
			where: { id: parseInt(contentId) },
			data: {
				commentsCount: {
					increment: 1
				},
				updatedAt: new Date()
			}
		});
		
		return comment;
	});
};

// 특정 컨텐츠의 댓글 목록 조회
const getCommentsByContentId = async (contentId) => {
	return await prisma.comment.findMany({
		where: { contentId: parseInt(contentId) },
		include: {
			user: {
				select: {
					id: true,
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
		where: { userId: parseInt(userId) },
		include: {
			user: {
				select: {
					id: true,
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
			id: parseInt(commentId),
			userId: parseInt(userId) // 작성자만 수정 가능
		},
		data: {
			body,
			updatedAt: new Date()
		},
		include: {
			user: {
				select: {
					id: true,
					nickname: true,
					profile: true
				}
			}
		}
	});
};

// 댓글 삭제
const deleteComment = async (commentId, userId) => {
	return await prisma.$transaction(async (tx) => {
		// 삭제할 댓글 조회
		const commentToDelete = await tx.comment.findUnique({
			where: {
				id: parseInt(commentId),
				userId: parseInt(userId) // 작성자만 삭제 가능
			}
		});
		
		if (!commentToDelete) {
			throw new Error('댓글을 찾을 수 없거나 삭제 권한이 없습니다.');
		}
		
		// 댓글 삭제
		const deletedComment = await tx.comment.delete({
			where: { id: parseInt(commentId) }
		});
		
		// 콘텐츠의 댓글 수 감소
		await tx.content.update({
			where: { id: commentToDelete.contentId },
			data: {
				commentsCount: {
					decrement: 1
				},
				updatedAt: new Date()
			}
		});
		
		return deletedComment;
	});
};

module.exports = {
	findAll,
	findByContentType,
	findByUserId,
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
	getUserLikedContentIds,
	// 댓글 관련
	addComment,
	getCommentsByContentId,
	getUserComments,
	updateComment,
	deleteComment,
	searchByKeyword,
	createManyMedia,
};