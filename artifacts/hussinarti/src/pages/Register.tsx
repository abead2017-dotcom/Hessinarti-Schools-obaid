import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GraduationCap, Loader2, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Register() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [clientError, setClientError] = useState("");

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (user) => {
      if (user.role === "admin") setLocation("/dashboard/admin");
      else setLocation("/role-selection");
    },
  });

  useEffect(() => {
    if (loading || !user) return;
    if (user.role === "admin") setLocation("/dashboard/admin");
    else if (user.role === "teacher") setLocation("/dashboard/teacher");
    else if (user.role === "student") setLocation("/dashboard/student");
    else if (user.role === "parent") setLocation("/dashboard/parent");
    else setLocation("/role-selection");
  }, [user, loading, setLocation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClientError("");
    if (password !== confirm) { setClientError("كلمتا المرور غير متطابقتين"); return; }
    if (password.length < 8) { setClientError("كلمة المرور يجب أن تكون 8 أحرف على الأقل"); return; }
    registerMutation.mutate({ name, email, password });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">مدارس حسينارتي</h1>
          <p className="text-gray-500 mt-1">إنشاء حساب جديد</p>
        </div>

        <Card className="p-8 shadow-lg border-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">الاسم الكامل</label>
              <Input
                placeholder="محمد أحمد"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
                minLength={2}
                className="text-right"
              />
            </div>

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
                  placeholder="8 أحرف على الأقل"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">تأكيد كلمة المرور</label>
              <Input
                type="password"
                placeholder="أعد كتابة كلمة المرور"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
                className="text-right"
              />
            </div>

            {(clientError || registerMutation.error) && (
              <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                {clientError || registerMutation.error?.message}
              </p>
            )}

            <div className="text-xs text-gray-400 bg-blue-50 p-3 rounded-lg">
              💡 المستخدم الأول الذي يسجل يحصل على صلاحيات المدير تلقائياً
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold"
              disabled={registerMutation.isPending || !name || !email || !password || !confirm}
            >
              {registerMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin ml-2" /> جاري الإنشاء...</>
              ) : "إنشاء الحساب"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            لديك حساب بالفعل؟{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              تسجيل الدخول
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
