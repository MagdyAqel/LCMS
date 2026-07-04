import { GraduationCap } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-soft">
        <div className="grid size-10 place-items-center rounded-lg bg-blue-50 text-learning-blue">
          <GraduationCap size={22} aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">جاري التحميل</p>
          <p className="text-xs text-slate-500">نجهز مساحة التعلم الخاصة بك</p>
        </div>
      </div>
    </div>
  );
}
