import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface Stats {
  totalUsers: number;
  azkabanCount: number;
  wantedCount: number;
  byHouse: Record<string, number>;
  houseCup: { house: string; points: number }[];
  recentTransactions: { id: number; fromDiscordId: string; toDiscordId: string; amount: number; type: string; description: string; createdAt: string }[];
  unpaidFines: number;
  totalGalleons: number;
}

const HOUSE_COLORS: Record<string, string> = {
  Gryffindor: "#ae0001",
  Slytherin: "#1a472a",
  Ravenclaw: "#0e1a40",
  Hufflepuff: "#ecb939",
};
const HOUSE_ICONS: Record<string, string> = { Gryffindor: "🦁", Slytherin: "🐍", Ravenclaw: "🦅", Hufflepuff: "🦡" };

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ stats?: Stats } & Stats>("/stats")
      .then(d => setStats(d as any))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-purple-400 text-center mt-20">🔮 Yükleniyor...</div>;
  if (!stats) return null;

  return (
    <div>
      <h2 className="text-2xl font-bold text-amber-400 mb-6" style={{ fontFamily: "Georgia, serif" }}>📊 Genel Bakış</h2>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Toplam Karakter", value: stats.totalUsers, icon: "🧙", color: "purple" },
          { label: "Toplam Galleon", value: `${stats.totalGalleons}G`, icon: "🪙", color: "amber" },
          { label: "Azkaban'da", value: stats.azkabanCount, icon: "⛓️", color: "red" },
          { label: "Ödenmemiş Ceza", value: stats.unpaidFines, icon: "📋", color: "orange" },
        ].map(kpi => (
          <div key={kpi.label} className="bg-[#13111a] border border-purple-900/30 rounded-2xl p-5">
            <div className="text-3xl mb-2">{kpi.icon}</div>
            <div className="text-2xl font-bold text-white">{kpi.value}</div>
            <div className="text-purple-400 text-sm mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Bina Kupası */}
        <div className="bg-[#13111a] border border-purple-900/30 rounded-2xl p-6">
          <h3 className="text-amber-400 font-semibold mb-4">🏆 Bina Kupası</h3>
          <div className="space-y-3">
            {(stats.houseCup ?? []).sort((a, b) => b.points - a.points).map((h, i) => (
              <div key={h.house} className="flex items-center gap-3">
                <span className="text-xl w-8">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "4️⃣"}</span>
                <span className="text-lg">{HOUSE_ICONS[h.house] ?? "🏠"}</span>
                <span className="text-white font-medium flex-1">{h.house}</span>
                <span className="text-amber-400 font-bold">{h.points} P</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bina dağılımı */}
        <div className="bg-[#13111a] border border-purple-900/30 rounded-2xl p-6">
          <h3 className="text-amber-400 font-semibold mb-4">🏠 Karakter Dağılımı</h3>
          <div className="space-y-2">
            {Object.entries(stats.byHouse).map(([house, count]) => (
              <div key={house} className="flex items-center gap-3">
                <span className="text-base w-6">{HOUSE_ICONS[house] ?? "🏠"}</span>
                <span className="text-purple-300 text-sm flex-1">{house}</span>
                <div className="flex-1 max-w-24 bg-purple-900/20 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${Math.min(100, (count / stats.totalUsers) * 100)}%`, backgroundColor: HOUSE_COLORS[house] ?? "#6b21a8" }}
                  />
                </div>
                <span className="text-white text-sm font-mono w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Son İşlemler */}
      <div className="bg-[#13111a] border border-purple-900/30 rounded-2xl p-6">
        <h3 className="text-amber-400 font-semibold mb-4">💸 Son İşlemler</h3>
        <div className="space-y-2">
          {(stats.recentTransactions ?? []).map(tx => (
            <div key={tx.id} className="flex items-center gap-3 text-sm py-2 border-b border-purple-900/20 last:border-0">
              <span className="text-purple-400 font-mono text-xs">{tx.type}</span>
              <span className="text-purple-300 flex-1 truncate">{tx.description}</span>
              <span className="text-amber-400 font-bold">{tx.amount}G</span>
              <span className="text-purple-600 text-xs">{new Date(tx.createdAt).toLocaleDateString("tr-TR")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
