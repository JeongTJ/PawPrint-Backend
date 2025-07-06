const { PrismaClient } = require('@prisma/client');
const { getKoreaTodayStart, getKoreaNow } = require('../config/dateUtils');

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
	console.log('today', today);
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
    return await prisma.missionMemory.findMany({
      where: { userId },
      include: {
        dailyMission: {
          include: {
            missionTemplate: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  // 특정 미션 추억 조회
  findById: async (id) => {
    return await prisma.missionMemory.findUnique({
      where: { id },
      include: {
        dailyMission: {
          include: {
            missionTemplate: true
          }
        }
      }
    });
  },

  // 특정 일일 미션의 추억 조회
  findByDailyMissionId: async (dailyMissionId) => {
    return await prisma.missionMemory.findUnique({
      where: { dailyMissionId },
      include: {
        dailyMission: {
          include: {
            missionTemplate: true
          }
        }
      }
    });
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
        }
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
        }
      }
    });
  },

  // 미션 추억 삭제
  delete: async (id) => {
    return await prisma.missionMemory.delete({
      where: { id }
    });
  }
};

module.exports = {
  missionTemplateRepository,
  dailyMissionRepository,
  missionMemoryRepository
}; 