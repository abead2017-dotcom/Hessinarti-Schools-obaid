import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { GraduationCap, BookOpen, BarChart3, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

type Role = "student" | "teacher" | "admin";
const roles: { value: Role; label: string; desc: string; icon: typeof GraduationCap; color: string }[] = [
  { value: "student", label: "طالب", desc: "عرض النتائج والكتب والتقويم", icon: GraduationCap, color: "from-blue-400 to-blue-600" },
  { value: "teacher", label: "معلم", desc: "إدارة الكتب والمواد الدراسية", icon: BookOpen, color: "from-green-400 to-green-600" },
  { value: "admin", label: "مدير", desc: "إدارة كاملة للمنصة", icon: BarChart3, color: "from-purple-400 to-purple-600" },
];

export default function RoleSelection() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const updateRole = trpc.auth.updateUserRole.useMutation({
    onSuccess: (updated) => {
      if (updated.role === "admin") setLocation("/dashboard/admin");
      else if (updated.role === "teacher") setLocation("/dashboard/teacher");
      else setLocation("/dashboard/student");
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">مرحباً {user.name || "بك"}!</h1>
          <p className="text-gray-500">اختر دورك لتبدأ</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {roles.map(({ value, label, desc, icon: Icon, color }) => (
            <button
              key={value}
              disabled={updateRole.isPending}
              onClick={() => updateRole.mutate({ role: value })}
              className="bg-white rounded-2xl p-6 shadow-md border border-transparent hover:border-primary/30 hover:shadow-lg transition-all text-center group disabled:opacity-60"
            >
              <div className={`bg-gradient-to-br ${color} w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md group-hover:scale-105 transition-transform`}>
                <Icon className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">{label}</h2>
              <p className="text-gray-500 text-sm">{desc}</p>
              {updateRole.isPending && updateRole.variables?.role === value && (
                <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mt-2" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
