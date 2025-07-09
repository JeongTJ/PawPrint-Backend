const { prisma } = require('../config/dbConfig');

// 모든 댓글 조회
const findAll = async () => {
	return await prisma.comment.findMany({
		include: {
			user: {
				select: {
					id: true,
					name: true,
					profile: true
				}
			},
			content: {
				select: {
					id: true,
					contentType: true,
					body: true
				}
			},
			commentLikes: {
				include: {
					user: {
						select: {
							id: true,
							name: true
						}
					}
				}
			}
		},
		orderBy: { createdAt: 'desc' }
	});
};

// 특정 콘텐츠의 댓글들 조회
const findByContentId = async (contentId) => {
	return await prisma.comment.findMany({
		where: { contentId: parseInt(contentId) },
		include: {
			user: {
				select: {
					id: true,
					name: true,
					profile: true
				}
			},
			commentLikes: {
				include: {
					user: {
						select: {
							id: true,
							name: true
						}
					}
				}
			}
		},
		orderBy: { createdAt: 'asc' }
	});
};

// 특정 사용자의 댓글들 조회
const findByUserId = async (userId) => {
	return await prisma.comment.findMany({
		where: { userId: parseInt(userId) },
		include: {
			content: {
				select: {
					id: true,
					contentType: true,
					body: true
				}
			},
			commentLikes: true
		},
		orderBy: { createdAt: 'desc' }
	});
};

// ID로 특정 댓글 조회
const findById = async (id) => {
	return await prisma.comment.findUnique({
		where: { id: parseInt(id) },
		include: {
			user: {
				select: {
					id: true,
					name: true,
					profile: true
				}
			},
			content: {
				select: {
					id: true,
					contentType: true,
					body: true
				}
			},
			commentLikes: {
				include: {
					user: {
						select: {
							id: true,
							name: true
						}
					}
				}
			}
		}
	});
};

// 새 댓글 생성
const create = async (commentData) => {
	const { userId, contentId, body } = commentData;
	
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
						name: true,
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

// 댓글 수정
const update = async (id, commentData, userId) => {
	const { body } = commentData;
	
	return await prisma.comment.update({
		where: {
			id: parseInt(id),
			userId: parseInt(userId) // 본인만 수정 가능
		},
		data: {
			body,
			updatedAt: new Date()
		},
		include: {
			user: {
				select: {
					id: true,
					name: true,
					profile: true
				}
			}
		}
	});
};

// 댓글 삭제
const deleteById = async (id, userId) => {
	return await prisma.$transaction(async (tx) => {
		// 삭제할 댓글 조회
		const commentToDelete = await tx.comment.findUnique({
			where: {
				id: parseInt(id),
				userId: parseInt(userId) // 본인만 삭제 가능
			}
		});
		
		if (!commentToDelete) {
			throw new Error('댓글을 찾을 수 없거나 삭제 권한이 없습니다');
		}
		
		// 댓글 삭제 (CASCADE로 좋아요도 함께 삭제됨)
		const deletedComment = await tx.comment.delete({
			where: { id: parseInt(id) }
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

// 댓글 좋아요 추가
const addLike = async (commentId, userId) => {
	return await prisma.$transaction(async (tx) => {
		// 이미 좋아요가 있는지 확인
		const existingLike = await tx.commentLike.findUnique({
			where: {
				userId_commentId: {
					userId: parseInt(userId),
					commentId: parseInt(commentId)
				}
			}
		});
		
		if (existingLike) {
			throw new Error('이미 좋아요를 누른 댓글입니다');
		}
		
		// 좋아요 추가
		const like = await tx.commentLike.create({
			data: {
				userId: parseInt(userId),
				commentId: parseInt(commentId)
			}
		});
		
		// 댓글의 좋아요 수는 트리거에서 자동 업데이트됨
		
		return like;
	});
};

// 댓글 좋아요 제거
const removeLike = async (commentId, userId) => {
	return await prisma.$transaction(async (tx) => {
		// 좋아요 제거
		const deletedLike = await tx.commentLike.delete({
			where: {
				userId_commentId: {
					userId: parseInt(userId),
					commentId: parseInt(commentId)
				}
			}
		});
		
		// 댓글의 좋아요 수는 트리거에서 자동 업데이트됨
		
		return deletedLike;
	});
};

// 특정 사용자가 특정 댓글에 좋아요를 눌렀는지 확인
const hasLiked = async (commentId, userId) => {
	const like = await prisma.commentLike.findUnique({
		where: {
			userId_commentId: {
				userId: parseInt(userId),
				commentId: parseInt(commentId)
			}
		}
	});
	
	return !!like;
};

// 댓글의 좋아요 목록 조회
const getLikes = async (commentId) => {
	return await prisma.commentLike.findMany({
		where: { commentId: parseInt(commentId) },
		include: {
			user: {
				select: {
					id: true,
					name: true,
					profile: true
				}
			}
		},
		orderBy: { createdAt: 'desc' }
	});
};

// 최근 댓글들 조회 (페이지네이션)
const findRecent = async (limit = 10, offset = 0) => {
	return await prisma.comment.findMany({
		include: {
			user: {
				select: {
					id: true,
					name: true,
					profile: true
				}
			},
			content: {
				select: {
					id: true,
					contentType: true,
					body: true
				}
			}
		},
		orderBy: { createdAt: 'desc' },
		take: limit,
		skip: offset
	});
};

module.exports = {
	findAll,
	findByContentId,
	findByUserId,
	findById,
	create,
	update,
	deleteById,
	addLike,
	removeLike,
	hasLiked,
	getLikes,
	findRecent
};
