import { GraduationCap } from "lucide-react";
import type { ReactNode } from "react";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="grid size-12 place-items-center rounded-lg bg-learning-blue text-white shadow-soft">
            <GraduationCap size={26} aria-hidden="true" />
          </div>
          <div>
            <p className="text-lg font-black text-slate-950">LCMS</p>
            <p className="text-xs text-slate-500">Learning Content Management</p>
          </div>
        </div>

        <div className="surface p-6 sm:p-7">
          <div className="mb-6">
            <h1 className="text-2xl font-black text-slate-950">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
          </div>

          {children}
        </div>
      </section>
    </main>
  );
}
