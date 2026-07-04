import { BookOpen, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { StatCard } from "../../components/StatCard";
import { useAuth } from "../../context/AuthContext";

export function AdminDashboard() {
  const { appUser } = useAuth();

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-bold text-learning-blue">Admin</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">
          أهلاً، {appUser?.displayName}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          تستطيع إدارة المستخدمين، مراجعة المساقات، وضبط الصلاحيات الأساسية
          للنظام.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="المستخدمون"
          value="Roles"
          helper="إسناد Admin وTeacher وStudent"
          icon={<Users size={21} aria-hidden="true" />}
        />
        <StatCard
          label="المساقات"
          value="Courses"
          helper="إدارة المحتوى والمنشورات التعليمية"
          icon={<BookOpen size={21} aria-hidden="true" />}
        />
        <StatCard
          label="الصلاحيات"
          value="Rules"
          helper="حماية Firestore حسب الدور"
          icon={<ShieldCheck size={21} aria-hidden="true" />}
        />
      </section>

      <section className="surface p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">
              إدارة المستخدمين
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              غيّر دور المستخدم أو أوقف وصوله من مكان واحد.
            </p>
          </div>
          <Link className="btn-primary" to="/admin/users">
            <Users size={18} aria-hidden="true" />
            فتح المستخدمين
          </Link>
        </div>
      </section>
    </div>
  );
}
