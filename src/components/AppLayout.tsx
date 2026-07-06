import {
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { RoleBadge } from "./RoleBadge";
import { roleNavigation } from "../data/lcmsSpec";

export function AppLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { appUser, logout } = useAuth();
  const navigate = useNavigate();

  const visibleGroups = appUser ? roleNavigation[appUser.role] : [];

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-ink">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              className="btn-secondary size-10 p-0 lg:hidden"
              type="button"
              onClick={() => setMobileOpen((value) => !value)}
              aria-label="فتح القائمة"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="grid size-10 place-items-center rounded-lg bg-learning-blue text-white">
              <ShieldCheck size={22} aria-hidden="true" />
            </div>
            <div>
              <p className="text-base font-black tracking-normal text-slate-950">
                LCMS
              </p>
              <p className="text-xs text-slate-500">إدارة المحتوى التعليمي</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {appUser ? (
              <div className="hidden text-left sm:block">
                <p className="text-sm font-black text-slate-950">
                  {appUser.displayName}
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  @{appUser.username || appUser.email}
                </p>
              </div>
            ) : null}
            {appUser ? <RoleBadge role={appUser.role} /> : null}
            <button
              className="btn-secondary size-10 p-0"
              type="button"
              onClick={handleLogout}
              aria-label="تسجيل الخروج"
              title="تسجيل الخروج"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
        <aside
          className={`${mobileOpen ? "block" : "hidden"} lg:block`}
          aria-label="القائمة الرئيسية"
        >
          <nav className="surface max-h-[calc(100vh-6.5rem)] space-y-4 overflow-y-auto p-3">
            {visibleGroups.map((group) => (
              <div key={group.title}>
                <p className="px-2 pb-2 text-xs font-black text-slate-400">
                  {group.title}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        [
                          "flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition",
                          isActive
                            ? "bg-blue-50 text-learning-blue"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                        ].join(" ")
                      }
                    >
                      <LayoutDashboard size={16} aria-hidden="true" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
