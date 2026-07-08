import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BarChart3, BookOpen, Calendar, Bell, LogOut, Loader2, Plus } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function AdminDashboard() {
  const { user, logout, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const { data: results } = trpc.results.getAllResults.useQuery();
  const { data: books } = trpc.books.getBooks.useQuery();
  const { data: events } = trpc.calendar.getEvents.useQuery();
  const { data: notifications } = trpc.notifications.getNotifications.useQuery();

  const handleLogout = async () => { await logout(); setLocation("/"); };

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const stats = [
    { icon: BarChart3, color: "blue", label: "النتائج", value: results?.length ?? 0 },
    { icon: BookOpen, color: "green", label: "الكتب", value: books?.length ?? 0 },
    { icon: Calendar, color: "yellow", label: "الفعاليات", value: events?.length ?? 0 },
    { icon: Bell, color: "red", label: "الإشعارات", value: notifications?.length ?? 0 },
  ];

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-gradient-to-l from-purple-600 to-purple-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">لوحة تحكم المدير</h1>
            <p className="text-purple-100 mt-1">مرحباً {user.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="bg-purple-500 px-3 py-1 rounded-full text-sm">مدير</span>
            <Button onClick={handleLogout} variant="outline" className="text-white border-white hover:bg-purple-700">
              <LogOut className="w-4 h-4 ml-2" /> تسجيل الخروج
            </Button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-end gap-8">
          <Link href="/results" className="text-gray-700 hover:text-purple-600 font-medium transition">النتائج</Link>
          <Link href="/books" className="text-gray-700 hover:text-purple-600 font-medium transition">الكتب</Link>
          <Link href="/calendar" className="text-gray-700 hover:text-purple-600 font-medium transition">التقويم</Link>
          <Link href="/notifications" className="text-gray-700 hover:text-purple-600 font-medium transition">الإشعارات</Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {stats.map(({ icon: Icon, color, label, value }) => (
            <Card key={label} className="p-6 text-center">
              <div className={`bg-${color}-100 p-4 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3`}>
                <Icon className={`w-6 h-6 text-${color}-600`} />
              </div>
              <p className="text-gray-600 text-sm">{label}</p>
              <p className="text-3xl font-bold text-gray-800">{value}</p>
            </Card>
          ))}
        </div>

        <Card className="p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">إجراءات سريعة</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "رفع نتيجة", href: "/results" },
              { label: "رفع كتاب", href: "/books" },
              { label: "إضافة فعالية", href: "/calendar" },
              { label: "إرسال إشعار", href: "/notifications" },
            ].map(({ label, href }) => (
              <Link key={href} href={href}>
                <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
                  <Plus className="w-4 h-4 ml-2" /> {label}
                </Button>
              </Link>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">آخر النتائج</h2>
            {results && results.length > 0
              ? <div className="space-y-3">
                  {results.slice(0, 5).map((r: any) => (
                    <div key={r.id} className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-semibold text-gray-800">{r.subject}</p>
                      <p className="text-sm text-gray-500">الطالب: #{r.studentId} | {r.semester}</p>
                    </div>
                  ))}
                </div>
              : <p className="text-gray-500 text-center py-8">لا توجد نتائج</p>}
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">آخر الكتب</h2>
            {books && books.length > 0
              ? <div className="space-y-3">
                  {books.slice(0, 5).map((b: any) => (
                    <div key={b.id} className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-semibold text-gray-800">{b.title}</p>
                      <p className="text-sm text-gray-500">{b.subject} — {b.grade}</p>
                    </div>
                  ))}
                </div>
              : <p className="text-gray-500 text-center py-8">لا توجد كتب</p>}
          </Card>
        </div>
      </main>
    </div>
  );
}
