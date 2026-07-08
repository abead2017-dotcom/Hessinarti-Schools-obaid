import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, BookOpen, Download, Plus, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

export default function Books() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const canUpload = user?.role === "admin" || user?.role === "teacher";

  const { data: books, isLoading, refetch } = trpc.books.getBooks.useQuery();
  const uploadBook = trpc.books.uploadBook.useMutation({
    onSuccess: () => { refetch(); toast.success("تم رفع الكتاب"); resetForm(); },
  });
  const [form, setForm] = useState({ title: "", subject: "", grade: "", fileUrl: "", fileKey: "", description: "" });
  const resetForm = () => setForm({ title: "", subject: "", grade: "", fileUrl: "", fileKey: "", description: "" });

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const backHref = user?.role === "admin" ? "/dashboard/admin" : user?.role === "teacher" ? "/dashboard/teacher" : "/dashboard/student";

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href={backHref}><Button variant="ghost" size="sm"><ArrowRight className="w-4 h-4" /></Button></Link>
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-gray-800">مكتبة الكتب</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {canUpload && (
          <Card className="p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-800 mb-4">رفع كتاب جديد</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <Input placeholder="عنوان الكتاب" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
              <Input placeholder="المادة" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} />
              <Input placeholder="الصف الدراسي" value={form.grade} onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))} />
              <Input placeholder="رابط الملف (URL)" value={form.fileUrl} onChange={(e) => setForm((p) => ({ ...p, fileUrl: e.target.value }))} />
              <Input placeholder="مفتاح الملف (File Key)" value={form.fileKey} onChange={(e) => setForm((p) => ({ ...p, fileKey: e.target.value }))} />
              <Input placeholder="وصف الكتاب (اختياري)" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <Button disabled={uploadBook.isPending || !form.title || !form.subject || !form.grade || !form.fileUrl || !form.fileKey}
              onClick={() => uploadBook.mutate(form)}>
              {uploadBook.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Plus className="w-4 h-4 ml-2" />}
              رفع الكتاب
            </Button>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading
            ? <p className="col-span-3 text-center text-gray-400 py-12">جاري التحميل...</p>
            : books && books.length > 0
            ? books.map((b: any) => (
                <Card key={b.id} className="p-5 hover:shadow-md transition">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="bg-primary/10 p-3 rounded-lg flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{b.title}</h3>
                      <p className="text-sm text-gray-500">{b.subject} — {b.grade}</p>
                    </div>
                  </div>
                  {b.description && <p className="text-sm text-gray-600 mb-3">{b.description}</p>}
                  <a href={b.fileUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="w-full">
                      <Download className="w-4 h-4 ml-2" /> تحميل
                    </Button>
                  </a>
                </Card>
              ))
            : <p className="col-span-3 text-center text-gray-500 py-12">لا توجد كتب متاحة</p>}
        </div>
      </main>
    </div>
  );
}
