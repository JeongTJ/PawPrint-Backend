const { 
    missionTemplateRepository, 
    dailyMissionRepository, 
    missionMemoryRepository,
    missionImageRepository 
} = require('../repository/missionRepository');
const contentsRepository = require('../repository/contentsRepository'); // 추가
const { getKoreaTodayStart, getKoreaNow, formatKoreaDate, getUTCDateFromString } = require('../config/dateUtils');
const { uploadFile, uploadMultipleFiles, deleteFile, copyBlob } = require('../repository/storageRepository'); // copyBlob 추가
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

// 미션 추억 객체 포맷팅 헬퍼 함수
const _formatMemory = (memory, index) => {
    if (!memory) return null;
    
    const {
        id,
        content,
        isLiked, // isLiked 추가
        images,
        userId,
        dailyMissionId,
        createdAt,
        updatedAt,
        dailyMission
    } = memory;
    
    return {
        id,
        memoryNumber: index !== undefined ? index + 1 : undefined,
        content,
        isLiked, // isLiked 추가
        images: images ? images.map(image => image.imageUrl) : [],
        userId,
        dailyMissionId,
        createdAt,
        updatedAt,
        dailyMission
    };
};


// 미션 추억 관련 서비스
const missionMemoryService = {
    // 사용자의 모든 미션 추억 조회
    getUserMissionMemories: async (userId) => {
        try {
            const memories = await missionMemoryRepository.findByUserId(userId);
            // 각 추억에 번호를 부여하고 포맷팅
            const formattedMemories = memories.map(_formatMemory);

            // 최신순으로 정렬하여 반환
            formattedMemories.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            return { success: true, data: formattedMemories };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // 미션 추억 좋아요 토글
    toggleMissionMemoryLike: async (memoryId, userId) => {
        try {
            // 1. 추억이 존재하는지, 그리고 내 소유인지 확인
            const memory = await missionMemoryRepository.findById(memoryId);
            if (!memory) {
                return { success: false, error: '해당 미션 추억을 찾을 수 없습니다.' };
            }
            if (memory.userId !== userId) {
                return { success: false, error: '자신의 미션 추억만 좋아요를 누를 수 있습니다.' };
            }

            // 2. 좋아요 상태 토글
            const updatedMemory = await missionMemoryRepository.toggleLike(memoryId);

            return { success: true, data: updatedMemory };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    /**
     * 미션 추억을 커뮤니티 게시물로 공유합니다.
     * @param {number} userId - 작업을 요청한 사용자 ID
     * @param {number} memoryId - 공유할 미션 추억 ID
     * @returns {Promise<{success: boolean, data?: any, error?: string}>}
     */
    shareMemoryToCommunity: async (userId, memoryId) => {
        try {
            // 1. 원본 미션 추억 조회
            const memory = await missionMemoryRepository.findById(memoryId);
            if (!memory || !memory.content) { // memory.content가 있는지도 확인
                return { success: false, error: '공유할 미션 추억 또는 내용이 없습니다.' };
            }
            if (memory.userId !== userId) {
                return { success: false, error: '자신의 미션 추억만 공유할 수 있습니다.' };
            }

            // 2. 이미지 파일 복제
            const sourceImageUrls = memory.images.map(img => img.imageUrl);
            const copyPromises = sourceImageUrls.map(url => copyBlob(url, 'contents-images'));
            const newImageUrls = await Promise.all(copyPromises);
            
            // 3. 복제된 이미지 URL과 원본 추억의 본문을 사용하여 새 게시물 생성
            const newContentData = {
                userId,
                body: memory.content, // 원본 추억의 content를 사용
                category: 'COMMUNITY'  // 공유 게시물은 'COMMUNITY' 카테고리로 고정
            };
            const newImageObjects = newImageUrls.map(url => ({
                url: url,
                type: 'image'
            }));

            const newContent = await contentsRepository.createContentWithMedia(newContentData, newImageObjects);

            return { success: true, data: newContent };
        } catch (error) {
            console.error(`Error sharing memory to community:`, error);
            return { success: false, error: '미션 추억 공유 중 오류가 발생했습니다.' };
        }
    },

    // 미션 추억 생성
    createMissionMemory: async (userId, memoryData, files) => {
        try {
            const { dailyMissionId, content } = memoryData;

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

            // 미션 추억 생성
            const memory = await missionMemoryRepository.create({
                userId,
                dailyMissionId,
                content
            });

            // 파일들이 있으면 업로드 후 저장
            if (files && files.length > 0) {
                const imageUrls = await uploadMultipleFiles(files, 'mission-images');
                const imageData = imageUrls.map(url => ({
                    missionMemoryId: memory.id,
                    imageUrl: url
                }));
                await missionImageRepository.createMany(imageData);
            }
            
            // 생성 후 총 추억 개수 카운트
            const totalMemories = await missionMemoryRepository.countByUserId(userId);
            const finalMemory = await missionMemoryRepository.findById(memory.id);

            const formattedMemory = {
                ..._formatMemory(finalMemory),
                memoryNumber: totalMemories // 새로 생성된 것이므로 마지막 번호
            };

            return { success: true, data: formattedMemory };
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

            const { content } = memoryData;

            // 미션 추억 내용 업데이트
            await missionMemoryRepository.update(memoryId, { content });

            // 업데이트된 추억의 번호를 찾기 위해 전체 목록 조회
            const allUserMemories = await missionMemoryRepository.findByUserId(userId);
            const memoryIndex = allUserMemories.findIndex(m => m.id === memoryId);

            // 최종 데이터 조회 (이미지 포함)
            const finalMemory = await missionMemoryRepository.findById(memoryId);
            const formattedMemory = _formatMemory(finalMemory, memoryIndex);
            
            return { success: true, data: formattedMemory };
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

            // 관련 이미지들도 먼저 삭제 (CASCADE로 자동 삭제되지만 명시적으로 처리)
            await missionImageRepository.deleteByMissionMemoryId(memoryId);
            
            // 미션 추억 삭제
            await missionMemoryRepository.delete(memoryId);
            
            return { success: true, message: '미션 추억이 삭제되었습니다.' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

// 미션 이미지 관련 서비스
const missionImageService = {
    // 특정 미션 추억의 모든 이미지 조회
    getMissionImages: async (missionMemoryId, userId) => {
        try {
            // 미션 추억 권한 확인
            const missionMemory = await missionMemoryRepository.findById(missionMemoryId);
            if (!missionMemory) {
                return { success: false, error: '해당 미션 추억을 찾을 수 없습니다.' };
            }

            if (missionMemory.userId !== userId) {
                return { success: false, error: '해당 추억에 대한 권한이 없습니다.' };
            }

            const images = await missionImageRepository.findByMissionMemoryId(missionMemoryId);
            return { success: true, data: images };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },



    // 미션 이미지 추가 (파일 업로드 방식)
    uploadMissionImage: async (missionMemoryId, userId, file) => {
        try {
            // 미션 추억 권한 확인
            const missionMemory = await missionMemoryRepository.findById(missionMemoryId);
            if (!missionMemory) {
                return { success: false, error: '해당 미션 추억을 찾을 수 없습니다.' };
            }

            if (missionMemory.userId !== userId) {
                return { success: false, error: '해당 추억에 대한 권한이 없습니다.' };
            }

            if (!file) {
                return { success: false, error: '이미지 파일이 필요합니다.' };
            }

            // 파일 업로드
            const imageUrl = await uploadFile(
                file.buffer, 
                file.originalname, 
                file.mimetype, 
                'mission-images'
            );

            // 데이터베이스에 저장
            const image = await missionImageRepository.create({
                missionMemoryId,
                imageUrl
            });

            return { success: true, data: image };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // 미션 이미지 여러 개 업로드
    uploadMultipleMissionImages: async (missionMemoryId, userId, files) => {
        try {
            // 미션 추억 권한 확인
            const missionMemory = await missionMemoryRepository.findById(missionMemoryId);
            if (!missionMemory) {
                return { success: false, error: '해당 미션 추억을 찾을 수 없습니다.' };
            }

            if (missionMemory.userId !== userId) {
                return { success: false, error: '해당 추억에 대한 권한이 없습니다.' };
            }

            if (!files || files.length === 0) {
                return { success: false, error: '이미지 파일이 필요합니다.' };
            }

            // 여러 파일 업로드
            const imageUrls = await uploadMultipleFiles(files, 'mission-images');

            // 데이터베이스에 저장
            const imageData = imageUrls.map(url => ({
                missionMemoryId,
                imageUrl: url
            }));

            await missionImageRepository.createMany(imageData);

            // 저장된 이미지들 조회
            const images = await missionImageRepository.findByMissionMemoryId(missionMemoryId);
            
            return { success: true, data: images };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // 미션 이미지 삭제
    deleteMissionImage: async (imageId, userId) => {
        try {
            const image = await missionImageRepository.findById(imageId);
            if (!image) {
                return { success: false, error: '해당 이미지를 찾을 수 없습니다.' };
            }

            // 미션 추억 권한 확인
            if (image.missionMemory.userId !== userId) {
                return { success: false, error: '해당 이미지에 대한 권한이 없습니다.' };
            }

            // Azure Storage에서 파일 삭제
            await deleteFile(image.imageUrl, 'mission-images');

            // 데이터베이스에서 삭제
            await missionImageRepository.delete(imageId);
            
            return { success: true, message: '이미지가 삭제되었습니다.' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

module.exports = {
    missionTemplateService,
    dailyMissionService,
    missionMemoryService,
    missionImageService
}; 