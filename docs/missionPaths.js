/**
 * @openapi
 * /api/missions/templates:
 *   get:
 *     summary: 모든 활성화된 미션 템플릿 조회
 *     tags: [Mission Templates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 미션 템플릿 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MissionTemplate'
 *   post:
 *     summary: 미션 템플릿 생성 (관리자용)
 *     tags: [Mission Templates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMissionTemplateRequest'
 *     responses:
 *       201:
 *         description: 미션 템플릿 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MissionTemplate'
 *
 * /api/missions/templates/{id}:
 *   put:
 *     summary: 미션 템플릿 업데이트 (관리자용)
 *     tags: [Mission Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 미션 템플릿 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMissionTemplateRequest'
 *     responses:
 *       200:
 *         description: 미션 템플릿 업데이트 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MissionTemplate'
 *   delete:
 *     summary: 미션 템플릿 비활성화 (관리자용)
 *     tags: [Mission Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 미션 템플릿 ID
 *     responses:
 *       200:
 *         description: 미션 템플릿 비활성화 성공
 *
 * /api/missions/daily/today:
 *   get:
 *     summary: 오늘의 일일 미션 조회
 *     tags: [Daily Missions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 오늘 미션 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DailyMission'
 *
 * /api/missions/daily:
 *   get:
 *     summary: 특정 날짜의 일일 미션 조회
 *     tags: [Daily Missions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: 조회할 날짜 (YYYY-MM-DD 형식)
 *     responses:
 *       200:
 *         description: 날짜별 미션 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DailyMission'
 *
 * /api/missions/daily/history:
 *   get:
 *     summary: 미션 기록 조회 (기간별)
 *     tags: [Daily Missions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: 시작일 (YYYY-MM-DD 형식)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: 종료일 (YYYY-MM-DD 형식)
 *     responses:
 *       200:
 *         description: 미션 기록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DailyMission'
 *
 * /api/missions/daily/{id}/toggle:
 *   patch:
 *     summary: 일일 미션 완료/미완료 토글
 *     tags: [Daily Missions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 일일 미션 ID
 *     responses:
 *       200:
 *         description: 미션 완료 상태 변경 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DailyMission'
 *
 * /api/missions/memories:
 *   get:
 *     summary: 사용자의 모든 미션 추억 조회
 *     tags: [Mission Memories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 미션 추억 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MissionMemory'
 *   post:
 *     summary: 미션 추억 생성 (파일 업로드)
 *     tags: [Mission Memories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               dailyMissionId:
 *                 type: integer
 *                 description: 일일 미션 ID
 *                 example: 1
 *               content:
 *                 type: string
 *                 description: 미션 완료 내용
 *                 example: 푸들이와 함께 한강에서 산책했어요!
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 10
 *                 description: 업로드할 이미지 파일들 (최대 10개)
 *             required: [dailyMissionId, content]
 *     responses:
 *       201:
 *         description: 미션 추억 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MissionMemory'
 *
 * /api/missions/memories/{id}:
 *   put:
 *     summary: 미션 추억 업데이트
 *     tags: [Mission Memories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 미션 추억 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateMissionMemoryRequest'
 *     responses:
 *       200:
 *         description: 미션 추억 업데이트 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MissionMemory'
 *   delete:
 *     summary: 미션 추억 삭제
 *     tags: [Mission Memories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 미션 추억 ID
 *     responses:
 *       200:
 *         description: 미션 추억 삭제 성공
 *
 * /api/missions/memories/{id}/images:
 *   get:
 *     summary: 미션 추억의 모든 이미지 조회
 *     tags: [Mission Memories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 미션 추억 ID
 *     responses:
 *       200:
 *         description: 미션 이미지 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MissionImage'
 *
 * /api/missions/memories/{id}/images/upload:
 *   post:
 *     summary: 미션 추억에 이미지 업로드 (파일 방식)
 *     tags: [Mission Memories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 미션 추억 ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: 업로드할 이미지 파일
 *             required: [image]
 *     responses:
 *       201:
 *         description: 미션 이미지 업로드 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MissionImage'
 *
 * /api/missions/memories/{id}/images/upload-multiple:
 *   post:
 *     summary: 미션 추억에 여러 이미지 업로드
 *     tags: [Mission Memories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 미션 추억 ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 10
 *                 description: 업로드할 이미지 파일들 (최대 10개)
 *             required: [images]
 *     responses:
 *       201:
 *         description: 미션 이미지들 업로드 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MissionImage'
 *
 * /api/missions/images/{id}:
 *   delete:
 *     summary: 미션 이미지 삭제
 *     tags: [Mission Memories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 미션 이미지 ID
 *     responses:
 *       200:
 *         description: 미션 이미지 삭제 성공
 */ 