# PawPrint Backend

PawPrint 백엔드 서비스입니다.

## 🔧 기술 스택

- **Node.js** + **Express.js** - 백엔드 API 서버
- **PostgreSQL** + **Prisma** - 데이터베이스 ORM
- **Supabase** - 실시간 알림 및 데이터베이스 관리  
- **JWT** - 사용자 인증
- **Swagger** - API 문서화
- **Azure Blob Storage** - 미디어 파일 저장

## 📡 실시간 알림 시스템

### 아키텍처
```
클라이언트 ↔ Supabase Realtime ↔ PostgreSQL
```

### 1. 백엔드 REST API
기본적인 알림 CRUD 작업을 위한 REST API:

```javascript
// 알림 목록 조회
GET /api/notifications

// 읽지 않은 알림 개수
GET /api/notifications/unread-count

// 알림 읽음 처리
PATCH /api/notifications/:id/read

// 모든 알림 읽음 처리
PATCH /api/notifications/mark-all-read

// 알림 삭제
DELETE /api/notifications/:id

// 테스트 알림 생성
POST /api/notifications/test
```

### 2. 클라이언트 실시간 알림 구독 (Supabase Realtime)

#### 2-1. 설치
```bash
npm install @supabase/supabase-js
```

#### 2-2. Supabase 클라이언트 설정
```javascript
// supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseKey)
```

#### 2-3. 알림 실시간 구독
```javascript
// notificationService.js
import { supabase } from './supabaseClient'

class NotificationService {
  constructor() {
    this.subscription = null
  }

  // 특정 사용자의 알림 구독
  subscribeToNotifications(userId, onNotification) {
    // 기존 구독 해제
    if (this.subscription) {
      this.subscription.unsubscribe()
    }

    // 새로운 알림 구독
    this.subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        onNotification
      )
      .subscribe()
  }

  // 알림 읽음 처리 감지
  subscribeToReadStatusUpdates(userId, onReadUpdate) {
    supabase
      .channel('notifications-read')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        onReadUpdate
      )
      .subscribe()
  }

  // 구독 해제
  unsubscribe() {
    if (this.subscription) {
      this.subscription.unsubscribe()
      this.subscription = null
    }
  }
}

export const notificationService = new NotificationService()
```

#### 2-4. React 컴포넌트 사용 예시
```javascript
// NotificationComponent.jsx
import { useEffect, useState } from 'react'
import { notificationService } from './notificationService'

function NotificationComponent({ userId }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // 기존 알림 조회
    const fetchNotifications = async () => {
      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      setNotifications(data.result.notifications)
    }

    fetchNotifications()

    // 실시간 알림 구독
    notificationService.subscribeToNotifications(userId, (payload) => {
      const newNotification = payload.new
      
      // 새 알림을 목록에 추가
      setNotifications(prev => [newNotification, ...prev])
      
      // 읽지 않은 알림 개수 증가
      setUnreadCount(prev => prev + 1)
      
      // 푸시 알림 표시 (선택사항)
      if (Notification.permission === 'granted') { 
         new Notification(newNotification.title, {
           body: newNotification.body,
           icon: '/icon-notification.png'
         })
       }
    })

    // 읽음 처리 감지
    notificationService.subscribeToReadStatusUpdates(userId, (payload) => {
      const updatedNotification = payload.new
      
      // 알림 목록에서 읽음 상태 업데이트
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === updatedNotification.id 
            ? { ...notification, is_read: true }
            : notification
        )
      )
      
      // 읽지 않은 알림 개수 감소
      if (!payload.old.is_read && payload.new.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    })

    return () => {
      notificationService.unsubscribe()
    }
  }, [userId])

  const markAsRead = async (notificationId) => {
    await fetch(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
  }

  return (
    <div className="notification-container">
      <div className="notification-header">
        <h3>알림 ({unreadCount})</h3>
      </div>
      
                 <div className="notification-list">
             {notifications.map(notification => (
               <div 
                 key={notification.id}
                 className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                 onClick={() => markAsRead(notification.id)}
               >
                 <h4>{notification.title}</h4>
                 <p>{notification.body}</p>
                 <span className="timestamp">
                   {new Date(notification.created_at).toLocaleString()}
                 </span>
               </div>
             ))}
           </div>
    </div>
  )
}

export default NotificationComponent
```

#### 2-5. 알림 타입별 처리
```javascript
// notificationHandler.js
export const handleNotificationByType = (notification) => {
  switch (notification.type) {
    case 'comment':
      // 댓글 알림 처리
      window.location.href = `/contents/${notification.data.contentId}`
      break
      
    case 'plan_reminder':
      // 계획 알림 처리
      window.location.href = `/plans/${notification.data.planId}`
      break
      
    case 'mission_completion':
      // 미션 완료 알림 처리
      window.location.href = `/missions/${notification.data.missionId}`
      break
      
    default:
      console.log('알 수 없는 알림 타입:', notification.type)
  }
}
```

### 3. 푸시 알림 권한 요청 (선택사항)
```javascript
// pushNotification.js
export const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }
  return false
}

// 사용 예시
useEffect(() => {
  requestNotificationPermission()
}, [])
```

### 4. Supabase 설정 요구사항

#### 4-1. 환경 변수
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### 4-2. Row Level Security (RLS) 정책
```sql
-- 사용자는 자신의 알림만 조회 가능
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

-- 사용자는 자신의 알림만 수정 가능
CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

-- 사용자는 자신의 알림만 삭제 가능
CREATE POLICY "Users can delete their own notifications"
ON notifications FOR DELETE
USING (auth.uid() = user_id);
```

#### 4-3. Realtime 활성화
Supabase 대시보드에서 `notifications` 테이블의 Realtime을 활성화해야 합니다.

### 5. 장점
- **간단한 아키텍처**: 중간 SSE 서버 없이 직접 연결
- **자동 확장성**: Supabase가 연결 관리
- **더 나은 성능**: 중간 서버 없이 직접 통신
- **실시간 동기화**: 다른 기기에서 읽음 처리 시 자동 반영

---

## 📚 API 문서

서버 실행 후 다음 URL에서 API 문서를 확인할 수 있습니다:
- http://localhost:3000/api-docs

## 🚀 시작하기

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
```env
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. 서버 실행
```bash
npm start
```

서버가 실행되면 다음과 같은 정보를 확인할 수 있습니다:
- 🌐 서버 주소: http://localhost:3000
- 📚 API 문서: http://localhost:3000/api-docs
- 📡 실시간 알림: Supabase Realtime (클라이언트에서 직접 구독)