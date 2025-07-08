const express = require('express');
const router = express.Router();

// 컨트롤러 가져오기
const authController = require('./auth');
const usersController = require('./users');
const contentsController = require('./contents');
const commentsController = require('./comments');
const plansController = require('./plans');
const missionController = require('./missions');
const notificationController = require('./notifications');
const maintenanceController = require('./maintenance');

// 인증 라우트
router.use('/auth', authController);

// 사용자 관리 라우트
router.use('/users', usersController);

// 콘텐츠 관리 라우트
router.use('/contents', contentsController);

// 댓글 관리 라우트
router.use('/comments', commentsController);

// 계획 관리 라우트
router.use('/plans', plansController);

// 미션 관리 라우트
router.use('/missions', missionController);

// 알림 관리 라우트 (Supabase 기반)
router.use('/notifications', notificationController);

// 유지보수 라우트
router.use('/maintenance', maintenanceController);

module.exports = router;