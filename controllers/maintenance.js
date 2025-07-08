const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth');
const contentsRepository = require('../repository/contentsRepository');
const usersRepository = require('../repository/usersRepository');
const { missionMemoryRepository } = require('../repository/missionRepository');
const prisma = require('../config/dbConfig').prisma;

// POST /api/maintenance/refresh-all-sas - 전체 시스템의 만료된 SAS URL 갱신
router.post('/refresh-all-sas', authMiddleware, async (req, res) => {
    try {
        const results = {
            contents: { processed: 0, updated: 0 },
            missions: { processed: 0, updated: 0 },
            profiles: { processed: 0, updated: 0 },
            totalProcessed: 0,
            totalUpdated: 0
        };

        // 1. 컨텐츠 이미지 SAS URL 갱신
        console.log('🔄 컨텐츠 이미지 SAS URL 갱신 시작...');
        const allContents = await prisma.content.findMany({
            select: { id: true }
        });
        
        if (allContents.length > 0) {
            await Promise.all(
                allContents.map(async (content) => {
                    await contentsRepository.regenerateSasUrlsForContent(content.id);
                })
            );
            results.contents.processed = allContents.length;
        }

        // 2. 미션 이미지 SAS URL 갱신
        console.log('🔄 미션 이미지 SAS URL 갱신 시작...');
        const allMissionMemories = await prisma.missionMemory.findMany({
            select: { id: true }
        });
        
        if (allMissionMemories.length > 0) {
            await Promise.all(
                allMissionMemories.map(async (memory) => {
                    await missionMemoryRepository.regenerateSasUrlsForMissionMemory(memory.id);
                })
            );
            results.missions.processed = allMissionMemories.length;
        }

        // 3. 사용자 프로필 이미지 SAS URL 갱신
        console.log('🔄 사용자 프로필 이미지 SAS URL 갱신 시작...');
        const allUsers = await prisma.user.findMany({
            select: { id: true, profile: true },
            where: {
                profile: {
                    not: null
                }
            }
        });
        
        if (allUsers.length > 0) {
            await Promise.all(
                allUsers.map(user => usersRepository.refreshUserProfileIfExpired(user))
            );
            results.profiles.processed = allUsers.length;
        }

        // 4. 반려동물 프로필 이미지 SAS URL 갱신 (향후 추가 예정)
        // TODO: Pet 프로필 이미지 SAS URL 갱신 로직 추가

        results.totalProcessed = results.contents.processed + results.missions.processed + results.profiles.processed;
        
        console.log('✅ 전체 SAS URL 갱신 완료');
        
        res.json({
            code: 200,
            message: '전체 시스템의 SAS URL 갱신이 완료되었습니다.',
            result: results
        });
        
    } catch (error) {
        console.error('전체 SAS URL 갱신 오류:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
            message: error.message || 'Internal server error',
            result: null
        });
    }
});

// GET /api/maintenance/sas-status - 전체 시스템의 SAS URL 상태 확인
router.get('/sas-status', authMiddleware, async (req, res) => {
    try {
        const storageRepository = require('../repository/storageRepository');
        const status = {
            contents: { total: 0, expired: 0 },
            missions: { total: 0, expired: 0 },
            profiles: { total: 0, expired: 0 },
            summary: { total: 0, expired: 0 }
        };

        // 1. 컨텐츠 이미지 상태 확인
        const contentMedia = await prisma.media.findMany({
            select: { fileUrl: true }
        });
        
        status.contents.total = contentMedia.length;
        status.contents.expired = contentMedia.filter(media => 
            storageRepository.isSasUrlExpired(media.fileUrl)
        ).length;

        // 2. 미션 이미지 상태 확인
        const missionImages = await prisma.missionImage.findMany({
            select: { imageUrl: true }
        });
        
        status.missions.total = missionImages.length;
        status.missions.expired = missionImages.filter(image => 
            storageRepository.isSasUrlExpired(image.imageUrl)
        ).length;

        // 3. 사용자 프로필 이미지 상태 확인
        const userProfiles = await prisma.user.findMany({
            select: { profile: true },
            where: {
                profile: {
                    not: null
                }
            }
        });
        
        status.profiles.total = userProfiles.length;
        status.profiles.expired = userProfiles.filter(user => 
            storageRepository.isSasUrlExpired(user.profile)
        ).length;

        // 4. 전체 요약
        status.summary.total = status.contents.total + status.missions.total + status.profiles.total;
        status.summary.expired = status.contents.expired + status.missions.expired + status.profiles.expired;

        res.json({
            code: 200,
            message: '전체 시스템의 SAS URL 상태 조회가 완료되었습니다.',
            result: status
        });
        
    } catch (error) {
        console.error('SAS URL 상태 조회 오류:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
            message: error.message || 'Internal server error',
            result: null
        });
    }
});

module.exports = router; 