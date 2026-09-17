import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, BookOpen, CheckCircle2, Clock3, Loader2, Plus, Send, Users } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

const sectionLabels = { primary: "الأساسي", middle: "المتوسط" } as const;

export default function Assignments() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const isStudent = user?.role === "student";
  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [answer, setAnswer] = useState("");
  const [scores, setScores] = useState<Record<number, string>>({});
  const [form, setForm] = useState({
    title: "", subject: "", description: "", schoolSection: "primary" as "primary" | "middle",
    classLevel: 1, dueDate: "",
  });

  const assignments = trpc.assignments.getMine.useQuery(undefined, { enabled: Boolean(user) });
  const mySubmissions = trpc.assignments.getMySubmissions.useQuery(undefined, { enabled: isStudent });
  const submissions = trpc.assignments.getSubmissions.useQuery(
    { assignmentId: selectedId ?? 0 },
    { enabled: isTeacher && selectedId !== null },
  );
  const create = trpc.assignments.create.useMutation({
    onSuccess: () => {
      assignments.refetch();
      toast.success("تم نشر الواجب");
      setForm({ title: "", subject: "", description: "", schoolSection: "primary", classLevel: 1, dueDate: "" });
    },
  });
  const submit = trpc.assignments.submit.useMutation({
    onSuccess: () => {
      mySubmissions.refetch();
      toast.success("تم تسليم الواجب");
      setAnswer("");
    },
  });
  const grade = trpc.assignments.grade.useMutation({
    onSuccess: () => {
      submissions.refetch();
      toast.success("تم حفظ التصحيح");
    },
  });

  const selected = assignments.data?.find((item) => item.id === selectedId);
  const submissionByAssignment = new Map((mySubmissions.data ?? []).map((item) => [item.assignmentId, item]));

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href={isTeacher ? (user.role === "admin" ? "/dashboard/admin" : "/dashboard/teacher") : "/dashboard/student"}>
            <Button variant="ghost" size="sm"><ArrowRight className="w-4 h-4" /></Button>
          </Link>
          <BookOpen className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-gray-800">الواجبات</h1>
            <p className="text-xs text-gray-500">{isTeacher ? "إنشاء الواجبات ومتابعة التسليمات" : "واجبات صفك وتسليم إجاباتك"}</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {isTeacher && (
          <Card className="p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">نشر واجب جديد</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Input placeholder="عنوان الواجب" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
              <Input placeholder="المادة" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} />
              <Input type="datetime-local" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} />
              <select value={form.schoolSection} onChange={(e) => setForm((p) => ({ ...p, schoolSection: e.target.value as "primary" | "middle", classLevel: 1 }))}
                className="border rounded-md px-3 py-2 text-sm bg-white">
                <option value="primary">الأساسي</option>
                <option value="middle">المتوسط</option>
              </select>
              <select value={form.classLevel} onChange={(e) => setForm((p) => ({ ...p, classLevel: Number(e.target.value) }))}
                className="border rounded-md px-3 py-2 text-sm bg-white">
                {Array.from({ length: form.schoolSection === "primary" ? 6 : 3 }, (_, index) => (
                  <option key={index + 1} value={index + 1}>الصف {index + 1}</option>
                ))}
              </select>
              <Textarea className="sm:col-span-2 lg:col-span-3" placeholder="تعليمات الواجب (اختياري)" value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <Button className="mt-4" disabled={create.isPending || !form.title || !form.subject}
              onClick={() => create.mutate({
                title: form.title,
                subject: form.subject,
                description: form.description || undefined,
                schoolSection: form.schoolSection,
                classLevel: form.classLevel,
                dueDate: form.dueDate ? new Date(form.dueDate) : undefined,
              })}>
              {create.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Plus className="w-4 h-4 ml-2" />}
              نشر الواجب
            </Button>
          </Card>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-3">
            {assignments.isLoading ? <p className="text-gray-400 text-center py-8">جاري التحميل...</p>
              : assignments.data?.length ? assignments.data.map((assignment) => {
                const submission = submissionByAssignment.get(assignment.id);
                return (
                  <button key={assignment.id} onClick={() => {
                    setSelectedId(assignment.id);
                    setAnswer(submission?.content ?? "");
                  }} className={`w-full text-right bg-white rounded-xl border p-5 transition hover:shadow-md ${selectedId === assignment.id ? "border-primary shadow-sm" : "border-gray-100"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-bold text-gray-800">{assignment.title}</h2>
                        <p className="text-sm text-gray-500 mt-1">{assignment.subject} · {sectionLabels[assignment.schoolSection]} · الصف {assignment.classLevel}</p>
                      </div>
                      {isStudent && (submission ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Clock3 className="w-5 h-5 text-amber-500" />)}
                    </div>
                    {assignment.dueDate && <p className="text-xs text-gray-400 mt-3">موعد التسليم: {new Date(assignment.dueDate).toLocaleString("ar-SA")}</p>}
                  </button>
                );
              }) : <Card className="p-10 text-center text-gray-500">لا توجد واجبات حاليًا</Card>}
          </div>

          <Card className="p-6 min-h-[280px]">
            {!selected ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center">
                <BookOpen className="w-10 h-10 mb-3" />
                <p>اختر واجبًا لعرض التفاصيل</p>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-bold text-gray-800">{selected.title}</h2>
                <p className="text-sm text-gray-500 mt-1">{selected.subject} · الصف {selected.classLevel}</p>
                {selected.description && <p className="bg-gray-50 rounded-lg p-4 mt-5 text-gray-700 whitespace-pre-wrap">{selected.description}</p>}

                {isStudent ? (
                  <div className="mt-5 space-y-3">
                    <Textarea placeholder="اكتب إجابتك هنا..." value={answer} onChange={(e) => setAnswer(e.target.value)} className="min-h-36" />
                    <Button disabled={submit.isPending || !answer.trim()} onClick={() => submit.mutate({ assignmentId: selected.id, content: answer.trim() })}>
                      {submit.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Send className="w-4 h-4 ml-2" />}
                      تسليم الإجابة
                    </Button>
                  </div>
                ) : (
                  <div className="mt-5">
                    <div className="flex items-center gap-2 mb-3 text-gray-700"><Users className="w-4 h-4" /> التسليمات</div>
                    {submissions.isLoading ? <p className="text-gray-400">جاري التحميل...</p>
                      : submissions.data?.length ? submissions.data.map((item) => (
                        <div key={item.id} className="border rounded-lg p-3 mb-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-semibold">الطالب #{item.studentId}</span>
                            <span className="text-gray-400">{new Date(item.submittedAt).toLocaleString("ar-SA")}</span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded mt-2">{item.content}</p>
                          <div className="flex gap-2 mt-2">
                            <Input type="number" min="0" max="100" placeholder="الدرجة من 100" value={scores[item.id] ?? item.score ?? ""}
                              onChange={(e) => setScores((p) => ({ ...p, [item.id]: e.target.value }))} />
                            <Button size="sm" disabled={grade.isPending || scores[item.id] === undefined && item.score === null}
                              onClick={() => grade.mutate({ submissionId: item.id, score: Number(scores[item.id] ?? item.score), feedback: item.feedback ?? undefined })}>
                              حفظ
                            </Button>
                          </div>
                        </div>
                      )) : <p className="text-gray-500">لم يسلّم أحد هذا الواجب بعد</p>}
                  </div>
                )}
              </div>
            )}
          </Card>
        </section>
      </main>
    </div>
  );
}