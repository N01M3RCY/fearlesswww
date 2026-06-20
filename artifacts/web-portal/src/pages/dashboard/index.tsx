import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import Layout from "../../components/Layout";
import StatsPage from "./stats";
import UsersPage from "./users";
import SalaryPage from "./salary";
import HouseCupPage from "./house-cup";
import ConfigPage from "./config";
import PanelUsersPage from "./panel-users";
import ApplicationsPage from "./applications";
import { api } from "../../lib/api";

type Tab = "stats" | "users" | "salary" | "house-cup" | "config" | "panel-users" | "applications";

interface AdminUser { username: string; role: string; displayName: string }

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [matchTab, paramsTab] = useRoute("/dashboard/:tab");
  const [matchRoot] = useRoute("/dashboard");
  const activeTab: Tab = (paramsTab?.tab as Tab) ?? "stats";

  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ user: AdminUser }>("/me")
      .then(d => setUser(d.user))
      .catch(() => setLocation("/"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-purple-400 text-lg">🔮 Yükleniyor...</div>
      </div>
    );
  }

  if (!user) return null;

  const ROLE_LEVELS: Record<string, number> = { admin: 100, mod: 50, professor: 30, guide: 20 };
  const userLevel = ROLE_LEVELS[user.role] ?? 0;

  function renderPage() {
    switch (activeTab) {
      case "stats": return <StatsPage />;
      case "users": return <UsersPage userRole={user!.role} />;
      case "salary": return userLevel >= 100 ? <SalaryPage /> : <Denied />;
      case "house-cup": return <HouseCupPage userRole={user!.role} />;
      case "config": return userLevel >= 100 ? <ConfigPage /> : <Denied />;
      case "panel-users": return userLevel >= 100 ? <PanelUsersPage /> : <Denied />;
      case "applications": return userLevel >= 50 ? <ApplicationsPage /> : <Denied />;
      default: return <StatsPage />;
    }
  }

  return (
    <Layout activeTab={activeTab} userRole={user.role} userName={user.displayName}>
      {renderPage()}
    </Layout>
  );
}

function Denied() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="text-5xl mb-3">🚫</div>
        <p className="text-purple-400">Bu sayfaya erişim yetkin yok.</p>
      </div>
    </div>
  );
}
