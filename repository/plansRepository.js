const { prisma } = require('../config/dbConfig');
const { getKoreaTodayStart, getKoreaNow, getKoreaDayStart, getKoreaTimeString } = require('../config/dateUtils');

// 모든 계획 조회 (관리자용)
const findAll = async () => {
	return await prisma.plan.findMany({
		include: {
			user: {
				select: {
					id: true,
					loginId: true,
					nickname: true
				}
			},
			missions: {
				orderBy: { missionOrder: 'asc' }
			}
		},
		orderBy: { date: 'asc' }
	});
};

// 특정 사용자의 모든 계획 조회
const findByUserId = async (userId) => {
	return await prisma.plan.findMany({
		where: { userId: parseInt(userId) },
		include: {
			missions: {
				orderBy: { missionOrder: 'asc' }
			}
		},
		orderBy: [
			{ date: 'asc' },
			{ time: 'asc' }
		]
	});
};

// 특정 계획 조회
const findById = async (id) => {
	return await prisma.plan.findUnique({
		where: { id: parseInt(id) },
		include: {
			user: {
				select: {
					id: true,
					loginId: true,
					nickname: true
				}
			},
			missions: {
				orderBy: { missionOrder: 'asc' }
			}
		}
	});
};

// 새 계획 생성
const create = async (planData) => {
	const { 
		userId, 
		title, 
		description, 
		date, 
		time, 
		location, 
		reminderAt 
	} = planData;
	
	// 시간 처리 함수
	const parseTimeToDate = (timeString) => {
		if (!timeString) return null;
		
		// HH:MM 또는 HH:MM:SS 형식 검증
		const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(:([0-5][0-9]))?$/;
		if (!timeRegex.test(timeString)) {
			return null; // 유효하지 않은 시간 형식이면 null 반환
		}
		
		// 초가 없으면 추가
		const fullTime = timeString.includes(':') && timeString.split(':').length === 2 
			? `${timeString}:00` 
			: timeString;
		
		return new Date(`1970-01-01T${fullTime}.000Z`);
	};

	return await prisma.plan.create({
		data: {
			userId: parseInt(userId),
			title,
			description,
			date: new Date(date),
			time: parseTimeToDate(time),
			location,
			reminderAt: reminderAt ? new Date(reminderAt) : null
		},
		include: {
			missions: true
		}
	});
};

// 계획 수정
const update = async (id, planData) => {
	const { 
		title, 
		description, 
		date, 
		time, 
		isCompleted,
		location, 
		reminderAt 
	} = planData;
	
	// 시간 처리 함수
	const parseTimeToDate = (timeString) => {
		if (!timeString) return null;
		
		// HH:MM 또는 HH:MM:SS 형식 검증
		const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(:([0-5][0-9]))?$/;
		if (!timeRegex.test(timeString)) {
			return null; // 유효하지 않은 시간 형식이면 null 반환
		}
		
		// 초가 없으면 추가
		const fullTime = timeString.includes(':') && timeString.split(':').length === 2 
			? `${timeString}:00` 
			: timeString;
		
		return new Date(`1970-01-01T${fullTime}.000Z`);
	};

	const updateData = {};
	if (title !== undefined) updateData.title = title;
	if (description !== undefined) updateData.description = description;
	if (date !== undefined) updateData.date = new Date(date);
	if (time !== undefined) updateData.time = parseTimeToDate(time);
	if (isCompleted !== undefined) updateData.isCompleted = isCompleted;
	if (location !== undefined) updateData.location = location;
	if (reminderAt !== undefined) updateData.reminderAt = reminderAt ? new Date(reminderAt) : null;
	
	return await prisma.plan.update({
		where: { id: parseInt(id) },
		data: {
			...updateData,
			updatedAt: new Date()
		},
		include: {
			missions: {
				orderBy: { missionOrder: 'asc' }
			}
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
		},
		include: {
			missions: true
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
		where: whereCondition,
		include: {
			missions: true
		}
	});
	
	return deletedPlan;
};

// 특정 날짜의 계획들 조회
const findByDate = async (userId, date) => {
	const targetDate = new Date(date);
	
	return await prisma.plan.findMany({
		where: {
			userId: parseInt(userId),
			date: targetDate
		},
		include: {
			missions: {
				orderBy: { missionOrder: 'asc' }
			}
		},
		orderBy: [
			{ time: 'asc' }
		]
	});
};

// 특정 기간의 계획들 조회
const findByDateRange = async (userId, startDate, endDate) => {
	return await prisma.plan.findMany({
		where: {
			userId: parseInt(userId),
			date: {
				gte: new Date(startDate),
				lte: new Date(endDate)
			}
		},
		include: {
			missions: {
				orderBy: { missionOrder: 'asc' }
			}
		},
		orderBy: [
			{ date: 'asc' },
			{ time: 'asc' }
		]
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

// 완료되지 않은 계획들 조회
const findIncomplete = async (userId) => {
	const today = getKoreaTodayStart(); // 한국 시간 기준 오늘 0시
	
	return await prisma.plan.findMany({
		where: {
			userId: parseInt(userId),
			isCompleted: false,
			date: {
				gte: today // 오늘 이후의 미완료 계획들
			}
		},
		include: {
			missions: {
				orderBy: { missionOrder: 'asc' }
			}
		},
		orderBy: [
			{ date: 'asc' },
			{ time: 'asc' }
		]
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

// 알림이 설정된 계획들 조회
const findPlansWithReminders = async () => {
	const now = getKoreaNow(); // 한국 시간 기준 현재 시간
	
	return await prisma.plan.findMany({
		where: {
			reminderAt: {
				lte: now
			},
			isCompleted: false
		},
		include: {
			user: {
				select: {
					id: true,
					nickname: true
				}
			},
			missions: {
				orderBy: { missionOrder: 'asc' }
			}
		},
		orderBy: { reminderAt: 'asc' }
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
	findPlansWithReminders
};
