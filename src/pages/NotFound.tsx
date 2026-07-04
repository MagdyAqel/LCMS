import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="surface w-full max-w-lg p-7 text-center">
        <p className="text-sm font-bold text-learning-blue">404</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">
          الصفحة غير موجودة
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          الرابط الذي طلبته غير متاح داخل نظام LCMS.
        </p>
        <Link className="btn-primary mt-6" to="/dashboard">
          العودة للوحة التحكم
        </Link>
      </section>
    </main>
  );
}
