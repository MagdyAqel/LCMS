import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: string;
  helper: string;
  icon: ReactNode;
};

export function StatCard({ label, value, helper, icon }: StatCardProps) {
  return (
    <div className="surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
        </div>
        <div className="grid size-11 place-items-center rounded-lg bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-500">{helper}</p>
    </div>
  );
}
