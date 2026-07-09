import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, BookOpen, Download, Plus, Loader2, Trash2, FileUp, X } from "lucide-react";
import { Link } from "wouter";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { useUpload } from "@workspace/object-storage-web";

/** رفع PDF وإرجاع objectPath */
function PdfUploadButton({
  onUploaded,
  disabled,
}: {
  onUploaded: (objectPath: string, fileName: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const base = (import.meta.env.BASE_URL as string).replace(/\/$/, "");

  const { uploadFile, isUploading, progress } = useUpload({
    basePath: base ? `${base}/api/storage` : "/api/storage",
    onSuccess: () => {},
    onError: (err) => toast.error(err.message),
  });

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("الرجاء اختيار ملف PDF فقط");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("حجم الملف يجب أن يكون أقل من 50 ميغابايت");
      return;
    }
    const result = await uploadFile(file);
    if (result) onUploaded(result.objectPath, file.name);
    // reset input
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleChange}
        disabled={isUploading || disabled}
      />
      <Button
        type="button"
        variant="outline"
        disabled={isUploading || disabled}
        onClick={() => inputRef.current?.click()}
        className="border-dashed border-2 border-primary/40 text-primary hover:bg-primary/5 w-full"
      >
        {isUploading ? (
          <><Loader2 className="w-4 h-4 animate-spin ml-2" /> جاري الرفع {progress}%</>
        ) : (
          <><FileUp className="w-4 h-4 ml-2" /> اختر ملف PDF من جهازك</>
        )}
      </Button>
    </div>
  );
}

export default function Books() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const canUpload = user?.role === "admin" || user?.role === "teacher";
  const isAdmin = user?.role === "admin";

  const { data: books, isLoading, refetch } = trpc.books.getBooks.useQuery();
  const uploadBook = trpc.books.uploadBook.useMutation({
    onSuccess: () => { refetch(); toast.success("تم إضافة الكتاب"); resetForm(); },
  });
  const deleteBook = trpc.books.deleteBook.useMutation({
    onSuccess: () => { refetch(); toast.success("تم حذف الكتاب"); setConfirmDelete(null); },
  });

  const [form, setForm] = useState({
    title: "", subject: "", grade: "", fileUrl: "", fileKey: "", description: "",
  });
  const [uploadMode, setUploadMode] = useState<"url" | "file">("file");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const resetForm = () => {
    setForm({ title: "", subject: "", grade: "", fileUrl: "", fileKey: "", description: "" });
    setUploadedFileName(null);
    setUploadMode("file");
  };

  const handlePdfUploaded = (objectPath: string, fileName: string) => {
    const base = (import.meta.env.BASE_URL as string).replace(/\/$/, "");
    const servingUrl = `${base}/api/storage${objectPath}`;
    setForm((p) => ({ ...p, fileUrl: servingUrl, fileKey: objectPath }));
    setUploadedFileName(fileName);
    toast.success("تم رفع الملف بنجاح ✅");
  };

  const canSubmit =
    form.title && form.subject && form.grade && form.fileUrl && form.fileKey;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const backHref = user?.role === "admin" ? "/dashboard/admin"
    : user?.role === "teacher" ? "/dashboard/teacher"
    : "/dashboard/student";

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
            <h2 className="text-lg font-bold text-gray-800 mb-4">إضافة كتاب جديد</h2>

            {/* معلومات الكتاب */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <Input placeholder="عنوان الكتاب *" value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
              <Input placeholder="المادة *" value={form.subject}
                onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} />
              <Input placeholder="الصف الدراسي *" value={form.grade}
                onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))} />
              <Input placeholder="وصف الكتاب (اختياري)" value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>

            {/* اختيار طريقة الرفع */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { setUploadMode("file"); setForm((p) => ({ ...p, fileUrl: "", fileKey: "" })); setUploadedFileName(null); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${uploadMode === "file" ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                📁 رفع من الجهاز
              </button>
              <button
                onClick={() => { setUploadMode("url"); setForm((p) => ({ ...p, fileUrl: "", fileKey: "" })); setUploadedFileName(null); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${uploadMode === "url" ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                🔗 رابط خارجي
              </button>
            </div>

            {/* منطقة الرفع */}
            {uploadMode === "file" ? (
              <div className="mb-4">
                {uploadedFileName ? (
                  <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <BookOpen className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-800 truncate">{uploadedFileName}</p>
                      <p className="text-xs text-green-600">تم الرفع بنجاح</p>
                    </div>
                    <button onClick={() => { setUploadedFileName(null); setForm((p) => ({ ...p, fileUrl: "", fileKey: "" })); }}
                      className="text-green-400 hover:text-green-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <PdfUploadButton onUploaded={handlePdfUploaded} />
                )}
                <p className="text-xs text-gray-400 mt-2">الحد الأقصى للحجم: 50 ميغابايت • PDF فقط</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <Input placeholder="رابط الملف (URL) *" value={form.fileUrl}
                  onChange={(e) => setForm((p) => ({ ...p, fileUrl: e.target.value }))} />
                <Input placeholder="مفتاح الملف (File Key) *" value={form.fileKey}
                  onChange={(e) => setForm((p) => ({ ...p, fileKey: e.target.value }))} />
              </div>
            )}

            <Button
              disabled={uploadBook.isPending || !canSubmit}
              onClick={() => uploadBook.mutate(form)}
            >
              {uploadBook.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin ml-2" /> جاري الحفظ...</>
                : <><Plus className="w-4 h-4 ml-2" /> إضافة الكتاب</>}
            </Button>
          </Card>
        )}

        {/* قائمة الكتب */}
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
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-800 truncate">{b.title}</h3>
                      <p className="text-sm text-gray-500">{b.subject} — {b.grade}</p>
                    </div>
                    {(isAdmin || b.uploadedBy === user?.id) && (
                      <button
                        onClick={() => setConfirmDelete(confirmDelete === b.id ? null : b.id)}
                        className="text-gray-300 hover:text-red-500 transition flex-shrink-0 p-1 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {b.description && (
                    <p className="text-sm text-gray-600 mb-3">{b.description}</p>
                  )}

                  {confirmDelete === b.id ? (
                    <div className="flex gap-2">
                      <button onClick={() => deleteBook.mutate({ id: b.id })}
                        disabled={deleteBook.isPending}
                        className="flex-1 text-sm bg-red-500 text-white py-1.5 rounded-md hover:bg-red-600 disabled:opacity-50">
                        {deleteBook.isPending ? "جاري الحذف..." : "تأكيد الحذف"}
                      </button>
                      <button onClick={() => setConfirmDelete(null)}
                        className="flex-1 text-sm bg-gray-100 text-gray-700 py-1.5 rounded-md hover:bg-gray-200">
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <a href={b.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="w-full">
                        <Download className="w-4 h-4 ml-2" /> تحميل الكتاب
                      </Button>
                    </a>
                  )}
                </Card>
              ))
            : <p className="col-span-3 text-center text-gray-500 py-12">لا توجد كتب متاحة</p>}
        </div>
      </main>
    </div>
  );
}
