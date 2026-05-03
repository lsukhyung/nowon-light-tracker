import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="leading-tight mb-4">
            <span className="block text-xl sm:text-2xl font-semibold mb-1">노원지원 80인 도장 달성을 위한</span>
            <span className="block text-3xl sm:text-4xl font-extrabold mt-1">1만 빛 ☀️ 모으기 역사</span>
          </h1>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
