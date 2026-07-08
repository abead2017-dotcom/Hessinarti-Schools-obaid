import { useAuth } from "@/_core/hooks/useAuth";
import { BookOpen, Calendar, Bell, GraduationCap } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading || !user) return;
    if (user.role === "admin") setLocation("/dashboard/admin");
    else if (user.role === "teacher") setLocation("/dashboard/teacher");
    else if (user.role === "student") setLocation("/dashboard/student");
    else setLocation("/role-selection");
  }, [user, loading, setLocation]);

  const features = [
    { icon: GraduationCap, title: "إدارة النتائج", desc: "تتبع ورفع نتائج الطلاب" },
    { icon: BookOpen, title: "مكتبة الكتب", desc: "مواد دراسية لجميع الصفوف" },
    { icon: Calendar, title: "التقويم الدراسي", desc: "متابعة جدول المواعيد والفعاليات" },
    { icon: Bell, title: "الإشعارات", desc: "إبقاء الجميع على اطلاع دائم" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50" dir="rtl">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">مدارس حسينارتي</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <button className="text-gray-600 hover:text-primary font-medium text-sm transition">
                تسجيل الدخول
              </button>
            </Link>
            <Link href="/register">
              <button className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition text-sm">
                إنشاء حساب
              </button>
            </Link>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <GraduationCap className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4 leading-tight">
          منصة <span className="text-primary">حسينارتي</span> للمدارس
        </h2>
        <p className="text-gray-500 text-lg mb-8 max-w-xl mx-auto">
          نظام متكامل لإدارة الطلاب والمعلمين والنتائج والمواد الدراسية
        </p>
        <Link href="/register">
          <button className="inline-block bg-primary text-white px-8 py-3 rounded-xl font-bold text-lg hover:opacity-90 transition shadow-md">
            ابدأ الآن مجاناً
          </button>
        </Link>
      </section>

      <section className="container mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition text-center">
              <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-gray-800 mb-1">{title}</h3>
              <p className="text-gray-500 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center py-6 text-gray-400 text-sm border-t border-gray-100">
        © 2025 مدارس حسينارتي — جميع الحقوق محفوظة
      </footer>
    </div>
  );
}
