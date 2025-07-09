# FCM 알림 기능 구현 가이드

## 📋 **목차**
1. [Firebase 프로젝트 설정](#1-firebase-프로젝트-설정)
2. [서버 설정](#2-서버-설정)
3. [데이터베이스 스키마](#3-데이터베이스-스키마)
4. [FCM 서비스 구현](#4-fcm-서비스-구현)
5. [클라이언트 연동](#5-클라이언트-연동)
6. [알림 타입 및 템플릿](#6-알림-타입-및-템플릿)
7. [보안 고려사항](#7-보안-고려사항)
8. [테스트 방법](#8-테스트-방법)

---

## 1. Firebase 프로젝트 설정

### 1.1 Firebase 프로젝트 생성
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 (예: `pawprint-notifications`)
4. Google Analytics 설정 (선택사항)

### 1.2 FCM 활성화
1. Firebase Console → **Project Settings** → **Cloud Messaging**
2. **Server Key** 확인 (Legacy, 사용 안 함)
3. **Firebase Admin SDK** 사용 권장

### 1.3 서비스 계정 키 생성
1. Firebase Console → **Project Settings** → **Service accounts**
2. **Generate new private key** 클릭
3. JSON 키 파일 다운로드 → `config/firebase-admin-sdk.json`로 저장

---

## 2. 서버 설정

### 2.1 필요한 패키지 설치
```bash
npm install firebase-admin
npm install uuid  # 알림 ID 생성용 (이미 설치됨)
```

### 2.2 환경 변수 설정 (.env)
```env
# Firebase 설정
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token

# 또는 서비스 계정 키 파일 경로
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=./config/firebase-admin-sdk.json
```

### 2.3 Firebase Admin SDK 초기화
```javascript
// config/firebaseConfig.js
const admin = require('firebase-admin');
const path = require('path');

// 서비스 계정 키 파일 사용
const serviceAccount = require(path.join(__dirname, 'firebase-admin-sdk.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID
});

module.exports = admin;
```

---

## 3. 데이터베이스 스키마

### 3.1 Prisma 스키마 추가
```prisma
// prisma/schema.prisma

model User {
  id              Int             @id @default(autoincrement())
  loginId         String          @unique @map("login_id")
  // ... 기존 필드들
  
  // FCM 토큰 관련
  fcmTokens       FCMToken[]
  notifications   Notification[]
  
  @@map("users")
}

model FCMToken {
  id        Int      @id @default(autoincrement())
  userId    Int      @map("user_id")
  token     String   @unique
  platform  String   // 'web', 'ios', 'android'
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at")
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("fcm_tokens")
}

model Notification {
  id        Int      @id @default(autoincrement())
  userId    Int      @map("user_id")
  type      String   // 'comment', 'plan_reminder', 'mission_complete', etc.
  title     String
  body      String
  data      Json?    // 추가 데이터 (딥링크 등)
  isRead    Boolean  @default(false) @map("is_read")
  isSent    Boolean  @default(false) @map("is_sent")
  sentAt    DateTime? @map("sent_at")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at")
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("notifications")
}
```

### 3.2 마이그레이션 실행
```bash
npx prisma migrate dev --name "add_fcm_notifications"
npx prisma generate
```

---

## 4. FCM 서비스 구현

### 4.1 FCM 서비스 파일 생성
```javascript
// services/fcmService.js
const admin = require('../config/firebaseConfig');
const prisma = require('../config/dbConfig');
const { logger } = require('../config/logger');

class FCMService {
  // FCM 토큰 등록
  async registerToken(userId, token, platform) {
    try {
      // 기존 토큰 비활성화
      await prisma.fCMToken.updateMany({
        where: { userId, platform },
        data: { isActive: false }
      });
      
      // 새 토큰 등록
      const fcmToken = await prisma.fCMToken.create({
        data: {
          userId,
          token,
          platform,
          isActive: true
        }
      });
      
      logger.info(`FCM 토큰 등록 성공: 사용자 ${userId}, 플랫폼 ${platform}`);
      return fcmToken;
    } catch (error) {
      logger.error('FCM 토큰 등록 실패:', error);
      throw error;
    }
  }
  
  // 단일 사용자에게 알림 발송
  async sendToUser(userId, notification) {
    try {
      // 사용자의 활성 토큰 조회
      const tokens = await prisma.fCMToken.findMany({
        where: { userId, isActive: true }
      });
      
      if (tokens.length === 0) {
        logger.warn(`사용자 ${userId}의 활성 FCM 토큰이 없습니다.`);
        return;
      }
      
      // 알림 데이터베이스에 저장
      const savedNotification = await prisma.notification.create({
        data: {
          userId,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          data: notification.data || {}
        }
      });
      
      // FCM 메시지 구성
      const message = {
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: {
          notificationId: savedNotification.id.toString(),
          type: notification.type,
          ...notification.data
        },
        tokens: tokens.map(t => t.token)
      };
      
      // FCM 발송
      const response = await admin.messaging().sendMulticast(message);
      
      // 발송 결과 처리
      await this.handleSendResponse(response, tokens, savedNotification.id);
      
      logger.info(`알림 발송 성공: 사용자 ${userId}, 성공 ${response.successCount}개`);
      return savedNotification;
    } catch (error) {
      logger.error('알림 발송 실패:', error);
      throw error;
    }
  }
  
  // 발송 결과 처리
  async handleSendResponse(response, tokens, notificationId) {
    const invalidTokens = [];
    
    response.responses.forEach((result, index) => {
      if (!result.success) {
        const errorCode = result.error?.code;
        if (errorCode === 'messaging/invalid-registration-token' || 
            errorCode === 'messaging/registration-token-not-registered') {
          invalidTokens.push(tokens[index].token);
        }
      }
    });
    
    // 무효한 토큰 비활성화
    if (invalidTokens.length > 0) {
      await prisma.fCMToken.updateMany({
        where: { token: { in: invalidTokens } },
        data: { isActive: false }
      });
      logger.info(`무효한 FCM 토큰 ${invalidTokens.length}개 비활성화`);
    }
    
    // 알림 발송 상태 업데이트
    await prisma.notification.update({
      where: { id: notificationId },
      data: { 
        isSent: true,
        sentAt: new Date()
      }
    });
  }
  
  // 토큰 해제
  async unregisterToken(userId, token) {
    try {
      await prisma.fCMToken.updateMany({
        where: { userId, token },
        data: { isActive: false }
      });
      
      logger.info(`FCM 토큰 해제: 사용자 ${userId}`);
    } catch (error) {
      logger.error('FCM 토큰 해제 실패:', error);
      throw error;
    }
  }
}

module.exports = new FCMService();
```

### 4.2 알림 서비스 통합
```javascript
// services/notificationService.js
const fcmService = require('./fcmService');
const prisma = require('../config/dbConfig');
const { logger } = require('../config/logger');

class NotificationService {
  // 댓글 알림 생성
  async createCommentNotification(contentOwnerId, commentUserId, contentId, commentId, commentBody) {
    try {
      // 자기 자신에게는 알림 안 보냄
      if (contentOwnerId === commentUserId) return;
      
      // 댓글 작성자 정보 조회
      const commentUser = await prisma.user.findUnique({
        where: { id: commentUserId },
        select: { nickname: true }
      });
      
      const notification = {
        type: 'comment',
        title: '새 댓글이 있습니다',
        body: `${commentUser.nickname}님이 댓글을 남겼습니다: ${commentBody.substring(0, 20)}...`,
        data: {
          contentId: contentId.toString(),
          commentId: commentId.toString(),
          screen: 'ContentDetail'
        }
      };
      
      await fcmService.sendToUser(contentOwnerId, notification);
    } catch (error) {
      logger.error('댓글 알림 생성 실패:', error);
    }
  }
  
  // 계획 리마인더 알림
  async createPlanReminderNotification(userId, planTitle, planId) {
    try {
      const notification = {
        type: 'plan_reminder',
        title: '오늘의 계획이 있습니다',
        body: `${planTitle} - 오늘 예정된 계획입니다!`,
        data: {
          planId: planId.toString(),
          screen: 'PlanDetail'
        }
      };
      
      await fcmService.sendToUser(userId, notification);
    } catch (error) {
      logger.error('계획 알림 생성 실패:', error);
    }
  }
  
  // 미션 완료 알림
  async createMissionCompleteNotification(userId, missionTitle, missionId) {
    try {
      const notification = {
        type: 'mission_complete',
        title: '미션 완료!',
        body: `${missionTitle} 미션을 완료했습니다. 축하합니다!`,
        data: {
          missionId: missionId.toString(),
          screen: 'MissionDetail'
        }
      };
      
      await fcmService.sendToUser(userId, notification);
    } catch (error) {
      logger.error('미션 완료 알림 생성 실패:', error);
    }
  }
}

module.exports = new NotificationService();
```

---

## 5. 클라이언트 연동

### 5.1 FCM 토큰 등록 API
```javascript
// controllers/notifications.js
const express = require('express');
const fcmService = require('../services/fcmService');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

// FCM 토큰 등록
router.post('/register-token', authenticateToken, async (req, res) => {
  try {
    const { token, platform } = req.body;
    const userId = req.user.id;
    
    if (!token || !platform) {
      return res.status(400).json({
        success: false,
        message: 'FCM 토큰과 플랫폼 정보가 필요합니다.'
      });
    }
    
    await fcmService.registerToken(userId, token, platform);
    
    res.json({
      success: true,
      message: 'FCM 토큰이 등록되었습니다.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'FCM 토큰 등록에 실패했습니다.',
      error: error.message
    });
  }
});

// FCM 토큰 해제
router.delete('/unregister-token', authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;
    
    await fcmService.unregisterToken(userId, token);
    
    res.json({
      success: true,
      message: 'FCM 토큰이 해제되었습니다.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'FCM 토큰 해제에 실패했습니다.',
      error: error.message
    });
  }
});

module.exports = router;
```

### 5.2 클라이언트 구현 예시 (React Web)
```javascript
// 클라이언트에서 FCM 토큰 등록 (예시)
import { getMessaging, getToken } from 'firebase/messaging';

// FCM 토큰 가져오기
const messaging = getMessaging();
const token = await getToken(messaging, { vapidKey: 'your-vapid-key' });

// 서버에 토큰 등록
await fetch('/api/notifications/register-token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    token: token,
    platform: 'web'
  })
});
```

---

## 6. 알림 타입 및 템플릿

### 6.1 알림 타입 정의
```javascript
// constants/notificationTypes.js
const NOTIFICATION_TYPES = {
  COMMENT: 'comment',
  PLAN_REMINDER: 'plan_reminder',
  MISSION_COMPLETE: 'mission_complete',
  MISSION_REMINDER: 'mission_reminder',
  LIKE: 'like',
  FOLLOW: 'follow',
  SYSTEM: 'system'
};

const NOTIFICATION_TEMPLATES = {
  [NOTIFICATION_TYPES.COMMENT]: {
    title: '새 댓글이 있습니다',
    body: (nickname, content) => `${nickname}님이 댓글을 남겼습니다: ${content.substring(0, 20)}...`,
    icon: 'comment'
  },
  [NOTIFICATION_TYPES.PLAN_REMINDER]: {
    title: '오늘의 계획이 있습니다',
    body: (planTitle) => `${planTitle} - 오늘 예정된 계획입니다!`,
    icon: 'calendar'
  },
  [NOTIFICATION_TYPES.MISSION_COMPLETE]: {
    title: '미션 완료!',
    body: (missionTitle) => `${missionTitle} 미션을 완료했습니다. 축하합니다!`,
    icon: 'trophy'
  }
};

module.exports = { NOTIFICATION_TYPES, NOTIFICATION_TEMPLATES };
```

---

## 7. 보안 고려사항

### 7.1 환경 변수 보안
- Firebase 서비스 계정 키를 환경 변수 또는 안전한 경로에 저장
- `.env` 파일을 `.gitignore`에 추가
- 프로덕션에서는 암호화된 환경 변수 사용

### 7.2 토큰 관리
- FCM 토큰은 정기적으로 갱신
- 무효한 토큰은 자동으로 비활성화
- 사용자 로그아웃 시 토큰 해제

### 7.3 권한 검증
- 알림 발송 시 사용자 권한 확인
- 개인정보 포함 알림 주의
- 스팸 방지를 위한 발송 제한

---

## 8. 테스트 방법

### 8.1 테스트 API 생성
```javascript
// 테스트용 알림 발송 API
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, body } = req.body;
    
    const notification = {
      type: 'test',
      title: title || '테스트 알림',
      body: body || '이것은 테스트 알림입니다.',
      data: { test: true }
    };
    
    await fcmService.sendToUser(userId, notification);
    
    res.json({
      success: true,
      message: '테스트 알림이 발송되었습니다.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '테스트 알림 발송에 실패했습니다.',
      error: error.message
    });
  }
});
```

### 8.2 테스트 시나리오
1. **토큰 등록 테스트**: 클라이언트에서 FCM 토큰 등록
2. **알림 발송 테스트**: 테스트 API로 알림 발송
3. **댓글 알림 테스트**: 댓글 작성 시 알림 확인
4. **토큰 만료 테스트**: 무효한 토큰 처리 확인

---

## 📝 **구현 체크리스트**

### Firebase 설정
- [ ] Firebase 프로젝트 생성
- [ ] FCM 활성화
- [ ] 서비스 계정 키 다운로드
- [ ] 환경 변수 설정

### 서버 구현
- [ ] firebase-admin 패키지 설치
- [ ] Firebase Admin SDK 초기화
- [ ] 데이터베이스 스키마 생성
- [ ] FCM 서비스 구현
- [ ] 알림 API 구현

### 클라이언트 연동
- [ ] FCM 토큰 등록 기능
- [ ] 알림 수신 처리
- [ ] 딥링크 처리
- [ ] 토큰 갱신 로직

### 테스트 및 배포
- [ ] 테스트 알림 발송
- [ ] 다양한 플랫폼 테스트
- [ ] 에러 처리 확인
- [ ] 프로덕션 배포

---

## 🔗 **참고 자료**

- [Firebase Admin SDK 문서](https://firebase.google.com/docs/admin/setup)
- [FCM 서버 구현 가이드](https://firebase.google.com/docs/cloud-messaging/server)
- [FCM 클라이언트 구현 가이드](https://firebase.google.com/docs/cloud-messaging/js/client)
- [알림 권한 가이드](https://firebase.google.com/docs/cloud-messaging/concept-options) 