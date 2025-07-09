const plansRepository = require('../repository/plansRepository');
const { getKoreaTodayStart, getKoreaNow, getKoreaDayStart, getUTCDateFromString, createKoreaDateTime } = require('../config/dateUtils');
const moment = require('moment-timezone');

// 알림 시간 계산 유틸리티
const calculateReminderAt = (planDate, planTime, reminderOption) => {
	if (!reminderOption) return null;

	const minutes = parseInt(reminderOption, 10);
	if (isNaN(minutes) || minutes <= 0) {
		// 유효하지 않은 분 값은 무시
		return null;
	}

	try {
		// 한국 시간 기준으로 planDateTime 생성
		const planDateTime = moment.tz(
			planDate + ' ' + (planTime || '09:00:00'),
			'YYYY-MM-DD HH:mm:ss',
			'Asia/Seoul'
		);

		// 분 단위로 알림 시간 계산
		const reminderDateTime = planDateTime.clone().subtract(minutes, 'minutes');
		return reminderDateTime.toISOString();
	} catch (error) {
		console.error('reminderAt 계산 오류:', error);
		return null;
	}
};

// 입력 검증 함수들
const validatePlanData = (planData) => {
	const { title, date, time } = planData;

	if (title === null || title.trim().length === 0) {
		const error = new Error('제목을 입력해주세요');
		error.statusCode = 400;
		throw error;
	}

	if (title.length > 100) {
		const error = new Error('제목은 100자 이하로 입력해주세요');
		error.statusCode = 400;
		throw error;
	}

	if (!date) {
		const error = new Error('날짜를 입력해주세요');
		error.statusCode = 400;
		throw error;
	}

	// 날짜 및 시간 형식 검증 (YYYY-MM-DD, HH:mm:ss)
	const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
	if (!dateRegex.test(date) || !moment(date, 'YYYY-MM-DD').isValid()) {
		const error = new Error('올바른 날짜 형식이 아닙니다 (YYYY-MM-DD)');
		error.statusCode = 400;
		throw error;
	}

	if (time) {
		const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])$/;
		if (!timeRegex.test(time)) {
			const error = new Error('올바른 시간 형식이 아닙니다 (HH:mm:ss)');
			error.statusCode = 400;
			throw error;
		}
	}

	// 날짜/시간 과거 여부 검증 (한국 시간 기준)
	const now = moment().tz('Asia/Seoul');
	const todayDateString = now.format('YYYY-MM-DD');

	// 1. 과거 날짜는 불가
	if (date < todayDateString) {
		const error = new Error('과거 날짜에는 일정을 생성할 수 없습니다');
		error.statusCode = 400;
		throw error;
	}

	// 2. 오늘 날짜인 경우, 과거 시간은 불가
	if (date === todayDateString && time) {
		const planDateTime = moment.tz(`${date} ${time}`, 'YYYY-MM-DD HH:mm:ss', 'Asia/Seoul');
		if (planDateTime.isBefore(now)) {
			const error = new Error('현재 시간 이후의 시간으로만 일정을 생성할 수 있습니다');
			error.statusCode = 400;
			throw error;
		}
	}

	return true;
};

const validateReminderAt = (reminderAt) => {
	if (!reminderAt) return true;
	
	// 날짜 형식 검증
	const reminderDate = new Date(reminderAt);
	if (isNaN(reminderDate.getTime())) {
		const error = new Error('올바른 알림 시간 형식이 아닙니다');
		error.statusCode = 400;
		throw error;
	}
	
	// 과거 시간은 허용하지 않음 - 한국 시간 기준
	const now = getKoreaNow();
	if (reminderDate <= now) {
		const error = new Error('과거 시간에는 알림을 설정할 수 없습니다');
		error.statusCode = 400;
		throw error;
	}
	
	return true;
};

const checkPermission = async (planId, userId) => {
	const plan = await plansRepository.findById(planId);
	
	if (!plan) {
		const error = new Error('계획을 찾을 수 없습니다');
		error.statusCode = 404;
		throw error;
	}
	
	if (plan.userId !== parseInt(userId)) {
		const error = new Error('이 계획에 대한 권한이 없습니다');
		error.statusCode = 403;
		throw error;
	}
	
	return plan;
};

// 모든 계획 조회 (관리자용)
const findAll = async () => {
	return await plansRepository.findAll();
};

// 사용자의 모든 계획 조회
const findByUserId = async (userId) => {
	if (!userId) {
		const error = new Error('사용자 ID가 필요합니다');
		error.statusCode = 400;
		throw error;
	}
	
	return await plansRepository.findByUserId(userId);
};

// 특정 계획 조회
const findById = async (id) => {
	if (!id) {
		const error = new Error('계획 ID가 필요합니다');
		error.statusCode = 400;
		throw error;
	}
	
	const plan = await plansRepository.findById(id);
	
	if (!plan) {
		const error = new Error('계획을 찾을 수 없습니다');
		error.statusCode = 404;
		throw error;
	}
	
	return plan;
};

// 새 계획 생성
const create = async (userId, planData) => {
	// 입력 검증
	console.log('planData', planData);
	validatePlanData(planData);
	
	const {
		title,
		description,
		date,
		time,
		reminderOption
	} = planData;
	
	// reminderAt 계산 (reminderOption이 있으면 자동 계산)
	let calculatedReminderAt = null;
	if (reminderOption) {
		calculatedReminderAt = calculateReminderAt(date, time, reminderOption);
	}
	console.log('calculatedReminderAt', calculatedReminderAt);
	// reminderAt 검증
	if (calculatedReminderAt) {
		validateReminderAt(calculatedReminderAt);
	}
	
	// 데이터 정리
	const cleanedData = {
		userId: parseInt(userId),
		title: title.trim(),
		description: description?.trim() || null,
		date,
		time,
		reminderAt: calculatedReminderAt || null
	};
	
	// 계획 생성
	const newPlan = await plansRepository.create(cleanedData);
	
	// 생성된 계획을 다시 조회
	return await plansRepository.findById(newPlan.id);
};

// 계획 수정
const update = async (id, userId, planData) => {
	// 권한 확인
	const existingPlan = await checkPermission(id, userId);

	// 수정할 데이터가 있는지 확인
	if (Object.keys(planData).length === 0) {
		const error = new Error('수정할 데이터가 없습니다');
		error.statusCode = 400;
		throw error;
	}

	// 데이터 유효성 검증을 위한 객체 생성
	const dataToValidate = {
		title: planData.title !== undefined ? planData.title : existingPlan.title,
		date: planData.date !== undefined ? planData.date : existingPlan.date,
		time: planData.time !== undefined ? planData.time : existingPlan.time,
	};
	validatePlanData(dataToValidate);

	// reminderAt 계산 (reminderOption이 있으면 자동 계산)
	let calculatedReminderAt = undefined;
	if (planData.reminderOption !== undefined) {
		if (planData.reminderOption === null) {
			calculatedReminderAt = null; // 알림 제거
		} else {
			const newDate = planData.date || existingPlan.date;
			const newTime = planData.time || existingPlan.time;
			calculatedReminderAt = calculateReminderAt(newDate, newTime, planData.reminderOption);
			// reminderAt 유효성 검증
			validateReminderAt(calculatedReminderAt);
		}
	}

	// 데이터 정리
	const cleanedData = { ...planData };
	if (cleanedData.title) cleanedData.title = cleanedData.title.trim();
	if (cleanedData.description) cleanedData.description = cleanedData.description.trim();
	if (calculatedReminderAt !== undefined) {
		cleanedData.reminderAt = calculatedReminderAt;
	}
	delete cleanedData.reminderOption; // DB에 저장하지 않음

	// 계획 수정
	const updatedPlan = await plansRepository.update(id, cleanedData);

	// 수정된 계획을 다시 조회하여 반환
	return await plansRepository.findById(updatedPlan.id);
};

// 계획 삭제
const remove = async (id, userId) => {
	// 권한 확인
	await checkPermission(id, userId);
	
	return await plansRepository.remove(id, userId);
};

// 계획 완료 상태 토글
const toggleComplete = async (id, userId) => {
	// 권한 확인
	await checkPermission(id, userId);
	
	return await plansRepository.toggleComplete(id);
};

// 특정 날짜의 모든 계획 조회 (YYYY-MM-DD)
const findByDate = async (userId, date) => {
	if (!userId) {
		const error = new Error('사용자 ID가 필요합니다');
		error.statusCode = 400;
		throw error;
	}

	// 날짜 형식 검증
	const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
	if (!dateRegex.test(date)) {
		const error = new Error('올바른 날짜 형식이 아닙니다 (YYYY-MM-DD)');
		error.statusCode = 400;
		throw error;
	}

	return await plansRepository.findByDate(userId, date);
};

// 특정 기간의 모든 계획 조회 (YYYY-MM-DD)
const findByDateRange = async (userId, startDate, endDate) => {
	if (!userId) {
		const error = new Error('사용자 ID가 필요합니다');
		error.statusCode = 400;
		throw error;
	}

	// 날짜 형식 검증
	const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
	if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
		const error = new Error('올바른 날짜 형식이 아닙니다 (YYYY-MM-DD)');
		error.statusCode = 400;
		throw error;
	}

	if (startDate > endDate) {
		const error = new Error('시작 날짜는 종료 날짜보다 이전이어야 합니다');
		error.statusCode = 400;
		throw error;
	}

	return await plansRepository.findByDateRange(userId, startDate, endDate);
};

// 한 달 기간 내 날짜 범위별 계획 조회
const findByDateRangeWithinMonth = async (userId, startDate, endDate) => {
	if (!userId) {
		const error = new Error('사용자 ID가 필요합니다');
		error.statusCode = 400;
		throw error;
	}
	
	if (!startDate || !endDate) {
		const error = new Error('시작일과 종료일이 필요합니다');
		error.statusCode = 400;
		throw error;
	}
	
	const start = new Date(startDate);
	const end = new Date(endDate);
	
	if (isNaN(start.getTime()) || isNaN(end.getTime())) {
		const error = new Error('올바른 날짜 형식이 아닙니다');
		error.statusCode = 400;
		throw error;
	}
	
	if (start > end) {
		const error = new Error('시작일이 종료일보다 늦을 수 없습니다');
		error.statusCode = 400;
		throw error;
	}
	
	// 한 달 기간 내 검증: 시작일과 종료일이 같은 년월에 속해야 함
	const startYear = start.getFullYear();
	const startMonth = start.getMonth();
	const endYear = end.getFullYear();
	const endMonth = end.getMonth();
	
	if (startYear !== endYear || startMonth !== endMonth) {
		const error = new Error('날짜 범위는 같은 월 내에서만 조회 가능합니다');
		error.statusCode = 400;
		throw error;
	}
	
	return await plansRepository.findByDateRange(userId, startDate, endDate);
};

// 특정 월의 모든 계획 조회 (YYYY, M)
const findByMonth = async (userId, year, month) => {
	if (!userId) {
		const error = new Error('사용자 ID가 필요합니다');
		error.statusCode = 400;
		throw error;
	}

	// moment를 사용하여 해당 월의 시작일과 마지막일 계산
	const startOfMonth = moment({ year, month: month - 1 }).startOf('month').format('YYYY-MM-DD');
	const endOfMonth = moment({ year, month: month - 1 }).endOf('month').format('YYYY-MM-DD');

	return await plansRepository.findByDateRange(userId, startOfMonth, endOfMonth);
};

// 특정 주의 모든 계획 조회 (시작일 기준 YYYY-MM-DD)
const findByWeek = async (userId, startDate) => {
	if (!userId) {
		const error = new Error('사용자 ID가 필요합니다');
		error.statusCode = 400;
		throw error;
	}

	// 날짜 형식 검증
	const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
	if (!dateRegex.test(startDate)) {
		const error = new Error('올바른 날짜 형식이 아닙니다 (YYYY-MM-DD)');
		error.statusCode = 400;
		throw error;
	}

	const endDate = moment(startDate).add(6, 'days').format('YYYY-MM-DD');
	return await plansRepository.findByDateRange(userId, startDate, endDate);
};

// 오늘 계획 조회
const findToday = async (userId) => {
	if (!userId) {
		const error = new Error('사용자 ID가 필요합니다');
		error.statusCode = 400;
		throw error;
	}
	const today = moment().tz('Asia/Seoul').format('YYYY-MM-DD');
	return await plansRepository.findByDate(userId, today);
};

// 다가오는 계획 조회 (기본 7일)
const findUpcoming = async (userId, days = 7) => {
	if (!userId) {
		const error = new Error('사용자 ID가 필요합니다');
		error.statusCode = 400;
		throw error;
	}
	const startDate = moment().tz('Asia/Seoul').format('YYYY-MM-DD');
	const endDate = moment(startDate).add(days - 1, 'days').format('YYYY-MM-DD');
	return await plansRepository.findByDateRange(userId, startDate, endDate);
};

// 미완료 계획 조회
const findIncomplete = async (userId) => {
	if (!userId) {
		const error = new Error('사용자 ID가 필요합니다');
		error.statusCode = 400;
		throw error;
	}
	
	return await plansRepository.findIncomplete(userId);
};

// 알림 관련 함수들
const getPlansWithReminders = async () => {
	return await plansRepository.findPlansWithReminders();
};

module.exports = {
	findAll,
	findByUserId,
	findById,
	create,
	update,
	remove,
	toggleComplete,
	findByDate,
	findByDateRange,
	findByDateRangeWithinMonth,
	findByMonth,
	findByWeek,
	findToday,
	findUpcoming,
	findIncomplete,
	getPlansWithReminders,
	calculateReminderAt
};