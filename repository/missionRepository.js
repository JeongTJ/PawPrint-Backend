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
  // 사용자의 모든 미션 추억 조회
  findByUserId: async (userId) => {
    const memories = await prisma.missionMemory.findMany({
      where: { userId },
      include: {
        dailyMission: {
          include: {
            missionTemplate: true
          }
        },
        images: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // SAS URL 재생성 로직 추가
    if (memories.length > 0) {
      await refreshExpiredMissionImageSasUrls(memories.map(m => m.id));
      
      // 최신 데이터 재조회
      return await prisma.missionMemory.findMany({
        where: { userId },
        include: {
          dailyMission: {
            include: {
              missionTemplate: true
            }
          },
          images: true
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    return memories;
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

    // SAS URL 재생성 로직 추가
    if (memory) {
      await refreshExpiredMissionImageSasUrls([memory.id]);
      
      // 최신 데이터 재조회
      return await prisma.missionMemory.findUnique({
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
    }

    return memory;
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

    // SAS URL 재생성 로직 추가
    if (memory) {
      await refreshExpiredMissionImageSasUrls([memory.id]);
      
      // 최신 데이터 재조회
      return await prisma.missionMemory.findUnique({
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
    }

    return memory;
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

    await refreshExpiredMissionImageSasUrls([parseInt(missionMemoryId)]);

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

// 미션 이미지들의 만료된 SAS URL을 재생성하는 헬퍼 함수
const refreshExpiredMissionImageSasUrls = async (missionMemoryIds) => {
  if (!Array.isArray(missionMemoryIds) || missionMemoryIds.length === 0) {
    return [];
  }

  // 현재 미션 이미지 정보 조회
  const currentImages = await prisma.missionImage.findMany({
    where: {
      missionMemoryId: {
        in: missionMemoryIds
      }
    },
    orderBy: [
      { missionMemoryId: 'asc' },
      { id: 'asc' }
    ]
  });

  const expiredImages = currentImages.filter(image => 
    storageRepository.isSasUrlExpired(image.imageUrl)
  );

  if (expiredImages.length === 0) {
    return currentImages; // 만료된 URL이 없으면 그대로 반환
  }

  console.log(`${expiredImages.length}개의 만료된 미션 이미지 SAS URL 발견, 재생성 중...`);

  // 만료된 URL들을 재생성
  const regenerateResult = await storageRepository.regenerateMultipleSasUrls(
    expiredImages.map(image => image.imageUrl),
    'mission-images'
  );

  // 성공적으로 재생성된 URL들을 DB에 업데이트
  try {
    await prisma.$transaction(async (tx) => {
      for (const {old: oldUrl, new: newUrl} of regenerateResult.success) {
        await tx.missionImage.updateMany({
          where: { imageUrl: oldUrl },
          data: { 
            imageUrl: newUrl,
            updatedAt: new Date()
          }
        });
      }
    });

    console.log(`${regenerateResult.success.length}개의 미션 이미지 SAS URL 재생성 및 DB 업데이트 완료`);

    if (regenerateResult.failed.length > 0) {
      console.warn(`${regenerateResult.failed.length}개의 미션 이미지 SAS URL 재생성 실패:`, regenerateResult.failed);
    }

    // DB 업데이트 후 최신 데이터 재조회
    const updatedImages = await prisma.missionImage.findMany({
      where: {
        missionMemoryId: {
          in: missionMemoryIds
        }
      },
      orderBy: [
        { missionMemoryId: 'asc' },
        { id: 'asc' }
      ]
    });

    return updatedImages;

  } catch (error) {
    console.error('미션 이미지 SAS URL DB 업데이트 실패:', error);
    return currentImages; // 실패 시 원본 데이터 반환
  }
};

module.exports = {
  missionTemplateRepository,
  dailyMissionRepository,
  missionMemoryRepository,
  missionImageRepository
}; 