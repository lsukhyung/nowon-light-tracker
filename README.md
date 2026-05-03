# 노원 빛 트래커 (Nowon Light Tracker)

노원 수련원 회원들의 일일 수련 기록을 관리하고 추적하는 웹 애플리케이션입니다.

## 주요 기능

- 📋 **수련 기록 관리** – 매일 체조, 행공, 본수련 등 항목별 수련 내역 입력/조회
- 📊 **통계 대시보드** – 기간별 수련 현황 차트 및 요약
- 🔐 **계정 관리** – 로그인, 비밀번호 변경, 수련 목표 설정
- 🛡️ **관리자 기능** – 잠긴 계정 및 비밀번호 초기화 요청 관리
- 🔒 **보안** – 5회 오류 시 계정 잠금, 관리자 비밀번호 초기화, 임시 비밀번호 1회용 발급

---

## 기술 스택

- **프레임워크**: [Next.js](https://nextjs.org) 16 (App Router)
- **언어**: TypeScript
- **DB / Auth**: [Supabase](https://supabase.com)
- **스타일**: Tailwind CSS v4
- **배포**: [Vercel](https://vercel.com)

---

## 로컬 실행 방법

### 1. 저장소 클론 및 의존성 설치

```bash
git clone <저장소 URL>
cd nowon-light-tracker
npm install
```

### 2. 환경변수 설정

루트 디렉토리에 `.env.local` 파일을 생성하고 아래 내용을 채워주세요:

```env
# Supabase 설정 (Supabase 대시보드 > Project Settings > API에서 확인)
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# 관리자 계정 이메일 목록 (쉼표로 구분)
ADMIN_EMAILS=user_01012345678@gmail.com
```

### 3. 개발 서버 실행

```bash
npm run dev
```

### 로컬 접속 URL

```
http://localhost:3000
```

---

## 배포 방법 (Vercel)

### 사전 준비

1. [Vercel](https://vercel.com)에서 新규 프로젝트를 생성합니다.
2. Vercel 대시보드 → 프로젝트 → **Settings → Environment Variables**에서 `.env.local`의 환경변수를 동일하게 등록합니다.

### Vercel CLI를 통한 배포

```bash
# CLI 설치 (최초 1회)
npm install -g vercel

# 프리뷰 배포
vercel

# 운영 배포
vercel --prod
```

> `.vercel/project.json`이 이미 있다면 프로젝트가 자동으로 연결됩니다.

---

## 접속 URL

| 환경 | URL |
|------|-----|
| 로컬 | http://localhost:3000 |
| 운영 (Production) | https://nowon-light-tracker.vercel.app |

---

## 관리자 설정

- `.env.local`의 `ADMIN_EMAILS`에 관리자 계정의 전화번호를 `user_01012345678@gmail.com` 형식으로 추가합니다.
- 관리자 페이지 접속: `/admin`
- 비밀번호 5회 오류로 잠긴 계정이나 초기화 요청 계정이 있을 때 관리자 페이지에 목록이 자동으로 표시됩니다.
