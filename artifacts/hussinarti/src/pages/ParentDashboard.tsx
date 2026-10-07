import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookOpen, CalendarCheck, ClipboardList, GraduationCap, Loader2, LogOut, Mail } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";

const attendanceLabels: Record<string, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  excused: "بعذر",
};

const roleDashboardPaths: Record<string, string> = {
  admin: "/dashboard/admin",
  student: "/dashboard/student",
  teacher: "/dashboard/teacher",
  user: "/role-selection",
};

export default function ParentDashboard() {
  const { user, logout, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const children = trpc.parents.getMyChildren.useQuery(undefined, { enabled: user?.role === "parent" });
  const currentStudentId = selectedStudentId ?? children.data?.[0]?.id ?? null;
  const summary = trpc.parents.getChildSummary.useQuery(
    { studentId: currentStudentId ?? 0 },
    { enabled: user?.role === "parent" && currentStudentId !== null },
  );

  useEffect(() => {
    if (!loading && user && user.role !== "parent") {
      setLocation(roleDashboardPaths[user.role] ?? "/role-selection");
    }
  }, [loading, setLocation, user]);

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  if (loading || !user || user.role !== "parent") {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-gradient-to-l from-indigo-700 to-blue-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">بوابة وليّ الأمر</h1>
            <p className="text-blue-100 mt-1">مرحبًا، {user.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-white/15 px-3 py-1 rounded-full text-sm">وليّ أمر</span>
            <Button onClick={handleLogout} variant="outline" size="sm" className="text-white border-white/50 hover:bg-blue-800">
              <LogOut className="w-4 h-4 ml-1.5" /> خروج
            </Button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-3 flex flex-wrap justify-end gap-x-6 gap-y-2">
          <Link href="/messages" className="text-gray-700 hover:text-blue-600 font-medium"><Mail className="inline w-4 h-4 ml-1" />المراسلات</Link>
          <Link href="/calendar" className="text-gray-700 hover:text-blue-600 font-medium"><BookOpen className="inline w-4 h-4 ml-1" />التقويم</Link>
          <Link href="/books" className="text-gray-700 hover:text-blue-600 font-medium"><BookOpen className="inline w-4 h-4 ml-1" />الكتب</Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {children.isLoading ? (
          <Card className="p-10 text-center text-gray-500">جاري تحميل بيانات الأبناء...</Card>
        ) : children.isError ? (
          <Card className="p-8 text-center">
            <h2 className="font-bold text-lg text-red-700">تعذر تحميل بيانات الأبناء</h2>
            <p className="text-gray-500 mt-2">تحقق من اتصالك ثم أعد المحاولة.</p>
            <Button className="mt-4" variant="outline" onClick={() => children.refetch()}>إعادة المحاولة</Button>
          </Card>
        ) : !children.data?.length ? (
          <Card className="p-8 text-center">
            <GraduationCap className="w-10 h-10 text-blue-600 mx-auto mb-3" />
            <h2 className="font-bold text-lg text-gray-800">لم يتم ربط طالب بحسابك بعد</h2>
            <p className="text-gray-500 mt-2">يرجى التواصل مع إدارة المدرسة لربط حساب وليّ الأمر بحساب الطالب.</p>
          </Card>
        ) : (
          <>
            <Card className="p-5">
              <label htmlFor="child-select" className="block text-sm font-medium text-gray-700 mb-2">اختر الطالب</label>
              <select id="child-select" value={currentStudentId ?? ""} onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                className="w-full sm:max-w-md border rounded-md bg-white px-3 py-2 text-sm">
                {children.data.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name ?? "بدون اسم"} · {child.studentNumber ?? `ID ${child.id}`} · {child.schoolSection === "primary" ? "الأساسي" : "المتوسط"} · الصف {child.classLevel}
                  </option>
                ))}
              </select>
            </Card>

            {summary.isLoading ? <Card className="p-10 text-center text-gray-500">جاري تحميل الملخص...</Card>
              : summary.isError ? (
                <Card className="p-8 text-center">
                  <h2 className="font-bold text-lg text-red-700">تعذر تحميل ملخص الطالب</h2>
                  <p className="text-gray-500 mt-2">تحقق من اتصالك ثم أعد المحاولة.</p>
                  <Button className="mt-4" variant="outline" onClick={() => summary.refetch()}>إعادة المحاولة</Button>
                </Card>
              ) : summary.data && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="p-5 text-center"><GraduationCap className="w-6 h-6 text-blue-600 mx-auto mb-2" /><p className="text-sm text-gray-500">النتائج المسجلة</p><p className="text-2xl font-bold">{summary.data.results.length}</p></Card>
                  <Card className="p-5 text-center"><ClipboardList className="w-6 h-6 text-amber-600 mx-auto mb-2" /><p className="text-sm text-gray-500">الواجبات</p><p className="text-2xl font-bold">{summary.data.assignments.length}</p></Card>
                  <Card className="p-5 text-center"><CalendarCheck className="w-6 h-6 text-green-600 mx-auto mb-2" /><p className="text-sm text-gray-500">سجلات الحضور</p><p className="text-2xl font-bold">{summary.data.attendance.length}</p></Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <Card className="p-5">
                    <h2 className="font-bold text-gray-800 mb-3">النتائج الأخيرة</h2>
                    {summary.data.results.length ? summary.data.results.slice(0, 6).map((result) => (
                      <div key={result.id} className="flex items-center justify-between border-b last:border-0 py-2 gap-2">
                        <div><p className="font-medium text-sm">{result.subject}</p><p className="text-xs text-gray-500">{result.semester} · {result.academicYear}</p></div>
                        <span className="font-semibold">{result.score != null ? `${result.score}%` : result.grade}</span>
                      </div>
                    )) : <p className="text-sm text-gray-500">لا توجد نتائج بعد</p>}
                  </Card>

                  <Card className="p-5">
                    <h2 className="font-bold text-gray-800 mb-3">الواجبات</h2>
                    {summary.data.assignments.length ? summary.data.assignments.slice(0, 6).map((assignment) => {
                      const submission = summary.data.submissions.find((item) => item.assignmentId === assignment.id);
                      return <div key={assignment.id} className="border-b last:border-0 py-2">
                        <p className="font-medium text-sm">{assignment.title}</p>
                        <p className="text-xs text-gray-500">{assignment.subject} · {submission ? "تم التسليم" : "لم يسلّم بعد"}</p>
                        {submission?.score !== null && submission?.score !== undefined && <p className="text-xs text-green-700 mt-1">الدرجة: {submission.score}/100</p>}
                      </div>;
                    }) : <p className="text-sm text-gray-500">لا توجد واجبات</p>}
                  </Card>

                  <Card className="p-5">
                    <h2 className="font-bold text-gray-800 mb-3">الحضور الأخير</h2>
                    {summary.data.attendance.length ? summary.data.attendance.slice(0, 6).map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between border-b last:border-0 py-2 gap-2 text-sm">
                        <span>{new Date(entry.attendanceDate).toLocaleDateString("ar-SA")} · {entry.subject}</span>
                        <span className={entry.status === "present" ? "text-green-700" : entry.status === "absent" ? "text-red-600" : "text-amber-700"}>{attendanceLabels[entry.status]}</span>
                      </div>
                    )) : <p className="text-sm text-gray-500">لا يوجد سجل حضور بعد</p>}
                  </Card>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
