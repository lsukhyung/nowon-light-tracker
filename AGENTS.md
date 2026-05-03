# Nowon Light Tracker - AI Agents Reference

## Project Overview

**Nowon Light Tracker**는 노원지원 100인 도장 달성을 위한 **1만 빛 모으기 역사** 웹 애플리케이션입니다.

- **Framework**: Next.js 16.1.6 with React 19.2.3
- **Backend**: Supabase (PostgreSQL with Row Level Security)
- **State Management**: Zustand (client) + TanStack Query (server)
- **UI Components**: Radix UI primitives with Tailwind CSS 4
- **Charts**: Recharts 3.7.0
- **Styling**: Tailwind CSS 4 with tw-animate-css

## AI Agent Behavior Policies

1. **Be Cautious with Modifications**: When making code modifications (especially frontend UI/UX changes), carefully consider side-effects across different platforms (e.g., iOS Safari specific physics, layout shifts, or local storage persistence). Do not rush structural changes without understanding the broader impact.
2. **Manual Vercel Deployment**: ⚠️ Do NOT deploy to Vercel automatically. Only run deployment commands (e.g., `vercel --prod`) when the USER explicitly requests a deployment ("배포해줘").

## Tech Stack

- **Framework**: Next.js 16 + React 19
- **Backend**: Supabase (PostgreSQL with RLS)
- **State**: Zustand (client) + TanStack Query (server)
- **UI**: Radix UI + Tailwind CSS 4
- **Charts**: Recharts

## Environment Setup

Required environment variables (see `.env.example`):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Get these from**: Supabase Dashboard → Project → Settings → API

## Project Structure

```
nowon-light-tracker/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   │   ├── login/     # POST /api/auth/login
│   │   │   │   ├── logout/    # POST /api/auth/logout
│   │   │   │   ├── me/        # GET /api/auth/me
│   │   │   │   └── register/  # POST /api/auth/register
│   │   │   ├── admin/         # Admin endpoints (stats, export, users, reset-password)
│   │   │   ├── events/        # Event management + check-win
│   │   │   ├── personal-events/ # Personal event CRUD + check-achieve
│   │   │   ├── practice-items/ # Practice item management
│   │   │   ├── practice-logs/  # Daily practice logs
│   │   │   ├── stats/         # Statistics endpoints
│   │   │   ├── training/      # Training records endpoints
│   │   │   └── user/          # User settings & goals
│   │   ├── admin/             # Admin dashboard page
│   │   ├── login/             # Login page
│   │   ├── register/          # Registration page
│   │   ├── reset-password/    # Password reset page
│   │   ├── settings/          # User settings page
│   │   ├── layout.tsx         # Root layout with auth provider
│   │   └── page.tsx           # Main dashboard
│   ├── components/
│   │   ├── auth/              # Authentication components
│   │   │   ├── auth-provider.tsx     # Auth context provider
│   │   │   └── protected-route.tsx   # Route guard component
│   │   ├── events/            # Event modals
│   │   │   ├── event-congratulation-modal.tsx          # Global event win modal
│   │   │   └── personal-event-congratulation-modal.tsx # Personal event achieve modal
│   │   ├── practice/          # Practice system components
│   │   │   └── practice-form.tsx
│   │   ├── training/          # Training-related components
│   │   └── ui/                # Reusable UI components (Radix UI)
│   ├── hooks/
│   │   ├── use-event-popup.ts           # Global event popup hook
│   │   ├── use-personal-event-popup.ts  # Personal event popup hook
│   │   └── use-pull-to-refresh.ts
│   ├── lib/
│   │   ├── admin.ts           # Admin email check
│   │   ├── api.ts             # API client (axios)
│   │   ├── password.ts        # Password generation
│   │   ├── supabase.ts        # Supabase client + TABLES constant
│   │   ├── training-items.ts  # Training item metadata
│   │   ├── user-titles.ts     # User title mappings (지원장, 현사, 생활지로사, 도반)
│   │   └── utils.ts           # Utility functions (cn, etc.)
│   ├── store/
│   │   ├── auth-store.ts      # Zustand auth state
│   │   ├── practice-store.ts  # Zustand practice state
│   │   └── training-store.ts  # Zustand training state
│   └── types/
│       └── training.ts        # TypeScript type definitions
├── migrations/                 # SQL migration files
│   ├── migration_users.sql           # users table + auth sync trigger
│   ├── migration_personal_events.sql # personal_events table
│   ├── migration_events.sql          # events table
│   ├── migration_practice_system.sql # practice system tables
│   ├── add_memo_column.sql
│   ├── add_haengong_percent.sql
│   └── add_naui_yeoksa_column.sql
├── public/
│   └── images/bouquets/       # Bouquet images for personal events
├── supabase-rls-setup.sql     # training_records table + RLS
├── .env.local                 # Local environment variables (not in git)
├── .env.example               # Environment variable template
└── package.json               # Dependencies and scripts
```

## Database Schema

### `users` Table
- `id` (uuid, PK → auth.users)
- `name` (text)
- `email` (text)
- `phone` (text)
- `is_admin` (boolean, default false)
- `created_at` (timestamptz)
- Auto-synced from `auth.users` via trigger

### `training_records` Table
- `id` (uuid, PK)
- `user_id` (uuid → auth.users)
- `date` (date)
- 수련 항목들: 체조, 행공, 본수련, 회건술, 석문도서봉독, 행공퍼센트, 운광복습, 삼주축광, 내면공간, 마음과마음가짐수련, 나의역사, 회광반조, 성찰탐구, memo
- UNIQUE(user_id, date)

### `practice_items` Table
- `id` (uuid, PK)
- `name` (text) - 실천과제명
- `description` (text) - 기준 설명
- `light_per_unit` (decimal) - 1회당 빛
- `is_default` (boolean)
- 10개 기본 과제: 체조, 회건술, 행공, 본수련, 현무, 석문기공, 석문도서봉독, 도장출석, 석문강좌 시청, 선차 마시기

### `user_practice_settings` Table
- `id` (uuid, PK)
- `user_id` (uuid → auth.users)
- `practice_item_id` (uuid → practice_items)
- `is_active` (boolean)
- UNIQUE(user_id, practice_item_id)

### `daily_practice_logs` Table
- `id` (uuid, PK)
- `user_id` (uuid → auth.users)
- `practice_item_id` (uuid → practice_items)
- `date` (date)
- `count` (integer) - 횟수
- `light` (decimal) - count × light_per_unit
- UNIQUE(user_id, practice_item_id, date)

### `user_goals` Table
- `id` (uuid, PK)
- `user_id` (uuid → auth.users, UNIQUE)
- `daily_light_goal` (decimal) - 1일 목표 빛
- `total_light_goal` (decimal) - 누적 목표 빛

### `events` Table
- `id` (uuid, PK)
- `name` (text) - 이벤트명
- `light_threshold` (numeric) - 기준 빛 수
- `is_active` (boolean)
- `winner_user_id` (uuid → auth.users) - 최초 달성자
- `winner_user_name` (text)
- `achieved_light` (numeric)
- `won_at` (timestamptz)

### `personal_events` Table
- `id` (uuid, PK)
- `user_id` (uuid → auth.users)
- `user_name` (text)
- `name` (text) - 개인 이벤트명
- `light_threshold` (numeric) - 목표 빛 수
- `is_active` (boolean)
- `bouquet_image_url` (text) - 꽃다발 이미지
- `achieved_light` (numeric)
- `achieved_at` (timestamptz) - null이면 미달성

**모든 테이블에 RLS(Row Level Security) 적용됨**

## Development Guidelines

### Code Style
- Use TypeScript strict mode
- Follow existing component patterns
- Use Radix UI primitives for accessibility
- Maintain mobile-first responsive design

### Authentication
- All protected routes must use `<ProtectedRoute>` wrapper
- Use `createSupabaseClientWithAuth()` for authenticated API calls
- Auth state managed in `src/store/auth-store.ts`
- Phone numbers are converted to email format: `user_{phone}@gmail.com`

### Database Operations
- Use Supabase client from `src/lib/supabase.ts`
- Always validate user permissions with RLS policies
- Handle errors gracefully with proper status codes

### API Routes
- Located in `src/app/api/`
- Use snake_case for database fields
- Convert to camelCase for API responses
- Return proper JSON responses

### User Titles
- Managed in `src/lib/user-titles.ts`
- 지원장: 청선
- 현사: 심인희, 우봉진, 강성순, 최애숙, 박점섭, 맹강주, 중현
- 생활지로사: 김보향, 황화진
- Default: 도반

## Deployment

### Vercel Deployment

**Production URL**: https://nowon-light-tracker.vercel.app

#### Prerequisites
1. Vercel account with GitHub integration
2. Supabase project configured
3. Git author email must match Vercel account

#### Manual Deployment (수동 배포)

```bash
# 프로덕션에 배포
vercel --prod --yes

# 프리뷰 배포
vercel

# 배포 로그 확인
vercel inspect <deployment-url> --logs
```

#### Environment Variables (Vercel)

Set in Vercel Dashboard → Settings → Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Local Development

```bash
npm install
cp .env.example .env.local
# Edit .env.local with Supabase credentials
npm run dev
```

Open http://localhost:3000

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Troubleshooting

### "supabaseUrl is required" Error
- Check `.env.local` for local development
- Check Vercel environment variables for production

### "Email not confirmed" Error
- Supabase Dashboard → Authentication → Providers → Email
- Disable "Confirm email" toggle

### RLS Policy Violations
- Ensure user is authenticated
- Check RLS policies in Supabase Dashboard
- Verify `user_id` is being set correctly in API routes

### Git Author Permission Issues
- Ensure git author email matches Vercel account
- Use `git config user.email` to check/set email

## Dependencies Reference

### Core
- **next**: 16.1.6 - React framework
- **react**: 19.2.3 - UI library
- **supabase-js**: 2.94.1 - Supabase client

### State & Data
- **zustand**: 5.0.11 - Client state management
- **@tanstack/react-query**: 5.90.20 - Server state management
- **axios**: 1.13.4 - HTTP client

### UI & Styling
- **tailwindcss**: 4 - Utility-first CSS
- **radix-ui**: 1.4.3 - Accessible component primitives
- **lucide-react**: 0.563.0 - Icon library
- **recharts**: 3.7.0 - Chart library
- **sonner**: 2.0.7 - Toast notifications

### Utilities
- **date-fns**: 4.1.0 - Date manipulation
- **clsx**: 2.1.1 - Conditional className utility
- **tailwind-merge**: 3.4.0 - Merge Tailwind classes
- **canvas-confetti**: - Confetti animation for event modals

---

**Last Updated**: 2026-05-03
**Version**: 0.1.0
