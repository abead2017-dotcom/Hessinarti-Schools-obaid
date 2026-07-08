import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookOpen, Calendar, Bell, LogOut, Loader2, Users } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function TeacherDashboard() {
  const { user, logout, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const { data: books, isLoading: booksLoading } = trpc.books.getBooks.useQuery();
  const { data: events } = trpc.calendar.getEvents.useQuery();
  const { data: notifications } = trpc.notifications.getNotifications.useQuery();

  const handleLogout = async () => { await logout(); setLocation("/"); };

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-gradient-to-l from-green-600 to-green-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">لوحة تحكم المعلم</h1>
            <p className="text-green-100 mt-1">مرحباً {user.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="bg-green-500 px-3 py-1 rounded-full text-sm">معلم</span>
            <Button onClick={handleLogout} variant="outline" className="text-white border-white hover:bg-green-700">
              <LogOut className="w-4 h-4 ml-2" /> تسجيل الخروج
            </Button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-end gap-8">
          <Link href="/books" className="text-gray-700 hover:text-green-600 font-medium transition">الكتب</Link>
          <Link href="/calendar" className="text-gray-700 hover:text-green-600 font-medium transition">التقويم</Link>
          <Link href="/notifications" className="text-gray-700 hover:text-green-600 font-medium transition">الإشعارات</Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: BookOpen, color: "blue", label: "الكتب المرفوعة", value: booksLoading ? "..." : books?.length ?? 0 },
            { icon: Calendar, color: "green", label: "المواعيد", value: events?.length ?? 0 },
            { icon: Bell, color: "purple", label: "الإشعارات", value: notifications?.length ?? 0 },
          ].map(({ icon: Icon, color, label, value }) => (
            <Card key={label} className="p-6 text-center">
              <div className={`bg-${color}-100 p-4 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3`}>
                <Icon className={`w-6 h-6 text-${color}-600`} />
              </div>
              <p className="text-gray-600 text-sm">{label}</p>
              <p className="text-3xl font-bold text-gray-800">{value}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">الكتب المرفوعة</h2>
              <Link href="/books">
                <Button size="sm" className="text-xs">رفع كتاب</Button>
              </Link>
            </div>
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
              : <p className="text-gray-500 text-center py-8">لم يتم رفع كتب بعد</p>}
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">المواعيد القادمة</h2>
            {events && events.length > 0
              ? <div className="space-y-3">
                  {events.slice(0, 5).map((e: any) => (
                    <div key={e.id} className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-semibold text-gray-800">{e.title}</p>
                      <p className="text-sm text-gray-500">{new Date(e.startDate).toLocaleDateString("ar-SA")}</p>
                    </div>
                  ))}
                </div>
              : <p className="text-gray-500 text-center py-8">لا توجد مواعيد قادمة</p>}
          </Card>
        </div>
      </main>
    </div>
  );
}
