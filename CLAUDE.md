# Nowon Light Tracker - Claude Code Instructions

## Project Overview

Nowon Light Tracker is a Next.js 16 application for tracking workout/training sessions with Supabase backend.

## Quick Reference

**Full project documentation, architecture, and deployment guide**: See [AGENTS.md](./AGENTS.md)

## Key Information for Claude

### Tech Stack
- **Framework**: Next.js 16 + React 19
- **Backend**: Supabase (PostgreSQL with RLS)
- **State**: Zustand (client) + TanStack Query (server)
- **UI**: Radix UI + Tailwind CSS 4
- **Charts**: Recharts

### Environment Setup
Required environment variables (see `.env.example`):
```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Project Structure
```
src/
├── app/              # Next.js app router pages
│   ├── api/          # API routes
│   ├── login/        # Login page
│   └── register/     # Registration page
├── components/       # React components
│   ├── auth/         # Authentication components
│   ├── training/     # Training-related components
│   └── ui/           # Reusable UI components
├── lib/
│   └── supabase.ts   # Supabase client configuration
├── store/            # Zustand stores
└── types/            # TypeScript types
```

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

### Database Operations
- Use Supabase client from `src/lib/supabase.ts`
- Always validate user permissions with RLS policies
- Handle errors gracefully with proper status codes

### API Routes
- Located in `src/app/api/`
- Use snake_case for database fields
- Convert to camelCase for API responses
- Return proper JSON responses

## Deployment

**Production**: https://training-tracker-chi.vercel.app

See [AGENTS.md](./AGENTS.md#deployment) for complete deployment instructions.

## Troubleshooting

Common issues and solutions are documented in [AGENTS.md](./AGENTS.md#troubleshooting).

---

**Note**: This file contains quick reference. For comprehensive documentation including:
- Complete project structure
- Database schema
- Deployment guide
- Common tasks
- Dependencies reference

See **[AGENTS.md](./AGENTS.md)**
