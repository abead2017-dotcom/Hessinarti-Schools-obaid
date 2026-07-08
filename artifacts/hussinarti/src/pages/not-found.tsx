import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
      <div className="text-center p-8">
        <p className="text-8xl font-bold text-primary mb-4">404</p>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">الصفحة غير موجودة</h1>
        <p className="text-gray-500 mb-6">يبدو أن الصفحة التي تبحث عنها غير موجودة.</p>
        <Link href="/">
          <Button>
            <Home className="w-4 h-4 ml-2" /> العودة للرئيسية
          </Button>
        </Link>
      </div>
    </div>
  );
}
