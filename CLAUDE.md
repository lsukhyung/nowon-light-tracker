# Nowon Light Tracker - Claude Code Instructions

## Project Overview

Nowon Light Tracker는 노원지원 100인 도장 달성을 위한 **1만 빛 모으기 역사** 웹 애플리케이션입니다.

**전체 프로젝트 문서**: [AGENTS.md](./AGENTS.md)

## Quick Reference

- **Tech Stack**: Next.js 16 + React 19 + Supabase + Zustand + Tailwind CSS 4
- **Production**: https://nowon-light-tracker.vercel.app
- **GitHub**: https://github.com/lsukhyung/nowon-light-tracker

## Key Rules

- 수동 배포만: `vercel --prod --yes` (사용자가 명시적으로 요청할 때만)
- 조직명: "노원지원" (종로지원 아님)
- DB 마이그레이션: `migrations/` 디렉토리의 SQL 파일을 Supabase SQL Editor에서 실행
- 사용자 인증: 전화번호를 `user_{phone}@gmail.com` 형식으로 변환하여 Supabase Auth 사용

---

상세 문서는 [AGENTS.md](./AGENTS.md)를 참조하세요.
