const { prisma } = require('../config/dbConfig');

// 모든 계획 조회 (Read)
const findAll = async () => {
	return await prisma.plan.findMany({
		include: {
			user: {
				select: {
					id: true,
					loginId: true,
					name: true
				}
			},
			missions: {
				orderBy: { missionOrder: 'asc' }
			}
		},
		orderBy: { id: 'asc' }
	});
};

// 특정 사용자의 계획들 조회
const findByUserId = async (userId) => {
	return await prisma.plan.findMany({
		where: { userId: parseInt(userId) },
		include: {
			missions: {
				orderBy: { missionOrder: 'asc' }
			}
		},
		orderBy: { date: 'asc' }
	});
};

// 특정 계획 조회 (Read)
const findById = async (id) => {
	return await prisma.plan.findUnique({
		where: { id: parseInt(id) },
		include: {
			user: {
				select: {
					id: true,
					loginId: true,
					name: true
				}
			},
			missions: {
				orderBy: { missionOrder: 'asc' }
			}
		}
	});
};

// 새 계획 생성 (Create)
const create = async (planData) => {
	console.log('새 계획 생성:', planData);
	const { userId, title, date, time, isChecked } = planData;
	
	return await prisma.plan.create({
		data: {
			userId: parseInt(userId),
			title,
			date: new Date(date),
			time: time ? new Date(`1970-01-01T${time}:00.000Z`) : null,
			isChecked: isChecked || false
		},
		include: {
			missions: true
		}
	});
};

// 계획 수정 (Update)
const update = async (id, planData) => {
	const { title, date, time, isChecked } = planData;
	
	const updateData = {};
	if (title !== undefined) updateData.title = title;
	if (date !== undefined) updateData.date = new Date(date);
	if (time !== undefined) {
		updateData.time = time ? new Date(`1970-01-01T${time}:00.000Z`) : null;
	}
	if (isChecked !== undefined) updateData.isChecked = isChecked;
	
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

// 계획 체크 상태 토글
const toggleCheck = async (id) => {
	const currentPlan = await prisma.plan.findUnique({
		where: { id: parseInt(id) }
	});
	
	if (!currentPlan) {
		throw new Error('계획을 찾을 수 없습니다');
	}
	
	return await prisma.plan.update({
		where: { id: parseInt(id) },
		data: {
			isChecked: !currentPlan.isChecked,
			updatedAt: new Date()
		},
		include: {
			missions: true
		}
	});
};

// 계획 삭제 (Delete) - CASCADE로 미션도 함께 삭제됨
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
	return await prisma.plan.findMany({
		where: {
			userId: parseInt(userId),
			date: new Date(date)
		},
		include: {
			missions: {
				orderBy: { missionOrder: 'asc' }
			}
		},
		orderBy: { time: 'asc' }
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

// 완료되지 않은 계획들 조회
const findIncomplete = async (userId) => {
	return await prisma.plan.findMany({
		where: {
			userId: parseInt(userId),
			isChecked: false
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

module.exports = {
	findAll,
	findByUserId,
	findById,
	create,
	update,
	toggleCheck,
	remove,
	findByDate,
	findByDateRange,
	findIncomplete
};
