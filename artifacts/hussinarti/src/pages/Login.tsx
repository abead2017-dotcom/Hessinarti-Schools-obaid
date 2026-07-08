import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GraduationCap, Loader2, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Login() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (user) => {
      if (user.role === "admin") setLocation("/dashboard/admin");
      else if (user.role === "teacher") setLocation("/dashboard/teacher");
      else if (user.role === "student") setLocation("/dashboard/student");
      else setLocation("/role-selection");
    },
  });

  // Redirect if already logged in
  useEffect(() => {
    if (loading || !user) return;
    if (user.role === "admin") setLocation("/dashboard/admin");
    else if (user.role === "teacher") setLocation("/dashboard/teacher");
    else if (user.role === "student") setLocation("/dashboard/student");
    else setLocation("/role-selection");
  }, [user, loading, setLocation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    loginMutation.mutate({ email, password });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">مدارس حسينارتي</h1>
          <p className="text-gray-500 mt-1">تسجيل الدخول إلى حسابك</p>
        </div>

        <Card className="p-8 shadow-lg border-0">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">البريد الإلكتروني</label>
              <Input
                type="email"
                placeholder="example@school.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="text-right"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">كلمة المرور</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="text-right pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginMutation.error && (
              <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                {loginMutation.error.message}
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold"
              disabled={loginMutation.isPending || !email || !password}
            >
              {loginMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin ml-2" /> جاري الدخول...</>
              ) : "تسجيل الدخول"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            ليس لديك حساب؟{" "}
            <Link href="/register" className="text-primary font-medium hover:underline">
              إنشاء حساب جديد
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
