import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, Plus, GraduationCap, Loader2, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

export default function Results() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const isAdmin = user?.role === "admin";
  const isStudent = user?.role === "student";

  const studentResults = trpc.results.getMyResults.useQuery(undefined, { enabled: isStudent });
  const allResults = trpc.results.getAllResults.useQuery(undefined, { enabled: isAdmin });
  const addResult = trpc.results.addResult.useMutation({ onSuccess: () => { allResults.refetch(); toast.success("تم رفع النتيجة"); resetForm(); } });
  const deleteResult = trpc.results.deleteResult.useMutation({ onSuccess: () => { allResults.refetch(); toast.success("تم حذف النتيجة"); } });

  const [form, setForm] = useState({ studentId: "", subject: "", grade: "", score: "", semester: "", academicYear: "" });
  const resetForm = () => setForm({ studentId: "", subject: "", grade: "", score: "", semester: "", academicYear: "" });
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const results = isAdmin ? allResults.data : studentResults.data;
  const isLoading = isAdmin ? allResults.isLoading : studentResults.isLoading;

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href={isAdmin ? "/dashboard/admin" : "/dashboard/student"}>
            <Button variant="ghost" size="sm"><ArrowRight className="w-4 h-4" /></Button>
          </Link>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-gray-800">النتائج الدراسية</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isAdmin && (
          <Card className="p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-800 mb-4">رفع نتيجة جديدة</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {([
                ["studentId", "رقم الطالب", "number"],
                ["subject", "المادة", "text"],
                ["grade", "الدرجة (حرفية)", "text"],
                ["score", "النسبة (%)", "number"],
                ["semester", "الفصل الدراسي", "text"],
                ["academicYear", "العام الدراسي", "text"],
              ] as const).map(([key, label, type]) => (
                <Input key={key} type={type} placeholder={label} value={(form as any)[key]}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} />
              ))}
            </div>
            <Button disabled={addResult.isPending} onClick={() => addResult.mutate({
              studentId: parseInt(form.studentId),
              subject: form.subject,
              grade: form.grade,
              score: form.score ? parseInt(form.score) : undefined,
              semester: form.semester,
              academicYear: form.academicYear,
            })}>
              {addResult.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Plus className="w-4 h-4 ml-2" />}
              رفع النتيجة
            </Button>
          </Card>
        )}

        <Card className="p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">{isAdmin ? "جميع النتائج" : "نتائجي"}</h2>
          {isLoading ? <p className="text-gray-400 text-center py-8">جاري التحميل...</p>
            : results && results.length > 0
            ? <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-gray-500">
                      {isAdmin && <th className="text-right py-2 px-3">رقم الطالب</th>}
                      <th className="text-right py-2 px-3">المادة</th>
                      <th className="text-right py-2 px-3">الدرجة</th>
                      <th className="text-right py-2 px-3">النسبة</th>
                      <th className="text-right py-2 px-3">الفصل</th>
                      <th className="text-right py-2 px-3">العام</th>
                      {isAdmin && <th className="py-2 px-3"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r: any) => (
                      <tr key={r.id} className="border-b hover:bg-gray-50">
                        {isAdmin && <td className="py-3 px-3 text-gray-600">#{r.studentId}</td>}
                        <td className="py-3 px-3 font-semibold text-gray-800">{r.subject}</td>
                        <td className="py-3 px-3 text-gray-600">{r.grade}</td>
                        <td className="py-3 px-3">
                          {r.score != null && (
                            <span className={`font-bold ${r.score >= 60 ? "text-green-600" : "text-red-500"}`}>{r.score}%</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-gray-600">{r.semester}</td>
                        <td className="py-3 px-3 text-gray-600">{r.academicYear}</td>
                        {isAdmin && (
                          <td className="py-3 px-3">
                            {confirmDelete === r.id ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => { deleteResult.mutate({ id: r.id }); setConfirmDelete(null); }}
                                  className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">تأكيد</button>
                                <button onClick={() => setConfirmDelete(null)}
                                  className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300">إلغاء</button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmDelete(r.id)}
                                className="text-gray-400 hover:text-red-500 transition p-1 rounded">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            : <p className="text-gray-500 text-center py-8">لا توجد نتائج</p>}
        </Card>
      </main>
    </div>
  );
}
