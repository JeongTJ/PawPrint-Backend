const { 
  missionTemplateRepository, 
  dailyMissionRepository, 
  missionMemoryRepository 
} = require('../repository/missionRepository');
const { getKoreaTodayStart, getKoreaNow, formatKoreaDate, getUTCDateFromString } = require('../config/dateUtils');
const moment = require('moment-timezone');

// 미션 템플릿 관련 서비스
const missionTemplateService = {
  // 모든 활성화된 미션 템플릿 조회
  getAllActiveTemplates: async () => {
    try {
      const templates = await missionTemplateRepository.findAllActive();
      return { success: true, data: templates };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // 미션 템플릿 생성
  createTemplate: async (templateData) => {
    try {
      const { category, title, description, order } = templateData;
      
      // 입력값 검증
      if (!category || !title || !description || order === undefined) {
        return { success: false, error: '필수 필드가 누락되었습니다.' };
      }

      const template = await missionTemplateRepository.create({
        category,
        title,
        description,
        order
      });

      return { success: true, data: template };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // 미션 템플릿 업데이트
  updateTemplate: async (id, templateData) => {
    try {
      const existingTemplate = await missionTemplateRepository.findById(id);
      if (!existingTemplate) {
        return { success: false, error: '해당 미션 템플릿을 찾을 수 없습니다.' };
      }

      const updatedTemplate = await missionTemplateRepository.update(id, templateData);
      return { success: true, data: updatedTemplate };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // 미션 템플릿 비활성화
  deactivateTemplate: async (id) => {
    try {
      const existingTemplate = await missionTemplateRepository.findById(id);
      if (!existingTemplate) {
        return { success: false, error: '해당 미션 템플릿을 찾을 수 없습니다.' };
      }

      const deactivatedTemplate = await missionTemplateRepository.deactivate(id);
      return { success: true, data: deactivatedTemplate };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// 일일 미션 관련 서비스
const dailyMissionService = {
  // 사용자의 오늘 일일 미션 조회 (없으면 생성)
  getTodayMissions: async (userId) => {
    try {
      let missions = await dailyMissionRepository.findTodayMissions(userId);
      
      // 오늘 미션이 없으면 생성
      if (missions.length === 0) {
        const createResult = await dailyMissionService.createTodayMissions(userId);
        if (!createResult.success) {
          return createResult;
        }
        missions = await dailyMissionRepository.findTodayMissions(userId);
      }

      return { success: true, data: missions };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // 사용자의 오늘 일일 미션 생성
  createTodayMissions: async (userId) => {
    try {
      const today = getKoreaTodayStart();
      
      // 이미 오늘 미션이 있는지 확인
      const existingMissions = await dailyMissionRepository.checkExistingMissions(userId, today);
      if (existingMissions) {
        return { success: false, error: '오늘 미션이 이미 존재합니다.' };
      }

      // 활성화된 미션 템플릿들 조회
      const templates = await missionTemplateRepository.findAllActive();
      if (templates.length === 0) {
        return { success: false, error: '활성화된 미션 템플릿이 없습니다.' };
      }

      // 랜덤하게 하나의 미션 선택 (또는 원하는 로직으로 수정 가능)
      const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
      
      const missionData = {
        userId,
        missionTemplateId: randomTemplate.id,
        date: today
      };

      const mission = await dailyMissionRepository.create(missionData);
      return { success: true, data: mission };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // 특정 날짜의 일일 미션 조회
  getMissionsByDate: async (userId, date) => {
    try {
      const targetDate = getUTCDateFromString(date);
      const missions = await dailyMissionRepository.findByUserAndDate(userId, targetDate);
      
      return { success: true, data: missions };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // 미션 기록 조회 (기간별)
  getMissionHistory: async (userId, startDate, endDate) => {
    try {
      const start = getUTCDateFromString(startDate);
      const end = getUTCDateFromString(endDate);
      
      const missions = await dailyMissionRepository.findMissionHistory(userId, start, end);
      return { success: true, data: missions };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // 일일 미션 완료/미완료 토글
  toggleMissionCompletion: async (missionId, userId) => {
    try {
      const mission = await dailyMissionRepository.findById(missionId);
      if (!mission) {
        return { success: false, error: '해당 미션을 찾을 수 없습니다.' };
      }

      if (mission.userId !== userId) {
        return { success: false, error: '해당 미션에 대한 권한이 없습니다.' };
      }

      const updatedMission = await dailyMissionRepository.updateCompletionStatus(
        missionId, 
        !mission.isCompleted
      );

      return { success: true, data: updatedMission };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// 미션 추억 관련 서비스
const missionMemoryService = {
  // 사용자의 모든 미션 추억 조회
  getUserMissionMemories: async (userId) => {
    try {
      const memories = await missionMemoryRepository.findByUserId(userId);
      return { success: true, data: memories };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // 미션 추억 생성
  createMissionMemory: async (userId, memoryData) => {
    try {
      const { dailyMissionId, content, imageUrl } = memoryData;

      // 입력값 검증
      if (!dailyMissionId || !content) {
        return { success: false, error: '필수 필드가 누락되었습니다.' };
      }

      // 일일 미션 존재 확인
      const dailyMission = await dailyMissionRepository.findById(dailyMissionId);
      if (!dailyMission) {
        return { success: false, error: '해당 일일 미션을 찾을 수 없습니다.' };
      }

      if (dailyMission.userId !== userId) {
        return { success: false, error: '해당 미션에 대한 권한이 없습니다.' };
      }

      // 미션이 완료되지 않았으면 완료 처리
      if (!dailyMission.isCompleted) {
        await dailyMissionRepository.updateCompletionStatus(dailyMissionId, true);
      }

      // 이미 추억이 있는지 확인
      const existingMemory = await missionMemoryRepository.findByDailyMissionId(dailyMissionId);
      if (existingMemory) {
        return { success: false, error: '이미 해당 미션의 추억이 존재합니다.' };
      }

      const memory = await missionMemoryRepository.create({
        userId,
        dailyMissionId,
        content,
        imageUrl
      });

      return { success: true, data: memory };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // 미션 추억 업데이트
  updateMissionMemory: async (memoryId, userId, memoryData) => {
    try {
      const existingMemory = await missionMemoryRepository.findById(memoryId);
      if (!existingMemory) {
        return { success: false, error: '해당 미션 추억을 찾을 수 없습니다.' };
      }

      if (existingMemory.userId !== userId) {
        return { success: false, error: '해당 추억에 대한 권한이 없습니다.' };
      }

      const updatedMemory = await missionMemoryRepository.update(memoryId, memoryData);
      return { success: true, data: updatedMemory };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // 미션 추억 삭제
  deleteMissionMemory: async (memoryId, userId) => {
    try {
      const existingMemory = await missionMemoryRepository.findById(memoryId);
      if (!existingMemory) {
        return { success: false, error: '해당 미션 추억을 찾을 수 없습니다.' };
      }

      if (existingMemory.userId !== userId) {
        return { success: false, error: '해당 추억에 대한 권한이 없습니다.' };
      }

      await missionMemoryRepository.delete(memoryId);
      return { success: true, message: '미션 추억이 삭제되었습니다.' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

module.exports = {
  missionTemplateService,
  dailyMissionService,
  missionMemoryService
}; 