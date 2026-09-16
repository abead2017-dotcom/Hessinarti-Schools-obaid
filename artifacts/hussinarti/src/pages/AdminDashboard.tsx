import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BarChart3, BookOpen, Calendar, Bell, LogOut, Plus, Users, Loader2, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = { user: "جديد", student: "طالب", teacher: "معلم", admin: "مدير" };

export default function AdminDashboard() {
  const { user, logout, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"overview" | "users">("overview");
  const [newUser, setNewUser] = useState({
    name: "", email: "", password: "", role: "student" as string,
    schoolSection: "primary" as "primary" | "middle", classLevel: 1,
  });

  const { data: results } = trpc.results.getAllResults.useQuery();
  const { data: books } = trpc.books.getBooks.useQuery();
  const { data: events } = trpc.calendar.getEvents.useQuery();
  const { data: notifications } = trpc.notifications.getNotifications.useQuery();
  const { data: allUsers, refetch: refetchUsers } = trpc.admin.getUsers.useQuery(undefined, { enabled: activeTab === "users" });

  const [confirmDeleteUser, setConfirmDeleteUser] = useState<number | null>(null);
  const setRole = trpc.admin.setUserRole.useMutation({ onSuccess: () => { refetchUsers(); toast.success("تم تغيير الدور"); } });
  const deleteUser = trpc.admin.deleteUser.useMutation({ onSuccess: () => { refetchUsers(); toast.success("تم حذف المستخدم"); setConfirmDeleteUser(null); } });
  const createUser = trpc.admin.createUser.useMutation({
    onSuccess: () => {
      refetchUsers();
      toast.success("تم إنشاء الحساب");
      setNewUser({ name: "", email: "", password: "", role: "student", schoolSection: "primary", classLevel: 1 });
    },
  });

  const handleLogout = async () => { await logout(); setLocation("/login"); };

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const stats = [
    { icon: BarChart3, color: "blue", label: "النتائج", value: results?.length ?? 0, href: "/results" },
    { icon: BookOpen, color: "green", label: "الكتب", value: books?.length ?? 0, href: "/books" },
    { icon: Calendar, color: "yellow", label: "الفعاليات", value: events?.length ?? 0, href: "/calendar" },
    { icon: Bell, color: "red", label: "الإشعارات", value: notifications?.length ?? 0, href: "/notifications" },
  ];

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-gradient-to-l from-purple-600 to-purple-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">لوحة تحكم المدير</h1>
            <p className="text-purple-100 text-sm mt-0.5">مرحباً، {user.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-purple-500/60 px-3 py-1 rounded-full text-sm">مدير</span>
            <Button onClick={handleLogout} variant="outline" size="sm" className="text-white border-white/50 hover:bg-purple-700">
              <LogOut className="w-4 h-4 ml-1.5" /> خروج
            </Button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 flex justify-end gap-6 py-0">
          {[["overview", "نظرة عامة"], ["users", "المستخدمون"]].map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab as any)}
              className={`py-4 text-sm font-medium transition border-b-2 ${activeTab === tab ? "border-purple-600 text-purple-600" : "border-transparent text-gray-600 hover:text-purple-600"}`}>
              {label}
            </button>
          ))}
          {([["النتائج", "/results"], ["الكتب", "/books"], ["التقويم", "/calendar"], ["الإشعارات", "/notifications"]] as const).map(([label, href]) => (
            <Link key={href} href={href} className="py-4 text-sm font-medium text-gray-600 hover:text-purple-600 border-b-2 border-transparent transition">{label}</Link>
          ))}
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {activeTab === "overview" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {stats.map(({ icon: Icon, label, value, href }) => (
                <Link key={href} href={href}>
                  <Card className="p-5 text-center hover:shadow-md transition cursor-pointer">
                    <Icon className="w-6 h-6 text-primary mx-auto mb-2" />
                    <p className="text-gray-500 text-xs mb-1">{label}</p>
                    <p className="text-2xl font-bold text-gray-800">{value}</p>
                  </Card>
                </Link>
              ))}
            </div>

            <Card className="p-6 mb-6">
              <h2 className="text-lg font-bold text-gray-800 mb-3">إجراءات سريعة</h2>
              <div className="flex flex-wrap gap-3">
                {([["رفع نتيجة", "/results"], ["رفع كتاب", "/books"], ["إضافة فعالية", "/calendar"], ["إرسال إشعار", "/notifications"]] as const).map(([label, href]) => (
                  <Link key={href} href={href}>
                    <Button variant="outline" size="sm" className="border-purple-200 text-purple-700 hover:bg-purple-50">
                      <Plus className="w-4 h-4 ml-1.5" /> {label}
                    </Button>
                  </Link>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">آخر النتائج</h2>
                {results?.length ? results.slice(0, 5).map((r: any) => (
                  <div key={r.id} className="p-3 bg-gray-50 rounded-lg mb-2">
                    <p className="font-semibold text-gray-800 text-sm">{r.subject}</p>
                    <p className="text-xs text-gray-500">طالب #{r.studentId} · {r.semester}</p>
                  </div>
                )) : <p className="text-gray-400 text-sm text-center py-6">لا توجد نتائج</p>}
              </Card>
              <Card className="p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">آخر الكتب</h2>
                {books?.length ? books.slice(0, 5).map((b: any) => (
                  <div key={b.id} className="p-3 bg-gray-50 rounded-lg mb-2">
                    <p className="font-semibold text-gray-800 text-sm">{b.title}</p>
                    <p className="text-xs text-gray-500">{b.subject} · {b.grade}</p>
                  </div>
                )) : <p className="text-gray-400 text-sm text-center py-6">لا توجد كتب</p>}
              </Card>
            </div>
          </>
        )}

        {activeTab === "users" && (
          <>
            {/* Add user form */}
            <Card className="p-6 mb-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">إضافة مستخدم جديد</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <Input placeholder="الاسم" value={newUser.name} onChange={(e) => setNewUser(p => ({ ...p, name: e.target.value }))} />
                <Input placeholder="البريد الإلكتروني" type="email" value={newUser.email} onChange={(e) => setNewUser(p => ({ ...p, email: e.target.value }))} />
                <Input placeholder="كلمة المرور" type="password" value={newUser.password} onChange={(e) => setNewUser(p => ({ ...p, password: e.target.value }))} />
                <select value={newUser.role} onChange={(e) => setNewUser(p => ({ ...p, role: e.target.value }))}
                  className="border rounded-md px-3 py-2 text-sm bg-white">
                  <option value="student">طالب</option>
                  <option value="teacher">معلم</option>
                  <option value="admin">مدير</option>
                </select>
                {newUser.role === "student" && (
                  <>
                    <select value={newUser.schoolSection}
                      onChange={(e) => setNewUser(p => ({ ...p, schoolSection: e.target.value as "primary" | "middle", classLevel: 1 }))}
                      className="border rounded-md px-3 py-2 text-sm bg-white">
                      <option value="primary">الأساسي</option>
                      <option value="middle">المتوسط</option>
                    </select>
                    <select value={newUser.classLevel}
                      onChange={(e) => setNewUser(p => ({ ...p, classLevel: Number(e.target.value) }))}
                      className="border rounded-md px-3 py-2 text-sm bg-white">
                      {Array.from({ length: newUser.schoolSection === "primary" ? 6 : 3 }, (_, index) => (
                        <option key={index + 1} value={index + 1}>الصف {index + 1}</option>
                      ))}
                    </select>
                  </>
                )}
              </div>
              <Button disabled={createUser.isPending || !newUser.name || !newUser.email || !newUser.password}
                onClick={() => createUser.mutate({
                  name: newUser.name,
                  email: newUser.email,
                  password: newUser.password,
                  role: newUser.role as any,
                  schoolSection: newUser.role === "student" ? newUser.schoolSection : undefined,
                  classLevel: newUser.role === "student" ? newUser.classLevel : undefined,
                })}>
                {createUser.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Plus className="w-4 h-4 ml-2" />}
                إضافة
              </Button>
            </Card>

            {/* Users list */}
            <Card className="p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" /> المستخدمون ({allUsers?.length ?? 0})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-gray-500">
                    <th className="text-right py-2 px-3">الاسم</th>
                    <th className="text-right py-2 px-3">ID الدخول</th>
                    <th className="text-right py-2 px-3">البريد</th>
                    <th className="text-right py-2 px-3">رقم الطالب</th>
                    <th className="text-right py-2 px-3">القسم والصف</th>
                    <th className="text-right py-2 px-3">الدور</th>
                    <th className="text-right py-2 px-3">تغيير الدور</th>
                    <th className="py-2 px-3"></th>
                  </tr></thead>
                  <tbody>
                    {allUsers?.map((u: any) => (
                      <tr key={u.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-3 font-medium text-gray-800">{u.name ?? "—"}</td>
                        <td className="py-3 px-3 font-mono text-blue-700">{u.studentNumber ?? u.id}</td>
                        <td className="py-3 px-3 text-gray-500">{u.email ?? "—"}</td>
                        <td className="py-3 px-3 font-mono text-blue-700">{u.studentNumber ?? "—"}</td>
                        <td className="py-3 px-3 text-gray-500">
                          {u.schoolSection === "primary" ? "الأساسي" : u.schoolSection === "middle" ? "المتوسط" : "—"}
                          {u.classLevel ? ` — الصف ${u.classLevel}` : ""}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.role === "admin" ? "bg-purple-100 text-purple-700" : u.role === "teacher" ? "bg-green-100 text-green-700" : u.role === "student" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                            {ROLE_LABELS[u.role] ?? u.role}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {u.id !== user.id && (
                            <select
                              defaultValue={u.role}
                              onChange={(e) => {
                                const role = e.target.value as any;
                                setRole.mutate({
                                  userId: u.id,
                                  role,
                                  ...(role === "student" ? {
                                    schoolSection: u.schoolSection ?? "primary",
                                    classLevel: u.classLevel ?? 1,
                                  } : {}),
                                });
                              }}
                              className="border rounded px-2 py-1 text-xs bg-white"
                            >
                              <option value="user">جديد</option>
                              <option value="student">طالب</option>
                              <option value="teacher">معلم</option>
                              <option value="admin">مدير</option>
                            </select>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {u.id !== user.id && (
                            confirmDeleteUser === u.id ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => deleteUser.mutate({ userId: u.id })}
                                  disabled={deleteUser.isPending}
                                  className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 disabled:opacity-50">
                                  تأكيد
                                </button>
                                <button onClick={() => setConfirmDeleteUser(null)}
                                  className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded hover:bg-gray-300">
                                  إلغاء
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmDeleteUser(u.id)}
                                className="text-gray-300 hover:text-red-500 transition p-1 rounded">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    )) ?? <tr><td colSpan={7} className="text-center py-8 text-gray-400">جاري التحميل...</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
