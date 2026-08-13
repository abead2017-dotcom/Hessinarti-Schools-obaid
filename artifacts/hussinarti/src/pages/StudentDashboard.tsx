import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GraduationCap, BookOpen, Calendar, Bell, LogOut, Loader2, TrendingUp } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function StudentDashboard() {
  const { user, logout, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const { data: results, isLoading: resultsLoading } = trpc.results.getMyResults.useQuery();
  const { data: books, isLoading: booksLoading } = trpc.books.getBooks.useQuery(
    user?.schoolSection ? { schoolSection: user.schoolSection } : undefined,
  );
  const { data: notifications } = trpc.notifications.getNotifications.useQuery();

  const handleLogout = async () => { await logout(); setLocation("/"); };

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const avg = results && results.length > 0
    ? Math.round(results.filter((r: any) => r.score != null).reduce((s: number, r: any) => s + (r.score ?? 0), 0) / results.filter((r: any) => r.score != null).length)
    : null;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-gradient-to-l from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">لوحة تحكم الطالب</h1>
            <p className="text-blue-100 mt-1">مرحباً {user.name}</p>
            <p className="text-blue-100 text-sm mt-1">
              رقم الطالب: <span className="font-bold">{user.studentNumber ?? "—"}</span>
              {" · "}
              {user.schoolSection === "primary" ? "الأساسي" : user.schoolSection === "middle" ? "المتوسط" : "—"}
              {" · الصف "}
              {user.classLevel ?? "—"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="bg-blue-500 px-3 py-1 rounded-full text-sm">طالب</span>
            <Button onClick={handleLogout} variant="outline" className="text-white border-white hover:bg-blue-700">
              <LogOut className="w-4 h-4 ml-2" /> تسجيل الخروج
            </Button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-end gap-8">
          {([["نتائجي", "/results", GraduationCap], ["الكتب", "/books", BookOpen], ["التقويم", "/calendar", Calendar], ["الإشعارات", "/notifications", Bell]] as const).map(([label, href]) => (
            <Link key={href} href={href} className="text-gray-700 hover:text-blue-600 font-medium transition">{label}</Link>
          ))}
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="p-6 text-center">
            <div className="bg-blue-100 p-4 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <GraduationCap className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-gray-600 text-sm">عدد المواد</p>
            <p className="text-3xl font-bold text-gray-800">{resultsLoading ? "..." : results?.length ?? 0}</p>
          </Card>
          <Card className="p-6 text-center">
            <div className="bg-green-100 p-4 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-gray-600 text-sm">المعدل العام</p>
            <p className="text-3xl font-bold text-gray-800">{avg != null ? avg + "%" : "—"}</p>
          </Card>
          <Card className="p-6 text-center">
            <div className="bg-purple-100 p-4 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-gray-600 text-sm">الإشعارات</p>
            <p className="text-3xl font-bold text-gray-800">{notifications?.length ?? 0}</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">آخر النتائج</h2>
            {resultsLoading ? <p className="text-gray-400 text-center py-8">جاري التحميل...</p>
              : results && results.length > 0
              ? <div className="space-y-3">
                  {results.slice(0, 5).map((r: any) => (
                    <div key={r.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-semibold text-gray-800">{r.subject}</p>
                        <p className="text-sm text-gray-500">{r.semester} — {r.academicYear}</p>
                      </div>
                      <span className={`font-bold text-lg ${(r.score ?? 0) >= 60 ? "text-green-600" : "text-red-500"}`}>
                        {r.score != null ? r.score + "%" : r.grade}
                      </span>
                    </div>
                  ))}
                </div>
              : <p className="text-gray-500 text-center py-8">لا توجد نتائج بعد</p>}
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">آخر الكتب</h2>
            {booksLoading ? <p className="text-gray-400 text-center py-8">جاري التحميل...</p>
              : books && books.length > 0
              ? <div className="space-y-3">
                  {books.slice(0, 5).map((b: any) => (
                    <div key={b.id} className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-semibold text-gray-800">{b.title}</p>
                      <p className="text-sm text-gray-500">{b.subject} — {b.grade}</p>
                    </div>
                  ))}
                </div>
              : <p className="text-gray-500 text-center py-8">لا توجد كتب بعد</p>}
          </Card>
        </div>
      </main>
    </div>
  );
}
