import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, Bell, Plus, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

export default function Notifications() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const isAdmin = user?.role === "admin";

  const { data: notifications, isLoading, refetch } = trpc.notifications.getNotifications.useQuery();
  const send = trpc.notifications.sendNotification.useMutation({
    onSuccess: () => { refetch(); toast.success("تم إرسال الإشعار"); resetForm(); },
  });
  const [form, setForm] = useState({ title: "", message: "", recipientType: "all" as "all" | "students" | "specific" });
  const resetForm = () => setForm({ title: "", message: "", recipientType: "all" });

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const backHref = user?.role === "admin" ? "/dashboard/admin" : user?.role === "teacher" ? "/dashboard/teacher" : "/dashboard/student";

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href={backHref}><Button variant="ghost" size="sm"><ArrowRight className="w-4 h-4" /></Button></Link>
          <div className="flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-gray-800">الإشعارات</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isAdmin && (
          <Card className="p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-800 mb-4">إرسال إشعار جديد</h2>
            <div className="space-y-3 mb-4">
              <Input placeholder="عنوان الإشعار" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
              <textarea
                placeholder="نص الإشعار"
                value={form.message}
                onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                className="w-full border rounded-md px-3 py-2 text-sm min-h-[100px] resize-none"
              />
              <select value={form.recipientType} onChange={(e) => setForm((p) => ({ ...p, recipientType: e.target.value as any }))}
                className="border rounded-md px-3 py-2 text-sm bg-white w-full">
                <option value="all">للجميع</option>
                <option value="students">للطلاب فقط</option>
                <option value="specific">محدد</option>
              </select>
            </div>
            <Button disabled={send.isPending || !form.title || !form.message}
              onClick={() => send.mutate(form)}>
              {send.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Plus className="w-4 h-4 ml-2" />}
              إرسال
            </Button>
          </Card>
        )}

        <div className="space-y-4">
          {isLoading ? <p className="text-center text-gray-400 py-12">جاري التحميل...</p>
            : notifications && notifications.length > 0
            ? notifications.map((n: any) => (
                <Card key={n.id} className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg flex-shrink-0">
                      <Bell className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800 mb-1">{n.title}</h3>
                      <p className="text-gray-600 text-sm mb-2">{n.message}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleDateString("ar-SA")}</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {n.recipientType === "all" ? "للجميع" : n.recipientType === "students" ? "للطلاب" : "محدد"}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            : <p className="text-center text-gray-500 py-12">لا توجد إشعارات</p>}
        </div>
      </main>
    </div>
  );
}
