import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Loader2, Mail, Send } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

const roleLabels: Record<string, string> = {
  admin: "مدير",
  teacher: "معلم",
  student: "طالب",
  user: "مستخدم جديد",
};

export default function Messages() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [form, setForm] = useState({ recipientId: "", subject: "", body: "" });
  const users = trpc.messages.getUsers.useQuery(undefined, { enabled: Boolean(user) });
  const messages = trpc.messages.getMine.useQuery(undefined, { enabled: Boolean(user) });
  const send = trpc.messages.send.useMutation({
    onSuccess: () => {
      messages.refetch();
      toast.success("تم إرسال الرسالة");
      setForm({ recipientId: "", subject: "", body: "" });
    },
  });

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const backPath = user.role === "student" ? "/dashboard/student" : user.role === "admin" ? "/dashboard/admin" : "/dashboard/teacher";

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href={backPath}><Button variant="ghost" size="sm"><ArrowRight className="w-4 h-4" /></Button></Link>
          <Mail className="w-6 h-6 text-primary" />
          <div><h1 className="text-xl font-bold text-gray-800">المراسلات</h1><p className="text-xs text-gray-500">تواصل داخلي مع أعضاء المدرسة</p></div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">رسالة جديدة</h2>
          <div className="space-y-3">
            <select value={form.recipientId} onChange={(e) => setForm((p) => ({ ...p, recipientId: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 bg-white text-sm">
              <option value="">اختر المستلم</option>
              {users.data?.map((recipient) => (
                <option key={recipient.id} value={recipient.id}>
                  {recipient.name ?? "بدون اسم"} · {roleLabels[recipient.role] ?? recipient.role} · ID {recipient.id}
                </option>
              ))}
            </select>
            <Input placeholder="عنوان الرسالة" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} />
            <Textarea placeholder="اكتب رسالتك..." value={form.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))} className="min-h-36" />
            <Button disabled={send.isPending || !form.recipientId || !form.subject || !form.body}
              onClick={() => send.mutate({ recipientId: Number(form.recipientId), subject: form.subject, body: form.body })}>
              {send.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Send className="w-4 h-4 ml-2" />} إرسال الرسالة
            </Button>
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">صندوق الرسائل</h2>
          {messages.isLoading ? <p className="text-gray-400">جاري التحميل...</p> : messages.data?.length ? (
            <div className="space-y-3">{messages.data.map((message) => {
              const incoming = message.recipientId === user.id;
              return <div key={message.id} className={`rounded-lg p-4 border ${incoming ? "bg-blue-50 border-blue-100" : "bg-gray-50"}`}>
                <div className="flex justify-between gap-3 text-xs text-gray-500"><span>{incoming ? `من المستخدم #${message.senderId}` : `إلى المستخدم #${message.recipientId}`}</span><span>{new Date(message.createdAt).toLocaleString("ar-SA")}</span></div>
                <p className="font-semibold text-gray-800 mt-2">{message.subject}</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">{message.body}</p>
              </div>;
            })}</div>
          ) : <p className="text-gray-500 text-center py-8">لا توجد رسائل بعد</p>}
        </Card>
      </main>
    </div>
  );
}