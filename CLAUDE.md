# IVENT-OS — Claude Code 가이드

> 라틴 댄스 이벤트 플랫폼 (살사·바차타·키좀바) 개발 지침서

---

## 프로젝트 개요

**IVENT-OS**는 한국 비수도권 도시의 라틴 댄스 이벤트(파티·레슨)를 등록·관리·홍보하는 한국어 플랫폼입니다.

| 항목 | 내용 |
|---|---|
| 프레임워크 | React 19 + TypeScript + Vite |
| 스타일링 | Tailwind CSS |
| 백엔드 | Supabase (PostgreSQL) |
| 인증 | Supabase Auth |
| 저장소 | GitHub — `parkyz1004/-IVENT-OS` |
| Git 인증 | HTTPS + Personal Access Token |

---

## 디렉토리 구조

```
src/
├── components/
│   ├── admin/          # 어드민 전용 컴포넌트
│   ├── common/         # 공용 UI 컴포넌트
│   └── events/         # 이벤트 관련 컴포넌트
├── pages/              # 라우트별 페이지
├── hooks/              # 커스텀 훅
├── lib/
│   └── supabase.ts     # Supabase 클라이언트
├── types/              # TypeScript 타입 정의
└── utils/              # 유틸리티 함수
```

---

## 핵심 규칙

### React / TypeScript

```tsx
// ✅ 올바른 훅 사용 — 컴포넌트 최상단에서만 호출
function AdminDashboard() {
  const { user } = useAuth(); // 최상단 OK
  return <div>...</div>;
}

// ❌ 금지 — JSX 내부에서 훅 호출
function Bad() {
  return (
    <div>
      {useAuth().user && <span>...</span>} {/* Hook Rules 위반 */}
    </div>
  );
}
```

- **Hook Rules 엄수**: `useAuth()` 등 훅은 반드시 컴포넌트/커스텀훅 최상단에서만 호출
- **파일 입력 ref 분리**: 두 컴포넌트가 동일한 `file input ref`를 공유하지 않도록 각각 독립 선언
- **Firebase import 금지**: Supabase로 마이그레이션 완료. `firebase` 관련 import 일절 금지

### 라우팅

```tsx
// App.tsx 라우트와 컴포넌트 내 경로를 반드시 일치시킬 것
// ✅ App.tsx
<Route path="/admin/events/:id/edit" element={<EventEdit />} />

// ✅ EventsTab (mobile) 내부
navigate(`/admin/events/${event.id}/edit`);

// ❌ 경로 불일치 예시 (절대 금지)
navigate(`/events/${event.id}/edit`); // /admin 누락
```

### 상태 관리

- 유지보수 모드(maintenance mode) 같은 전역 상태는 **Supabase DB 또는 Context**에 저장 — 로컬 useState만으로는 새로고침 시 초기화됨
- 포인트 계산 등 서버 의존 로직은 **클라이언트 사이드 race condition**에 주의하고, Supabase RPC나 Edge Function으로 처리

---

## Supabase 스키마 규칙

### 이벤트 (parties / lessons)

```sql
-- 필수 필드
id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
title       text NOT NULL,
category    text NOT NULL,           -- '살사' | '바차타' | '키좀바'
date        timestamptz NOT NULL,
end_date    timestamptz,             -- nullable
location    text NOT NULL,
city        text NOT NULL,
price       integer DEFAULT 0,
host_id     uuid REFERENCES users(id),
description text,
created_at  timestamptz DEFAULT now()

-- lessons 전용 추가 필드
instructor  text,
level       text    -- '입문' | '초급' | '중급' | '고급'
```

### SQL 작성 규칙

```sql
-- timestamptz 캐스팅 명시
'2025-08-15 19:00:00'::timestamptz

-- UUID 자동 생성
gen_random_uuid()

-- optional 필드는 NULL 명시
INSERT INTO parties (title, end_date, ...)
VALUES ('파티명', NULL, ...);
```

### community_posts 스키마 주의

`is_private` 컬럼이 schema에 존재하는지 반드시 확인 후 쿼리 작성.

```sql
-- 컬럼 존재 여부 확인
SELECT column_name FROM information_schema.columns
WHERE table_name = 'community_posts' AND column_name = 'is_private';
```

---

## 어드민 대시보드

### 사용자 역할

```typescript
type UserRole = 'admin' | 'host' | 'user';

// 역할 체크 — 조건 완화 주의
// ❌ 너무 restrictive
if (user.role === 'admin' && user.verified === true && user.tier === 'premium')

// ✅ 적절한 체크
if (user.role === 'admin' || user.role === 'host')
```

### 이벤트 일괄 등록

- Google Sheets 호환 Excel 템플릿 → Supabase SQL INSERT 파이프라인 존재
- 컬럼 순서: `title, category, date, end_date, location, city, price, host_id, description`
- 약 39개 이상의 이벤트 데이터가 관리되고 있음

---

## 코딩 스타일

### 컴포넌트 작성

```tsx
// 함수형 컴포넌트 + TypeScript props 인터페이스 필수
interface EventCardProps {
  event: Event;
  onEdit?: (id: string) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onEdit }) => {
  // 훅은 항상 최상단
  const { user } = useAuth();
  const navigate = useNavigate();

  // 이벤트 핸들러
  const handleEdit = () => {
    navigate(`/admin/events/${event.id}/edit`);
  };

  return (
    <div className="rounded-xl p-4 bg-white shadow-sm">
      ...
    </div>
  );
};
```

### Tailwind 클래스 컨벤션

```tsx
// 반응형: mobile-first
className="text-sm md:text-base lg:text-lg"

// 다크모드 대응 (필요 시)
className="bg-white dark:bg-gray-900"

// 한국어 텍스트 줄바꿈
className="break-keep"   // 한국어 단어 단위 줄바꿈
```

---

## 환경 변수

```env
# .env.local
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# .env.local은 절대 커밋하지 않을 것
# .gitignore에 반드시 포함
```

---

## 알려진 버그 & 해결 상태

| # | 파일 | 버그 | 상태 |
|---|---|---|---|
| 1 | `AdminDashboard.tsx` | `useAuth()` Hook Rules 위반 (JSX 내부 호출) | ⚠️ 수정 필요 |
| 2 | `EventsTab` (mobile) | edit 경로 `/events/:id/edit` → `/admin/events/:id/edit` 불일치 | ⚠️ 수정 필요 |
| 3 | `community_posts` | `is_private` 컬럼 schema 누락 | ⚠️ 확인 필요 |
| 4 | 공용 file input | 두 컴포넌트가 ref 공유 | ⚠️ 분리 필요 |
| 5 | maintenance mode | useState만 사용 → 새로고침 시 초기화 | ⚠️ DB 연동 필요 |
| 6 | 포인트 계산 | 클라이언트 race condition | ⚠️ RPC 이전 권장 |

---

## Git 워크플로우

```bash
# 브랜치 전략
main          # 프로덕션
develop       # 개발 통합
feature/*     # 기능 개발
fix/*         # 버그 수정

# 커밋 메시지 (한국어 허용)
git commit -m "fix: AdminDashboard useAuth Hook Rules 위반 수정"
git commit -m "feat: 이벤트 일괄 등록 Excel 파서 추가"
git commit -m "chore: Firebase 잔여 import 제거"

# Push (HTTPS + PAT)
git push origin feature/your-branch
```

---

## 이벤트 카테고리

| 카테고리 | 영문 | 비고 |
|---|---|---|
| 살사 | Salsa | ON1 / ON2 구분 가능 |
| 바차타 | Bachata | Dominican / Sensual |
| 키좀바 | Kizomba | Urban Kiz 포함 |

---

## 주요 참고 문서

- [Supabase Docs](https://supabase.com/docs)
- [React 19 Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vite](https://vitejs.dev)

---

*이 파일은 Claude Code가 IVENT-OS 코드베이스를 이해하고 일관성 있게 작업하기 위한 컨텍스트 가이드입니다.*
