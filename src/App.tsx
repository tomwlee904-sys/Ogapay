import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { Layout } from "./components/layout/Layout";
import { useWalletStore } from "./store/useWalletStore";
import { HomePage } from "./pages/HomePage";
import { JobsPage } from "./pages/JobsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CreateJobPage } from "./pages/CreateJobPage";
import { ProfilePage } from "./pages/ProfilePage";
import { VaultPage } from "./pages/VaultPage";
import { DeveloperPage } from "./pages/DeveloperPage";
import { FAQPage } from "./pages/FAQPage";
import { LoginPage } from "./pages/LoginPage";
import { StorePage } from "./pages/StorePage";
import { TaskDetailPage } from "./pages/TaskDetailPage";
import { WithdrawPage } from "./pages/WithdrawPage";
import { NotFoundPage } from "./pages/NotFoundPage";

function Protected({ children }: { children: ReactNode }) {
  const connected = useWalletStore((state) => state.connected);
  return connected ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/jobs/:jobId" element={<TaskDetailPage />} />
        <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
        <Route path="/create" element={<Protected><CreateJobPage /></Protected>} />
        <Route path="/profile/:username" element={<ProfilePage />} />
        <Route path="/store/:username" element={<StorePage />} />
        <Route path="/vault" element={<VaultPage />} />
        <Route path="/developer" element={<DeveloperPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/withdraw" element={<Protected><WithdrawPage /></Protected>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
