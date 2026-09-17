import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, ClipboardCheck, Loader2, Save } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Section = "primary" | "middle";
type Status = "present" | "absent" | "late" | "excused";
const statusLabels: Record<Status, string> = { present: "حاضر", absent: "غائب", late: "متأخر", excused: "بعذر" };

export default function Attendance() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const isStudent = user?.role === "student";
  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const [section, setSection] = useState<Section>(user?.schoolSection ?? "primary");
  const [classLevel, setClassLevel] = useState(user?.classLevel ?? 1);
  const [subject, setSubject] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 16));
  const [statuses, setStatuses] = useState<Record<number, Status>>({});

  const students = trpc.attendance.getStudents.useQuery({ schoolSection: section, classLevel }, { enabled: isTeacher });
  const sessions = trpc.attendance.getTeacherSessions.useQuery(undefined, { enabled: isTeacher });
  const mine = trpc.attendance.getMyAttendance.useQuery(undefined, { enabled: isStudent });
  const record = trpc.attendance.record.useMutation({
    onSuccess: () => {
      sessions.refetch();
      toast.success("تم حفظ الحضور");
    },
  });

  useEffect(() => {
    if (!students.data) return;
    setStatuses((current) => Object.fromEntries(students.data.map((student) => [student.id, current[student.id] ?? "present"])));
  }, [students.data]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const backPath = isStudent ? "/dashboard/student" : user.role === "admin" ? "/dashboard/admin" : "/dashboard/teacher";
  const presentCount = mine.data?.filter((item) => item.status === "present").length ?? 0;
  const absentCount = mine.data?.filter((item) => item.status === "absent").length ?? 0;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href={backPath}><Button variant="ghost" size="sm"><ArrowRight className="w-4 h-4" /></Button></Link>
          <ClipboardCheck className="w-6 h-6 text-primary" />
          <div><h1 className="text-xl font-bold text-gray-800">الحضور والغياب</h1><p className="text-xs text-gray-500">{isStudent ? "سجل حضورك الدراسي" : "تسجيل حضور الطلاب"}</p></div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {isStudent ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-5 text-center"><p className="text-sm text-gray-500">أيام الحضور</p><p className="text-3xl font-bold text-green-600">{presentCount}</p></Card>
              <Card className="p-5 text-center"><p className="text-sm text-gray-500">أيام الغياب</p><p className="text-3xl font-bold text-red-500">{absentCount}</p></Card>
            </div>
            <Card className="p-6">
              <h2 className="font-bold text-gray-800 mb-4">سجل الحضور</h2>
              {mine.isLoading ? <p className="text-gray-400">جاري التحميل...</p> : mine.data?.length ? (
                <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-gray-500"><th className="text-right py-2">التاريخ</th><th className="text-right py-2">المادة</th><th className="text-right py-2">الحالة</th><th className="text-right py-2">ملاحظة</th></tr></thead>
                  <tbody>{mine.data.map((item) => <tr key={item.id} className="border-b"><td className="py-3">{new Date(item.attendanceDate).toLocaleDateString("ar-SA")}</td><td>{item.subject}</td><td className={item.status === "present" ? "text-green-600" : item.status === "absent" ? "text-red-600" : "text-amber-600"}>{statusLabels[item.status]}</td><td>{item.note ?? "—"}</td></tr>)}</tbody>
                </table></div>
              ) : <p className="text-gray-500 text-center py-8">لا يوجد سجل حضور بعد</p>}
            </Card>
          </>
        ) : (
          <>
            <Card className="p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">تسجيل حصة جديدة</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <select value={section} onChange={(e) => { setSection(e.target.value as Section); setClassLevel(1); }} className="border rounded-md px-3 py-2 bg-white text-sm"><option value="primary">الأساسي</option><option value="middle">المتوسط</option></select>
                <select value={classLevel} onChange={(e) => setClassLevel(Number(e.target.value))} className="border rounded-md px-3 py-2 bg-white text-sm">{Array.from({ length: section === "primary" ? 6 : 3 }, (_, i) => <option key={i + 1} value={i + 1}>الصف {i + 1}</option>)}</select>
                <Input placeholder="المادة" value={subject} onChange={(e) => setSubject(e.target.value)} />
                <Input type="datetime-local" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
              </div>
              <div className="mt-5 space-y-2">
                {students.isLoading ? <p className="text-gray-400">جاري تحميل طلاب الصف...</p> : students.data?.length ? students.data.map((student) => (
                  <div key={student.id} className="flex flex-wrap items-center justify-between gap-2 border rounded-lg p-3">
                    <span className="font-medium text-gray-800">{student.name ?? "بدون اسم"} <span className="text-xs text-gray-400">#{student.studentNumber ?? student.id}</span></span>
                    <select value={statuses[student.id] ?? "present"} onChange={(e) => setStatuses((p) => ({ ...p, [student.id]: e.target.value as Status }))} className="border rounded-md px-3 py-1.5 bg-white text-sm">
                      {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>
                )) : <p className="text-gray-500 text-center py-5">لا يوجد طلاب في هذا الصف</p>}
              </div>
              <Button className="mt-5" disabled={record.isPending || !subject || !students.data?.length} onClick={() => record.mutate({
                schoolSection: section, classLevel, subject, attendanceDate: new Date(attendanceDate),
                records: (students.data ?? []).map((student) => ({ studentId: student.id, status: statuses[student.id] ?? "present" })),
              })}>
                {record.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />} حفظ الحضور
              </Button>
            </Card>
            <Card className="p-6">
              <h2 className="font-bold text-gray-800 mb-4">السجلات السابقة</h2>
              {sessions.data?.length ? <div className="space-y-2">{sessions.data.map((item) => <div key={item.id} className="flex justify-between border-b py-3 text-sm"><span>{item.subject} · الصف {item.classLevel}</span><span className="text-gray-500">{new Date(item.attendanceDate).toLocaleDateString("ar-SA")}</span></div>)}</div> : <p className="text-gray-500">لا توجد سجلات بعد</p>}
            </Card>
          </>
        )}
      </main>
    </div>
  );
}