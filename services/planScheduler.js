const cron = require('node-cron');
const { logger } = require('../config/logger');
const plansRepository = require('../repository/plansRepository');
const notificationsServices = require('./notificationsServices');
const { getKoreaNow, getKoreaTimeString } = require('../config/dateUtils');

// 스케줄러 인터벌 ID
let schedulerInterval = null;

// reminderAt 기반 계획 알림 생성
const createReminderNotification = async (plan) => {
	try {
		const timeString = plan.time ? 
			new Date(plan.time).toLocaleTimeString('ko-KR', { 
				hour: '2-digit', 
				minute: '2-digit',
				hour12: false 
			}) : '시간 미정';
		
		const title = '곧 시작될 계획이 있습니다';
		const body = `📅 ${plan.title}${plan.time ? ` - ${timeString}` : ''}${plan.location ? ` (${plan.location})` : ''}`;
		
		// 알림 생성
		await notificationsServices.createPlanReminderNotification(
			plan.userId,
			plan.title,
			plan.id,
			plan.date
		);

		// 알림 발송 상태 업데이트
		await plansRepository.updateReminderSent(plan.id);

		logger.info(`계획 알림 생성 완료: 사용자 ${plan.userId}, 계획 "${plan.title}"`);
		
		return true;
	} catch (error) {
		logger.error(`계획 알림 생성 실패: 계획 ID ${plan.id}`, error);
		return false;
	}
};

// reminderAt 시간이 된 계획들 확인 및 알림 발송
const checkAndSendReminders = async () => {
	try {
		const startTime = Date.now();
		
		// reminderAt 시간이 된 계획들 조회
		const plansToRemind = await plansRepository.findPlansWithReminders();
		
		if (plansToRemind.length === 0) {
			logger.debug('알림을 보낼 계획이 없습니다.');
			return { success: true, count: 0 };
		}

		logger.info(`${plansToRemind.length}개의 계획 알림 발송 시작`);

		let successCount = 0;
		let failCount = 0;

		// 각 계획에 대해 알림 발송
		for (const plan of plansToRemind) {
			const success = await createReminderNotification(plan);
			if (success) {
				successCount++;
			} else {
				failCount++;
			}
		}

		const endTime = Date.now();
		const duration = endTime - startTime;

		logger.info(`계획 알림 발송 완료 (${duration}ms): 성공 ${successCount}개, 실패 ${failCount}개`);
		
		return { 
			success: true, 
			count: successCount, 
			failed: failCount,
			total: plansToRemind.length
		};
	} catch (error) {
		logger.error('계획 알림 발송 중 오류:', error);
		return { success: false, error: error.message };
	}
};

// 특정 사용자에 대해 reminderAt 시간이 된 계획들 확인 및 알림 발송
const checkAndSendRemindersForUser = async (userId) => {
	try {
		const startTime = Date.now();
		
		// 특정 사용자의 알림 보낼 계획 조회
		const plansToRemind = await plansRepository.findPlansWithRemindersByUserId(userId);
		
		if (plansToRemind.length === 0) {
			logger.debug(`사용자 ${userId}: 알림을 보낼 계획이 없습니다.`);
			return { success: true, count: 0 };
		}

		logger.info(`사용자 ${userId}: ${plansToRemind.length}개의 계획 알림 발송 시작`);

		let successCount = 0;
		let failCount = 0;

		for (const plan of plansToRemind) {
			const success = await createReminderNotification(plan);
			if (success) {
				successCount++;
			} else {
				failCount++;
			}
		}

		const endTime = Date.now();
		const duration = endTime - startTime;

		logger.info(`사용자 ${userId} 계획 알림 발송 완료 (${duration}ms): 성공 ${successCount}개, 실패 ${failCount}개`);
		
		return { 
			success: true, 
			count: successCount, 
			failed: failCount,
			total: plansToRemind.length
		};
	} catch (error) {
		logger.error(`사용자 ${userId} 계획 알림 발송 중 오류:`, error);
		return { success: false, error: error.message };
	}
};

// 스케줄러 실행 체크 (매 30분마다)
const runReminderScheduler = async () => {
	try {
		const now = getKoreaNow();
		logger.debug(`⏰ 계획 알림 스케줄러 실행: ${now.toISOString()}`);
		await checkAndSendReminders();
	} catch (error) {
		logger.error('계획 알림 스케줄러 실행 중 오류:', error);
	}
};

// 스케줄러 시작
const startScheduler = () => {
	if (schedulerInterval) {
		logger.warn('스케줄러가 이미 실행 중입니다.');
		return;
	}

	logger.info('📅 계획 알림 스케줄러 시작 (매 30분마다 실행)');
	
	// 매 30분마다 실행 (0분, 30분)
	schedulerInterval = cron.schedule('0,30 * * * *', runReminderScheduler);
	
	// 서버 시작 시 즉시 한 번 실행
	runReminderScheduler();
};

// 스케줄러 중지
const stopScheduler = () => {
	if (schedulerInterval) {
		schedulerInterval.destroy();
		schedulerInterval = null;
		logger.info('계획 알림 스케줄러가 중지되었습니다.');
	}
};

module.exports = {
	startScheduler,
	stopScheduler,
	checkAndSendReminders,
	checkAndSendRemindersForUser
}; 