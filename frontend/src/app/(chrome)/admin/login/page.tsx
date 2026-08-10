import { LoginForm } from '@/components/auth/LoginForm';

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <LoginForm admin />
    </div>
  );
}
