import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { GraduationCap, BookOpen, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";

type Role = "student" | "teacher";
const roles: { value: Role; label: string; desc: string; icon: typeof GraduationCap; color: string }[] = [
  { value: "student", label: "طالب", desc: "عرض النتائج والكتب والتقويم", icon: GraduationCap, color: "from-blue-400 to-blue-600" },
  { value: "teacher", label: "معلم", desc: "إدارة الكتب والمواد الدراسية", icon: BookOpen, color: "from-green-400 to-green-600" },
];

export default function RoleSelection() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const [setupRole, setSetupRole] = useState<Role | null>(null);
  const [schoolSection, setSchoolSection] = useState<"primary" | "middle">("primary");
  const [classLevel, setClassLevel] = useState(1);
  const updateRole = trpc.auth.updateUserRole.useMutation({
    onSuccess: (updated) => {
      if (updated.role === "teacher") setLocation("/dashboard/teacher");
      else setLocation("/dashboard/student");
    },
  });

  const chooseRole = (role: Role) => {
    setSetupRole(role);
  };

  const confirmStudent = () => {
    if (!setupRole) return;
    updateRole.mutate({
      role: setupRole,
      schoolSection,
      ...(setupRole === "student" ? { classLevel } : {}),
    });
  };

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
          <p className="text-gray-500">
            {setupRole ? (setupRole === "student" ? "حدد القسم والصف الدراسي" : "حدد القسم الدراسي") : "اختر دورك لتبدأ"}
          </p>
        </div>

        {!setupRole ? <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
          {roles.map(({ value, label, desc, icon: Icon, color }) => (
            <button
              key={value}
              disabled={updateRole.isPending}
              onClick={() => chooseRole(value)}
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
        </div> : (
          <div className="bg-white rounded-2xl p-6 shadow-md max-w-md mx-auto">
            <label className="block text-sm font-medium text-gray-700 mb-2">القسم</label>
            <select
              value={schoolSection}
              onChange={(e) => {
                const next = e.target.value as "primary" | "middle";
                setSchoolSection(next);
                setClassLevel(1);
              }}
              className="w-full border rounded-lg px-3 py-2 mb-4 bg-white"
            >
              <option value="primary">الأساسي — الصف الأول إلى السادس</option>
              <option value="middle">المتوسط — الصف الأول إلى الثالث</option>
            </select>

            {setupRole === "student" && (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-2">الصف الدراسي</label>
                <select
                  value={classLevel}
                  onChange={(e) => setClassLevel(Number(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 mb-5 bg-white"
                >
                  {Array.from({ length: schoolSection === "primary" ? 6 : 3 }, (_, index) => (
                    <option key={index + 1} value={index + 1}>الصف {index + 1}</option>
                  ))}
                </select>
              </>
            )}

            {updateRole.error && <p className="text-red-500 text-sm mb-3">{updateRole.error.message}</p>}
            <div className="flex gap-3">
              <button
                onClick={confirmStudent}
                disabled={updateRole.isPending}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 font-medium disabled:opacity-60"
              >
                {updateRole.isPending ? "جاري الحفظ..." : "تأكيد التسجيل"}
              </button>
              <button
                onClick={() => setSetupRole(null)}
                disabled={updateRole.isPending}
                className="px-4 bg-gray-100 text-gray-700 rounded-lg"
              >
                رجوع
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
