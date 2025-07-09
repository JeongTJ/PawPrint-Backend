const { prisma } = require('../config/dbConfig');
const { getKoreaTodayStart, getKoreaNow, getKoreaDayStart, getKoreaTimeString } = require('../config/dateUtils');

// 공통 Plan 필드 (location, reminderAt 등 불필요 필드 제외)
const basePlanFields = {
    id: true,
    userId: true,
    title: true,
    date: true,
    time: true,
    createdAt: true,
    updatedAt: true,
    description: true,
    isCompleted: true,
    reminderAt: true, // reminderAt 추가
    reminderSent: true
};

const planSelection = {
	id: true,
	userId: true,
	title: true,
	date: true,
	time: true,
	description: true,
	isCompleted: true,
	reminderAt: true,
	reminderSent: true,
	user: {
		select: {
			id: true,
			nickname: true,
		},
	},
};

// 모든 계획 조회 (관리자용)
const findAll = async () => {
	return await prisma.plan.findMany({
		select: planSelection,
		orderBy: { date: 'asc' },
	});
};

// 특정 사용자의 모든 계획 조회
const findByUserId = async (userId) => {
	return await prisma.plan.findMany({
		where: { userId: parseInt(userId) },
		select: planSelection,
		orderBy: [{ date: 'asc' }, { time: 'asc' }],
	});
};

// 특정 계획 조회
const findById = async (id) => {
	return await prisma.plan.findUnique({
		where: { id: parseInt(id) },
		select: planSelection,
	});
};

// 새 계획 생성
const create = async (planData) => {
	// planData에 reminderSent 필드를 명시적으로 추가
	const dataToCreate = {
		...planData,
		reminderSent: false // 생성 시 항상 false로 초기화
	};
	return await prisma.plan.create({
		data: dataToCreate
	});
};

// 계획 수정
const update = async (id, planData) => {
	const updateData = { ...planData };

	// reminderAt이 변경되면 reminderSent를 false로 리셋
	if (updateData.reminderAt !== undefined) {
		updateData.reminderSent = false;
	}

	return await prisma.plan.update({
		where: { id: parseInt(id) },
		data: {
			...updateData,
			updatedAt: new Date()
		}
	});
};

// 계획 완료 상태 토글
const toggleComplete = async (id) => {
	const currentPlan = await prisma.plan.findUnique({
		where: { id: parseInt(id) }
	});
	
	if (!currentPlan) {
		throw new Error('계획을 찾을 수 없습니다');
	}
	
	return await prisma.plan.update({
		where: { id: parseInt(id) },
		data: {
			isCompleted: !currentPlan.isCompleted,
			updatedAt: new Date()
		}
	});
};

// 계획 삭제
const remove = async (id, userId = null) => {
	const whereCondition = { id: parseInt(id) };
	if (userId) {
		whereCondition.userId = parseInt(userId);
	}
	
	const deletedPlan = await prisma.plan.delete({
		where: whereCondition
	});
	
	return deletedPlan;
};

// 특정 날짜의 계획들 조회
const findByDate = async (userId, date) => {
	return await prisma.plan.findMany({
		where: {
			userId: parseInt(userId),
			date: date, // 문자열 직접 비교
		},
		select: planSelection,
		orderBy: [{ time: 'asc' }],
	});
};

// 특정 기간의 계획들 조회
const findByDateRange = async (userId, startDate, endDate) => {
	return await prisma.plan.findMany({
		where: {
			userId: parseInt(userId),
			date: {
				gte: startDate, // 문자열 직접 비교
				lte: endDate,   // 문자열 직접 비교
			},
		},
		select: planSelection,
		orderBy: [{ date: 'asc' }, { time: 'asc' }],
	});
};

// 월별 계획 조회
const findByMonth = async (userId, year, month) => {
	const startDate = new Date(year, month - 1, 1); // month는 0부터 시작
	const endDate = new Date(year, month, 0); // 해당 월의 마지막 날
	
	return await findByDateRange(userId, startDate, endDate);
};

// 주간 계획 조회
const findByWeek = async (userId, startDate) => {
	const start = new Date(startDate);
	const end = new Date(start);
	end.setDate(start.getDate() + 6); // 7일 후
	
	return await findByDateRange(userId, start, end);
};

// 미완료된 계획들 조회 (오늘 이전)
const findIncomplete = async (userId) => {
	const today = getKoreaTimeString('YYYY-MM-DD');

	return await prisma.plan.findMany({
		where: {
			userId: parseInt(userId),
			isCompleted: false,
			date: {
				lt: today, // 오늘 이전 날짜
			},
		},
		select: planSelection,
		orderBy: {
			date: 'asc',
		},
	});
};

// 오늘의 계획들 조회
const findToday = async (userId) => {
	// 한국 시간 기준으로 오늘 날짜 계산
	const today = getKoreaTimeString('YYYY-MM-DD');
	
	return await findByDate(userId, today);
};

// 예정된 계획들 조회 (다가오는 7일)
const findUpcoming = async (userId, days = 7) => {
	const today = getKoreaTodayStart(); // 한국 시간 기준 오늘 0시
	
	const endDate = new Date(today);
	endDate.setDate(today.getDate() + days);
	
	return await findByDateRange(userId, today, endDate);
};

// 알림이 필요한 계획들 조회
const findPlansWithReminders = async () => {
	const now = getKoreaNow(); // 한국 현재 시간

	return await prisma.plan.findMany({
		where: {
			reminderAt: {
				lte: now, // 현재 시간보다 이전이거나 같은 알림 시간
			},
			reminderSent: false, // 아직 알림이 발송되지 않은 계획
			isCompleted: false, // 완료되지 않은 계획
		},
		select: planSelection,
	});
};

// 특정 사용자의 알림이 필요한 계획들 조회
const findPlansWithRemindersByUserId = async (userId) => {
	const now = getKoreaNow(); // 한국 현재 시간

	return await prisma.plan.findMany({
		where: {
			userId: parseInt(userId),
			reminderAt: {
				lte: now, // 현재 시간보다 이전이거나 같은 알림 시간
			},
			reminderSent: false, // 아직 알림이 발송되지 않은 계획
			isCompleted: false, // 완료되지 않은 계획
		},
		select: planSelection,
	});
};

// 계획 알림 발송 상태 업데이트
const updateReminderSent = async (planId) => {
	return await prisma.plan.update({
		where: { id: parseInt(planId) },
		data: { reminderSent: true }
	});
};

// 모든 사용자의 특정 날짜 계획 조회 (스케줄러용)
const findByDateForAllUsers = async (date) => {
	const targetDate = new Date(date);

	return await prisma.plan.findMany({
		where: {
			date: targetDate,
		},
		select: planSelection,
		orderBy: [{ userId: 'asc' }, { time: 'asc' }],
	});
};

module.exports = {
	findAll,
	findByUserId,
	findById,
	create,
	update,
	toggleComplete,
	remove,
	findByDate,
	findByDateRange,
	findByMonth,
	findByWeek,
	findIncomplete,
	findToday,
	findUpcoming,
	findPlansWithReminders,
	findPlansWithRemindersByUserId, // export 추가
	findByDateForAllUsers,
	updateReminderSent
};
