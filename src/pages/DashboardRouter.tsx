import { useAuth } from "../context/AuthContext";
import { AdminDashboard } from "./dashboards/AdminDashboard";
import { StudentDashboard } from "./dashboards/StudentDashboard";
import { TeacherDashboard } from "./dashboards/TeacherDashboard";

export function DashboardRouter() {
  const { appUser } = useAuth();

  if (appUser?.role === "admin") {
    return <AdminDashboard />;
  }

  if (appUser?.role === "teacher") {
    return <TeacherDashboard />;
  }

  return <StudentDashboard />;
}
