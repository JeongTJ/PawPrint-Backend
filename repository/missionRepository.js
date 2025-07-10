const { PrismaClient } = require('@prisma/client');
const { getKoreaTodayStart, getKoreaNow } = require('../config/dateUtils');
const storageRepository = require('./storageRepository');

const prisma = new PrismaClient();

// 미션 템플릿 관련 함수들
const missionTemplateRepository = {
    // 모든 활성화된 미션 템플릿 조회
    findAllActive: async () => {
        return await prisma.missionTemplate.findMany({
            where: { isActive: true },
            orderBy: { order: 'asc' }
        });
    },

    // 특정 미션 템플릿 조회
    findById: async (id) => {
        return await prisma.missionTemplate.findUnique({
            where: { id }
        });
    },

    // 미션 템플릿 생성
    create: async (data) => {
        return await prisma.missionTemplate.create({
            data
        });
    },

    // 미션 템플릿 업데이트
    update: async (id, data) => {
        return await prisma.missionTemplate.update({
            where: { id },
            data
        });
    },

    // 미션 템플릿 삭제 (비활성화)
    deactivate: async (id) => {
        return await prisma.missionTemplate.update({
            where: { id },
            data: { isActive: false }
        });
    }
};

// 일일 미션 관련 함수들
const dailyMissionRepository = {
    // 사용자의 특정 날짜 일일 미션 조회
    findByUserAndDate: async (userId, date) => {
        return await prisma.dailyMission.findMany({
            where: {
                userId,
                date
            },
            include: {
                missionTemplate: true,
                missionMemory: true
            },
            orderBy: {
                missionTemplate: {
                    order: 'asc'
                }
            }
        });
    },

    // 사용자의 오늘 일일 미션 조회
    findTodayMissions: async (userId) => {
        const today = getKoreaTodayStart();
        return await dailyMissionRepository.findByUserAndDate(userId, today);
    },

    // 사용자의 미션 기록 조회 (기간별)
    findMissionHistory: async (userId, startDate, endDate) => {
        return await prisma.dailyMission.findMany({
            where: {
                userId,
                date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                missionTemplate: true,
                missionMemory: true
            },
            orderBy: [
                { date: 'desc' },
                { missionTemplate: { order: 'asc' } }
            ]
        });
    },

    // 특정 일일 미션 조회
    findById: async (id) => {
        return await prisma.dailyMission.findUnique({
            where: { id },
            include: {
                missionTemplate: true,
                missionMemory: true
            }
        });
    },

    // 일일 미션 생성
    create: async (data) => {
        return await prisma.dailyMission.create({
            data,
            include: {
                missionTemplate: true
            }
        });
    },

    // 일일 미션 완료 상태 업데이트
    updateCompletionStatus: async (id, isCompleted) => {
        const completedAt = isCompleted ? getKoreaNow() : null;
        return await prisma.dailyMission.update({
            where: { id },
            data: {
                isCompleted,
                completedAt
            },
            include: {
                missionTemplate: true
            }
        });
    },

    // 사용자의 특정 날짜에 미션이 이미 생성되었는지 확인
    checkExistingMissions: async (userId, date) => {
        const count = await prisma.dailyMission.count({
            where: {
                userId,
                date
            }
        });
        return count > 0;
    },

    // 사용자의 일일 미션 일괄 생성
    createBatch: async (missions) => {
        return await prisma.dailyMission.createMany({
            data: missions
        });
    }
};

// 미션 추억 관련 함수들
const missionMemoryRepository = {
    // 특정 사용자의 모든 미션 추억 조회 (이미지 포함)
    findByUserId: async (userId) => {
        return prisma.missionMemory.findMany({
            where: { userId },
            include: {
                images: true, // 이미지 포함
                dailyMission: {
                    include: {
                        missionTemplate: true
                    }
                }
            },
            orderBy: { createdAt: 'asc' } // 오래된 순으로 정렬
        });
    },

    // 사용자의 총 추억 개수 조회
    countByUserId: async (userId) => {
        return prisma.missionMemory.count({
            where: { userId }
        });
    },

    // 특정 미션 추억 조회
    findById: async (id) => {
        const memory = await prisma.missionMemory.findUnique({
            where: { id },
            include: {
                dailyMission: {
                    include: {
                        missionTemplate: true
                    }
                },
                images: true
            }
        });

        if (!memory) {
            return null;
        }

        // 이미지 SAS URL 리프레시
        const refreshedImages = await refreshMissionImageUrlsIfExpired(memory.images);

        return {
            ...memory,
            images: refreshedImages
        };
    },

    // 미션 추억 좋아요 토글
    toggleLike: async (memoryId) => {
        const memory = await prisma.missionMemory.findUnique({
            where: { id: memoryId }
        });

        if (!memory) {
            throw new Error('해당 미션 추억을 찾을 수 없습니다.');
        }

        return await prisma.missionMemory.update({
            where: { id: memoryId },
            data: { isLiked: !memory.isLiked },
        });
    },

    // 특정 일일 미션의 추억 조회
    findByDailyMissionId: async (dailyMissionId) => {
        const memory = await prisma.missionMemory.findUnique({
            where: { dailyMissionId },
            include: {
                dailyMission: {
                    include: {
                        missionTemplate: true
                    }
                },
                images: true
            }
        });

        if (!memory) {
            return null;
        }

        // 이미지 SAS URL 리프레시
        const refreshedImages = await refreshMissionImageUrlsIfExpired(memory.images);

        return {
            ...memory,
            images: refreshedImages
        };
    },

    // 미션 추억 생성
    create: async (data) => {
        return await prisma.missionMemory.create({
            data,
            include: {
                dailyMission: {
                    include: {
                        missionTemplate: true
                    }
                },
                images: true
            }
        });
    },

    // 미션 추억 업데이트
    update: async (id, data) => {
        return await prisma.missionMemory.update({
            where: { id },
            data,
            include: {
                dailyMission: {
                    include: {
                        missionTemplate: true
                    }
                },
                images: true
            }
        });
    },

    // 미션 추억 삭제
    delete: async (id) => {
        return await prisma.missionMemory.delete({
            where: { id }
        });
    },

    // SAS URL 수동 재생성
    regenerateSasUrlsForMissionMemory: async (missionMemoryId) => {
        const images = await prisma.missionImage.findMany({
            where: { missionMemoryId: parseInt(missionMemoryId) }
        });

        if (images.length === 0) {
            return { message: '미션 이미지가 없습니다' };
        }

        // 각 이미지 URL 리프레시
        await refreshMissionImageUrlsIfExpired(images);

        return { 
            success: true, 
            message: `${images.length}개의 미션 이미지 SAS URL이 갱신되었습니다` 
        };
    }
};

// 미션 이미지 관련 함수들
const missionImageRepository = {
    // 특정 미션 추억의 모든 이미지 조회
    findByMissionMemoryId: async (missionMemoryId) => {
        return await prisma.missionImage.findMany({
            where: { missionMemoryId },
            orderBy: { createdAt: 'asc' }
        });
    },

    // 특정 미션 이미지 조회
    findById: async (id) => {
        return await prisma.missionImage.findUnique({
            where: { id },
            include: {
                missionMemory: true
            }
        });
    },

    // 미션 이미지 생성
    create: async (data) => {
        return await prisma.missionImage.create({
            data
        });
    },

    // 미션 이미지 여러개 생성
    createMany: async (data) => {
        return await prisma.missionImage.createMany({
            data
        });
    },

    // 미션 이미지 업데이트
    update: async (id, data) => {
        return await prisma.missionImage.update({
            where: { id },
            data
        });
    },

    // 미션 이미지 삭제
    delete: async (id) => {
        return await prisma.missionImage.delete({
            where: { id }
        });
    },

    // 특정 미션 추억의 모든 이미지 삭제
    deleteByMissionMemoryId: async (missionMemoryId) => {
        return await prisma.missionImage.deleteMany({
            where: { missionMemoryId }
        });
    }
};

// 미션 이미지 SAS URL 리프레시 (간소화된 버전 - storageRepository 범용 함수 사용)
const refreshMissionImageUrlsIfExpired = async (imagesArray) => {
    if (!imagesArray || imagesArray.length === 0) return imagesArray;

    // 각 미션 이미지의 URL을 개별적으로 처리
    const refreshedImages = await Promise.all(
        imagesArray.map(async (image) => {
            const newUrl = await storageRepository.refreshUrlIfExpired(
                image.imageUrl,
                async (oldUrl, newUrl) => {
                    // DB 업데이트 콜백
                    await prisma.missionImage.update({
                        where: { id: image.id },
                        data: { 
                            imageUrl: newUrl,
                            updatedAt: new Date()
                        }
                    });
                }
            );

            return { ...image, imageUrl: newUrl };
        })
    );

    return refreshedImages;
};

module.exports = {
    missionTemplateRepository,
    dailyMissionRepository,
    missionMemoryRepository,
    missionImageRepository
}; 