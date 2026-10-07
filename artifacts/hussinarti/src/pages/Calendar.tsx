import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, Calendar as CalendarIcon, Plus, Loader2, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

const EVENT_TYPES = ["دراسي", "إجازة", "امتحان", "فعالية", "اجتماع"];

export default function Calendar() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const isAdmin = user?.role === "admin";

  const { data: events, isLoading, refetch } = trpc.calendar.getEvents.useQuery(
    user?.schoolSection ? { schoolSection: user.schoolSection } : undefined,
  );
  const addEvent = trpc.calendar.addEvent.useMutation({
    onSuccess: () => { refetch(); toast.success("تم إضافة الفعالية"); resetForm(); },
  });
  const deleteEvent = trpc.calendar.deleteEvent.useMutation({
    onSuccess: () => { refetch(); toast.success("تم حذف الفعالية"); setConfirmDelete(null); },
  });

  const [form, setForm] = useState({
    title: "", description: "", startDate: "", endDate: "", eventType: "دراسي",
    schoolSection: "" as "" | "primary" | "middle",
  });
  const resetForm = () => setForm({
    title: "", description: "", startDate: "", endDate: "", eventType: "دراسي", schoolSection: "",
  });
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const backHref = user?.role === "admin" ? "/dashboard/admin" : user?.role === "teacher" ? "/dashboard/teacher" : user?.role === "parent" ? "/dashboard/parent" : "/dashboard/student";

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href={backHref}><Button variant="ghost" size="sm"><ArrowRight className="w-4 h-4" /></Button></Link>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-gray-800">التقويم الدراسي</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isAdmin && (
          <Card className="p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-800 mb-4">إضافة فعالية</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <Input placeholder="عنوان الفعالية" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
              <select value={form.eventType} onChange={(e) => setForm((p) => ({ ...p, eventType: e.target.value }))}
                className="border rounded-md px-3 py-2 text-sm bg-white text-gray-700">
                {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <Input type="datetime-local" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
              <Input type="datetime-local" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} />
              <select value={form.schoolSection} onChange={(e) => setForm((p) => ({ ...p, schoolSection: e.target.value as "" | "primary" | "middle" }))}
                className="border rounded-md px-3 py-2 text-sm bg-white text-gray-700">
                <option value="">لجميع الأقسام</option>
                <option value="primary">الأساسي</option>
                <option value="middle">المتوسط</option>
              </select>
              <Input placeholder="وصف (اختياري)" className="sm:col-span-2" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <Button disabled={addEvent.isPending || !form.title || !form.startDate}
              onClick={() => addEvent.mutate({
                title: form.title,
                description: form.description || undefined,
                startDate: new Date(form.startDate),
                endDate: form.endDate ? new Date(form.endDate) : undefined,
                eventType: form.eventType,
                schoolSection: form.schoolSection || undefined,
              })}>
              {addEvent.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Plus className="w-4 h-4 ml-2" />}
              إضافة
            </Button>
          </Card>
        )}

        <div className="space-y-4">
          {isLoading ? <p className="text-center text-gray-400 py-12">جاري التحميل...</p>
            : events && events.length > 0
            ? events.map((e: any) => (
                <Card key={e.id} className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 p-3 rounded-lg flex-shrink-0 text-center min-w-[56px]">
                      <p className="text-primary font-bold text-lg leading-none">{new Date(e.startDate).getDate()}</p>
                      <p className="text-primary text-xs">{new Date(e.startDate).toLocaleDateString("ar-SA", { month: "short" })}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-800">{e.title}</h3>
                        <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full flex-shrink-0">{e.eventType}</span>
                      </div>
                      {e.description && <p className="text-sm text-gray-600">{e.description}</p>}
                      <p className="text-xs text-gray-400 mt-1">{new Date(e.startDate).toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                    </div>
                    {isAdmin && (
                      <div className="flex-shrink-0">
                        {confirmDelete === e.id ? (
                          <div className="flex flex-col gap-1">
                            <button onClick={() => deleteEvent.mutate({ id: e.id })}
                              disabled={deleteEvent.isPending}
                              className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 disabled:opacity-50 whitespace-nowrap">
                              تأكيد
                            </button>
                            <button onClick={() => setConfirmDelete(null)}
                              className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded hover:bg-gray-300">
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDelete(e.id)}
                            className="text-gray-300 hover:text-red-500 transition p-1 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              ))
            : <p className="text-center text-gray-500 py-12">لا توجد فعاليات</p>}
        </div>
      </main>
    </div>
  );
}
