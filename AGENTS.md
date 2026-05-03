# Nowon Light Tracker - AI Agents Reference

## Project Overview

**Nowon Light Tracker** is a Next.js 16 application for tracking workout/training sessions with Supabase backend.

- **Framework**: Next.js 16.1.6 with React 19.2.3
- **Backend**: Supabase (PostgreSQL with Row Level Security)
- **State Management**: Zustand (client) + TanStack Query (server)
- **UI Components**: Radix UI primitives with Tailwind CSS 4
- **Charts**: Recharts 3.7.0
- **Styling**: Tailwind CSS 4 with tw-animate-css

## AI Agent Behavior Policies

1. **Be Cautious with Modifications**: When making code modifications (especially frontend UI/UX changes), carefully consider side-effects across different platforms (e.g., iOS Safari specific physics, layout shifts, or local storage persistence). Do not rush structural changes without understanding the broader impact.
2. **Manual Vercel Deployment**: ⚠️ Do NOT deploy to Vercel automatically. Only run deployment commands (e.g., `vercel --prod`) when the USER explicitly requests a deployment ("배포해줘").

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
│   │   │   └── training/      # Training records endpoints
│   │   │       ├── route.ts           # GET (all), POST (create)
│   │   │       ├── [id]/route.ts      # GET, PUT, DELETE by ID
│   │   │       ├── date/[date]/       # GET by date
│   │   │       └── stats/route.ts     # GET statistics
│   │   ├── login/           # Login page
│   │   ├── register/        # Registration page
│   │   ├── layout.tsx       # Root layout with auth provider
│   │   └── page.tsx         # Main dashboard
│   ├── components/
│   │   ├── auth/            # Authentication components
│   │   │   ├── auth-provider.tsx     # Auth context provider
│   │   │   └── protected-route.tsx   # Route guard component
│   │   ├── training/        # Training-related components
│   │   │   ├── training-calendar.tsx # Calendar view
│   │   │   ├── training-card.tsx      # Record card
│   │   │   ├── training-form.tsx      # Create/edit form
│   │   │   └── training-list.tsx      # List view
│   │   └── ui/              # Reusable UI components (Radix UI)
│   ├── lib/
│   │   ├── supabase.ts      # Supabase client configuration
│   │   └── utils.ts         # Utility functions (cn, etc.)
│   ├── store/
│   │   └── auth-store.ts    # Zustand auth state management
│   └── types/
│       └── index.ts         # TypeScript type definitions
├── public/                  # Static assets
├── .env.local              # Local environment variables (not in git)
├── .env.example            # Environment variable template
└── package.json            # Dependencies and scripts
```

## Environment Variables

Required environment variables (see `.env.example`):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Get these from**: Supabase Dashboard → Project → Settings → API

## Database Schema

### `training_records` Table
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key → auth.users)
- `date` (date)
- `type` (text) - workout type
- `duration` (integer) - minutes
- `intensity` (integer) - 1-10 scale
- `notes` (text) - optional notes
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Row Level Security (RLS)**: Enabled with policies to ensure users can only access their own records.

See `supabase-rls-setup.sql` for complete RLS policy definitions.

## Deployment

### Vercel Deployment

**Production URL**: https://training-tracker-chi.vercel.app

#### Prerequisites
1. Vercel account with GitHub integration
2. Supabase project configured
3. Git author email must match Vercel account

#### Deployment Steps

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Set Environment Variables**:
   ```bash
   echo "https://your-project.supabase.co" | vercel env add NEXT_PUBLIC_SUPABASE_URL production
   echo "your-anon-key" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
   ```

4. **Deploy to Production**:
   ```bash
   vercel --yes --prod
   ```

#### Automatic Deployment
- GitHub repository is connected to Vercel
- Push to `master` branch triggers automatic production deployment
- Feature branches create preview deployments

#### Manual Deployment (수동 배포)

자동 배포가 작동하지 않을 때 수동으로 배포하는 방법입니다.

**1. Git 사용자 설정 확인**

Vercel은 Git 커밋 작성자의 이메일을 확인합니다. **반드시 `lsukhyung@gmail.com`으로 설정해야 합니다.**

```bash
# 현재 Git 설정 확인
git config user.email
git config user.name

# lsukhyung@gmail.com으로 설정 (필수!)
git config user.email "lsukhyung@gmail.com"
git config user.name "lsukhyung"
```

⚠️ **중요**: 다른 이메일로 설정되어 있으면 Vercel 배포가 실패합니다.

**2. Vercel CLI 설치 및 로그인**

```bash
# Vercel CLI 전역 설치
npm install -g vercel

# 버전 확인
vercel --version

# Vercel 로그인 (이메일 인증 필요)
vercel login
```

로그인 과정:
1. 이메일 주소 입력
2. 받은 메일에서 인증 링크 클릭
3. "You're now logged in" 메시지 확인

**3. 프로젝트 연결 (최초 1회)**

```bash
# 프로젝트 루트 디렉토리에서 실행
vercel

# 질문에 답변:
# - Set up and deploy? [Y/n] → Y
# - Which scope? → 본인 계정 또는 팀 선택
# - Link to existing project? [y/N] → y (기존 프로젝트가 있는 경우)
# - What's the name of your existing project? → nowon-light-tracker
```

**4. 프로덕션 배포**

```bash
# 프로덕션에 배포 (--yes는 모든 질문에 자동으로 yes)
vercel --prod --yes
```

배포 과정:
1. 프로젝트 파일 업로드
2. 빌드 실행 (npm run build)
3. 배포 완료 → URL 출력

**5. 배포 확인**

```bash
# 배포 로그 확인
vercel inspect <deployment-url> --logs

# 최근 배포 목록
vercel ls

# 프로젝트 정보
vercel inspect
```

**문제 해결**

❌ **"Git author must have access to the team" 에러**
```bash
# Git 작성자 이메일을 lsukhyung@gmail.com으로 변경 (필수!)
git config user.email "lsukhyung@gmail.com"
git config user.name "lsukhyung"

# 빈 커밋으로 새 작성자 정보 반영
git commit --allow-empty -m "chore: update git author for deployment"
git push origin master

# 다시 배포
vercel --prod --yes
```

❌ **환경 변수 누락 에러**
```bash
# Vercel 대시보드에서 설정: Settings → Environment Variables
# 또는 CLI로 설정:
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

❌ **빌드 실패**
```bash
# 로컬에서 빌드 테스트
npm run build

# 빌드 캐시 제거 후 재배포
rm -rf .next
vercel --prod --yes
```

**유용한 명령어**

```bash
# 개발 환경에 배포 (프리뷰)
vercel

# 특정 브랜치 배포
vercel --prod

# 이전 배포 재배포
vercel redeploy <deployment-url> --prod

# 배포 취소/롤백
vercel rollback

# 프로젝트 환경 변수 확인
vercel env ls

# 도메인 목록
vercel domains ls
```

**자동 배포 활성화 확인**

Vercel 대시보드에서:
1. 프로젝트 선택
2. **Settings** → **Git**
3. "Production Branch" → `master` 확인
4. "Ignored Build Step" → 비활성화 확인
5. Git Integration 연결 상태 확인

## Development

### Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Key Features Implemented

### Authentication
- Email/password registration
- Secure login with Supabase Auth
- Protected routes with `ProtectedRoute` component
- Auth state management with Zustand

### Training Records
- Create training records with form validation
- View records by date (calendar view)
- List view of all records
- Edit and delete records
- Statistics dashboard with charts

### Mobile Optimization
- Touch-friendly slider controls
- Responsive design for all screen sizes
- Optimized mobile viewport settings

## Common Tasks

### Add a New API Endpoint

1. Create route file in `src/app/api/`
2. Use `createSupabaseClientWithAuth()` for authenticated requests
3. Handle errors and return proper JSON responses
4. Test with `curl` or Postman

### Add a New Page

1. Create directory in `src/app/`
2. Add `page.tsx` with React component
3. Wrap with `ProtectedRoute` if authentication required
4. Add navigation link in existing pages

### Database Schema Changes

1. Update schema in Supabase Dashboard
2. Update TypeScript types in `src/types/index.ts`
3. Update API endpoints to handle new fields
4. Update forms and components to use new fields

## Troubleshooting

### "supabaseUrl is required" Error
- Check that environment variables are set in `.env.local` for local development
- Check Vercel environment variables for production

### RLS Policy Violations
- Ensure user is authenticated
- Check RLS policies in Supabase Dashboard
- Verify `user_id` is being set correctly in API routes

### Git Author Permission Issues
- Ensure git author email matches Vercel account
- Use `git config user.email` to check/set email
- Create a new commit to update git author

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

---

**Last Updated**: 2026-02-06
**Version**: 0.1.0
