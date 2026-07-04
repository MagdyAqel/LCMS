import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Unauthorized() {
  const { appUser, logout } = useAuth();

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="surface w-full max-w-lg p-7 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-lg bg-red-50 text-learning-red">
          <ShieldAlert size={28} aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-2xl font-black text-slate-950">
          لا تملك صلاحية الوصول
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {appUser?.disabled
            ? "تم إيقاف هذا الحساب. تواصل مع مدير النظام."
            : "هذا المسار يتطلب دوراً مختلفاً عن دور حسابك الحالي."}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link className="btn-primary" to="/dashboard">
            العودة للوحة التحكم
          </Link>
          <button className="btn-secondary" type="button" onClick={logout}>
            تسجيل الخروج
          </button>
        </div>
      </section>
    </main>
  );
}
