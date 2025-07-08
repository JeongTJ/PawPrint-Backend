const plansRepository = require('../repository/plansRepository');
const { getKoreaTodayStart, getKoreaNow } = require('../config/dateUtils');

// 입력 검증 함수들
const validatePlanData = (planData) => {
	const { title, date, time } = planData;
	
	if (!title || title.trim().length === 0) {
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
	
	// 날짜 형식 검증
	const planDate = new Date(date);
	if (isNaN(planDate.getTime())) {
		const error = new Error('올바른 날짜 형식이 아닙니다');
		error.statusCode = 400;
		throw error;
	}
	
	// 시간 형식 검증
	if (time) {
		const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(:([0-5][0-9]))?$/;
		if (!timeRegex.test(time)) {
			const error = new Error('올바른 시간 형식이 아닙니다 (HH:MM 또는 HH:MM:SS)');
			error.statusCode = 400;
			throw error;
		}
	}
	
	// 과거 날짜는 허용하지 않음 (오늘은 허용) - 한국 시간 기준
	const today = getKoreaTodayStart();
	planDate.setHours(0, 0, 0, 0);
	
	if (planDate < today) {
		const error = new Error('과거 날짜에는 일정을 생성할 수 없습니다');
		error.statusCode = 400;
		throw error;
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
	validatePlanData(planData);
	validateReminderAt(planData.reminderAt);
	
	const {
		title,
		description,
		date,
		time,
		location,
		reminderAt
	} = planData;
	
	// 데이터 정리
	const cleanedData = {
		userId: parseInt(userId),
		title: title.trim(),
		description: description?.trim() || null,
		date,
		time,
		location: location?.trim() || null,
		reminderAt: reminderAt || null
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
	
	// 제목이나 날짜가 변경되는 경우 검증
	if (planData.title !== undefined || planData.date !== undefined) {
		const dataToValidate = {
			title: planData.title !== undefined ? planData.title : existingPlan.title,
			date: planData.date !== undefined ? planData.date : existingPlan.date
		};
		validatePlanData(dataToValidate);
	}
	
	// 알림 시간 검증
	if (planData.reminderAt !== undefined) {
		validateReminderAt(planData.reminderAt);
	}
	
	// 데이터 정리
	const updateData = {};
	if (planData.title !== undefined) updateData.title = planData.title.trim();
	if (planData.description !== undefined) updateData.description = planData.description?.trim() || null;
	if (planData.date !== undefined) updateData.date = planData.date;
	if (planData.time !== undefined) updateData.time = planData.time;
	if (planData.isCompleted !== undefined) updateData.isCompleted = planData.isCompleted;
	if (planData.location !== undefined) updateData.location = planData.location?.trim() || null;
	if (planData.reminderAt !== undefined) updateData.reminderAt = planData.reminderAt;
	
	// 계획 업데이트
	const updatedPlan = await plansRepository.update(id, updateData);
	
	// 업데이트된 계획을 다시 조회
	return await plansRepository.findById(id);
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

// 날짜별 계획 조회
const findByDate = async (userId, date) => {
	if (!userId) {
		const error = new Error('사용자 ID가 필요합니다');
		error.statusCode = 400;
		throw error;
	}
	
	if (!date) {
		const error = new Error('날짜가 필요합니다');
		error.statusCode = 400;
		throw error;
	}
	
	return await plansRepository.findByDate(userId, date);
};

// 기간별 계획 조회
const findByDateRange = async (userId, startDate, endDate) => {
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

// 월별 계획 조회
const findByMonth = async (userId, year, month) => {
	if (!userId) {
		const error = new Error('사용자 ID가 필요합니다');
		error.statusCode = 400;
		throw error;
	}
	
	if (!year || !month) {
		const error = new Error('년도와 월이 필요합니다');
		error.statusCode = 400;
		throw error;
	}
	
	const yearNum = parseInt(year);
	const monthNum = parseInt(month);
	
	if (yearNum < 1900 || yearNum > 2100) {
		const error = new Error('올바른 년도를 입력해주세요 (1900-2100)');
		error.statusCode = 400;
		throw error;
	}
	
	if (monthNum < 1 || monthNum > 12) {
		const error = new Error('올바른 월을 입력해주세요 (1-12)');
		error.statusCode = 400;
		throw error;
	}
	
	return await plansRepository.findByMonth(userId, yearNum, monthNum);
};

// 주간 계획 조회
const findByWeek = async (userId, startDate) => {
	if (!userId) {
		const error = new Error('사용자 ID가 필요합니다');
		error.statusCode = 400;
		throw error;
	}
	
	if (!startDate) {
		const error = new Error('시작 날짜가 필요합니다');
		error.statusCode = 400;
		throw error;
	}
	
	return await plansRepository.findByWeek(userId, startDate);
};

// 오늘의 계획 조회
const findToday = async (userId) => {
	if (!userId) {
		const error = new Error('사용자 ID가 필요합니다');
		error.statusCode = 400;
		throw error;
	}
	
	return await plansRepository.findToday(userId);
};

// 예정된 계획 조회
const findUpcoming = async (userId, days = 7) => {
	if (!userId) {
		const error = new Error('사용자 ID가 필요합니다');
		error.statusCode = 400;
		throw error;
	}
	
	return await plansRepository.findUpcoming(userId, days);
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
	getPlansWithReminders
};