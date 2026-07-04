import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardRouter } from "./pages/DashboardRouter";
import { Login } from "./pages/auth/Login";
import { Register } from "./pages/auth/Register";
import { ForgotPassword } from "./pages/auth/ForgotPassword";
import { UserManagement } from "./pages/admin/UserManagement";
import { DemoAccountsPage } from "./pages/admin/DemoAccountsPage";
import { Unauthorized } from "./pages/Unauthorized";
import { NotFound } from "./pages/NotFound";
import { SpecModulePage } from "./pages/SpecModulePage";
import { adminModules, studentModules, teacherModules } from "./data/lcmsSpec";
import { DataModulePage } from "./pages/DataModulePage";
import { getModuleConfig } from "./data/moduleConfigs";
import { ReportsPage } from "./pages/ReportsPage";
import { StudentLearningPage } from "./pages/student/StudentLearningPage";

function WithLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}

function AdminModule({ module }: { module: (typeof adminModules)[number] }) {
  const config = getModuleConfig(module.path);

  if (module.path === "/admin/reports") {
    return <ReportsPage role="admin" />;
  }

  return config ? <DataModulePage config={config} /> : <SpecModulePage module={module} />;
}

function TeacherModule({ module }: { module: (typeof teacherModules)[number] }) {
  const config = getModuleConfig(module.path);

  if (module.path === "/teacher/reports") {
    return <ReportsPage role="teacher" />;
  }

  return config ? <DataModulePage config={config} /> : <SpecModulePage module={module} />;
}

function StudentModule({ path }: { path: string }) {
  const view = path.replace("/student/", "");
  return <StudentLearningPage view={view} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={
            <WithLayout>
              <DashboardRouter />
            </WithLayout>
          }
        />
      </Route>

      <Route element={<ProtectedRoute roles={["admin"]} />}>
        <Route
          path="/admin/demo-accounts"
          element={
            <WithLayout>
              <DemoAccountsPage />
            </WithLayout>
          }
        />
        <Route
          path="/admin/users"
          element={
            <WithLayout>
              <UserManagement />
            </WithLayout>
          }
        />
        {adminModules.map((module) => (
          <Route
            key={module.path}
            path={module.path}
            element={
              <WithLayout>
                <AdminModule module={module} />
              </WithLayout>
            }
          />
        ))}
      </Route>

      <Route element={<ProtectedRoute roles={["teacher"]} />}>
        {teacherModules.map((module) => (
          <Route
            key={module.path}
            path={module.path}
            element={
              <WithLayout>
                <TeacherModule module={module} />
              </WithLayout>
            }
          />
        ))}
      </Route>

      <Route element={<ProtectedRoute roles={["student"]} />}>
        {studentModules.map((module) => (
          <Route
            key={module.path}
            path={module.path}
            element={
              <WithLayout>
                <StudentModule path={module.path} />
              </WithLayout>
            }
          />
        ))}
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
