import {
  CheckCircle2,
  ClipboardList,
  Database,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { SpecModule } from "../data/lcmsSpec";

type SpecModulePageProps = {
  module: SpecModule;
};

export function SpecModulePage({ module }: SpecModulePageProps) {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold text-learning-blue">{module.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            {module.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            {module.description}
          </p>
        </div>

        {module.collection ? (
          <div className="surface flex items-center gap-3 px-4 py-3">
            <Database size={18} className="text-learning-blue" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold text-slate-500">Firestore</p>
              <p className="text-sm font-black text-slate-950">
                {module.collection}
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardList size={20} className="text-learning-blue" />
            <h2 className="text-lg font-black text-slate-950">
              الحقول المطلوبة
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {module.fields.map((field) => (
              <div
                key={field}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700"
              >
                {field}
              </div>
            ))}
          </div>
        </div>

        <div className="surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 size={20} className="text-learning-green" />
            <h2 className="text-lg font-black text-slate-950">
              العمليات الأساسية
            </h2>
          </div>
          <div className="space-y-3">
            {module.actions.map((action) => (
              <div key={action} className="flex items-center gap-2 text-sm">
                <span className="size-2 rounded-full bg-learning-green" />
                <span className="font-semibold text-slate-700">{action}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {module.notes?.length ? (
        <section className="surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <FileText size={20} className="text-learning-gold" />
            <h2 className="text-lg font-black text-slate-950">أمثلة من المواصفات</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {module.notes.map((note) => (
              <span
                key={note}
                className="rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 ring-1 ring-amber-200"
              >
                {note}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="surface p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-blue-50 text-learning-blue">
              <ShieldCheck size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-950">
                حالة التنفيذ الحالية
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                هذه الصفحة مضافة كجزء من هيكل المواصفات. طبقة المصادقة والصلاحيات
                جاهزة، والخطوة التالية لكل وحدة هي ربط نماذج الإدخال والجداول
                بالقراءات والكتابات الفعلية في Firestore.
              </p>
            </div>
          </div>
          <Link className="btn-secondary" to="/dashboard">
            العودة للوحة التحكم
          </Link>
        </div>
      </section>
    </div>
  );
}
