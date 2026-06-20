import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface Application {
  id: number;
  discordId: string;
  discordUsername: string;
  answers: string;
  status: string;
  reviewedBy: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-900/40 text-yellow-300 border-yellow-700/40",
  approved: "bg-green-900/40 text-green-300 border-green-700/40",
  rejected: "bg-red-900/40 text-red-300 border-red-700/40",
};
const STATUS_LABELS: Record<string, string> = { pending: "⏳ Beklemede", approved: "✅ Onaylandı", rejected: "❌ Reddedildi" };

export default function ApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    api.get<{ applications: Application[] }>("/applications").then(d => setApps(d.applications)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-purple-400 text-center mt-20">🔮 Yükleniyor...</div>;

  const pending = apps.filter(a => a.status === "pending");
  const others = apps.filter(a => a.status !== "pending");

  return (
    <div>
      <h2 className="text-2xl font-bold text-amber-400 mb-6" style={{ fontFamily: "Georgia, serif" }}>📜 Başvurular</h2>

      {pending.length > 0 && (
        <div className="mb-2">
          <h3 className="text-yellow-400 text-sm font-semibold mb-3">⏳ Bekleyen ({pending.length})</h3>
          <div className="space-y-3 mb-6">
            {pending.map(a => <AppCard key={a.id} app={a} expanded={expanded} setExpanded={setExpanded} />)}
          </div>
        </div>
      )}

      <h3 className="text-purple-400 text-sm font-semibold mb-3">Tüm Başvurular ({apps.length})</h3>
      <div className="space-y-3">
        {others.map(a => <AppCard key={a.id} app={a} expanded={expanded} setExpanded={setExpanded} />)}
      </div>
      {apps.length === 0 && <p className="text-purple-600 text-center mt-10">Henüz başvuru yok</p>}
    </div>
  );
}

function AppCard({ app, expanded, setExpanded }: { app: Application; expanded: number | null; setExpanded: (n: number | null) => void }) {
  const isOpen = expanded === app.id;
  let answers: Record<string, string> = {};
  try { answers = JSON.parse(app.answers ?? "{}"); } catch {}

  return (
    <div className="bg-[#13111a] border border-purple-900/30 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(isOpen ? null : app.id)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-purple-900/10 transition-colors text-left"
      >
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-white font-medium">{app.discordUsername}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[app.status] ?? "text-purple-400"}`}>{STATUS_LABELS[app.status] ?? app.status}</span>
          </div>
          <div className="text-purple-500 text-xs mt-0.5 font-mono">{app.discordId} • {new Date(app.createdAt).toLocaleDateString("tr-TR")}</div>
        </div>
        <span className="text-purple-500">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 border-t border-purple-900/20 pt-4 space-y-3">
          {Object.entries(answers).map(([q, a]) => (
            <div key={q}>
              <p className="text-purple-400 text-xs mb-1 font-medium">{q}</p>
              <p className="text-white text-sm bg-[#1c1928] rounded-lg px-3 py-2">{a}</p>
            </div>
          ))}
          {app.reviewedBy && <p className="text-purple-600 text-xs mt-2">İnceleyen: {app.reviewedBy}</p>}
        </div>
      )}
    </div>
  );
}
