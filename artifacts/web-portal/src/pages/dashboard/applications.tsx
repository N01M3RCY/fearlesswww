import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface Application {
  id: number;
  discordId: string;
  discordUsername: string;
  bloodStatus: string;
  gender: string;
  suggestedHouse: string;
  answers: string;
  status: string;
  reviewedBy: string | null;
  createdAt: string;
}

interface CharacterIntro {
  id: number;
  discordId: string;
  icName: string;
  icAge: number;
  icStory: string;
  status: string;
  reviewedBy: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-950/40 text-yellow-300 border-yellow-700/40",
  onaylandi: "bg-green-950/40 text-green-300 border-green-700/40",
  reddedildi: "bg-red-950/40 text-red-300 border-red-700/40",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "⏳ Beklemede",
  onaylandi: "✅ Onaylandı",
  reddedildi: "❌ Reddedildi",
};

export default function ApplicationsPage({ userRole = "guide" }: { userRole?: string }) {
  const [apps, setApps] = useState<Application[]>([]);
  const [intros, setIntros] = useState<CharacterIntro[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedApp, setExpandedApp] = useState<number | null>(null);
  const [expandedIntro, setExpandedIntro] = useState<number | null>(null);
  const [error, setError] = useState("");

  const isGuideOnly = userRole === "guide";

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const d = await api.get<{ applications: Application[]; intros?: CharacterIntro[] }>("/applications");
      setApps(d.applications ?? []);
      setIntros(d.intros ?? []);
    } catch (err: any) {
      setError(err.message ?? "Başvurular yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSortingAction(id: number, action: "approve" | "reject", house?: string) {
    try {
      if (action === "approve") {
        await api.post(`/applications/sorting/${id}/approve`, { house });
      } else {
        await api.post(`/applications/sorting/${id}/reject`, {});
      }
      loadData();
    } catch (err: any) {
      alert(err.message ?? "İşlem başarısız");
    }
  }

  async function handleIntroAction(id: number, action: "approve" | "reject") {
    try {
      if (action === "approve") {
        await api.post(`/applications/intro/${id}/approve`, {});
      } else {
        await api.post(`/applications/intro/${id}/reject`, {});
      }
      loadData();
    } catch (err: any) {
      alert(err.message ?? "İşlem başarısız");
    }
  }

  if (loading) return <div className="text-purple-400 text-center mt-20">🔮 Yükleniyor...</div>;

  const pendingApps = apps.filter(a => a.status === "pending");
  const processedApps = apps.filter(a => a.status !== "pending");

  const pendingIntros = intros.filter(a => a.status === "pending");
  const processedIntros = intros.filter(a => a.status !== "pending");

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-950/40 border border-red-700/50 rounded-xl p-4 text-red-300 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Seçmen Şapka Başvuruları */}
      <div>
        <h2 className="text-2xl font-bold text-amber-400 mb-6" style={{ fontFamily: "Georgia, serif" }}>🎩 Seçmen Şapkası Kayıt İstekleri</h2>
        
        {pendingApps.length > 0 && (
          <div className="mb-6">
            <h3 className="text-yellow-400 text-xs font-semibold mb-3 tracking-widest uppercase">⏳ Bekleyen İstekler ({pendingApps.length})</h3>
            <div className="space-y-4">
              {pendingApps.map(a => (
                <SortingCard
                  key={a.id}
                  app={a}
                  isOpen={expandedApp === a.id}
                  onToggle={() => setExpandedApp(expandedApp === a.id ? null : a.id)}
                  onApprove={(house) => handleSortingAction(a.id, "approve", house)}
                  onReject={() => handleSortingAction(a.id, "reject")}
                />
              ))}
            </div>
          </div>
        )}

        <h3 className="text-purple-400 text-xs font-semibold mb-3 tracking-widest uppercase">Geçmiş Kayıt Kararları ({processedApps.length})</h3>
        <div className="space-y-3">
          {processedApps.map(a => (
            <SortingCard
              key={a.id}
              app={a}
              isOpen={expandedApp === a.id}
              onToggle={() => setExpandedApp(expandedApp === a.id ? null : a.id)}
            />
          ))}
          {apps.length === 0 && <p className="text-purple-600 text-sm font-medium">Henüz kayıt isteği yok</p>}
        </div>
      </div>

      {/* Karakter Hikayesi / Tanıtım Başvuruları */}
      {!isGuideOnly && (
        <div>
          <h2 className="text-2xl font-bold text-amber-400 mb-6" style={{ fontFamily: "Georgia, serif" }}>📜 Karakter Tanıtım Hikayeleri</h2>
          
          {pendingIntros.length > 0 && (
            <div className="mb-6">
              <h3 className="text-yellow-400 text-xs font-semibold mb-3 tracking-widest uppercase">⏳ Bekleyen Tanıtımlar ({pendingIntros.length})</h3>
              <div className="space-y-4">
                {pendingIntros.map(intro => (
                  <IntroCard
                    key={intro.id}
                    intro={intro}
                    isOpen={expandedIntro === intro.id}
                    onToggle={() => setExpandedIntro(expandedIntro === intro.id ? null : intro.id)}
                    onApprove={() => handleIntroAction(intro.id, "approve")}
                    onReject={() => handleIntroAction(intro.id, "reject")}
                  />
                ))}
              </div>
            </div>
          )}

          <h3 className="text-purple-400 text-xs font-semibold mb-3 tracking-widest uppercase">Geçmiş Tanıtım Kararları ({processedIntros.length})</h3>
          <div className="space-y-3">
            {processedIntros.map(intro => (
              <IntroCard
                key={intro.id}
                intro={intro}
                isOpen={expandedIntro === intro.id}
                onToggle={() => setExpandedIntro(expandedIntro === intro.id ? null : intro.id)}
              />
            ))}
            {intros.length === 0 && <p className="text-purple-600 text-sm font-medium">Henüz tanıtım başvurusu yok</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function SortingCard({
  app,
  isOpen,
  onToggle,
  onApprove,
  onReject
}: {
  app: Application;
  isOpen: boolean;
  onToggle: () => void;
  onApprove?: (house: string) => void;
  onReject?: () => void;
}) {
  const [selectedHouse, setSelectedHouse] = useState(app.suggestedHouse || "Gryffindor");
  let answersList: string[] = [];
  try { answersList = JSON.parse(app.answers ?? "[]"); } catch {}

  const houses = ["Gryffindor", "Slytherin", "Ravenclaw", "Hufflepuff"];

  return (
    <div className="bg-[#12101a]/90 backdrop-blur-md border border-purple-900/30 rounded-xl overflow-hidden shadow-lg">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-purple-950/20 transition-all text-left"
      >
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-white font-medium text-base">{app.discordUsername}</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border tracking-wide uppercase ${STATUS_COLORS[app.status] ?? "text-purple-400"}`}>
              {STATUS_LABELS[app.status] ?? app.status}
            </span>
          </div>
          <div className="text-purple-400 text-xs mt-1 font-mono">
            {app.discordId} • Kan: {app.bloodStatus} • Cinsiyet: {app.gender} • Önerilen: <span className="text-amber-400 font-semibold">{app.suggestedHouse}</span>
          </div>
        </div>
        <span className="text-purple-500 font-mono text-xs">{isOpen ? "▲ Gizle" : "▼ Göster"}</span>
      </button>

      {isOpen && (
        <div className="px-6 pb-6 border-t border-purple-900/20 pt-4 space-y-4 bg-[#0d0b12]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-purple-500 text-xs tracking-wider uppercase font-semibold">OOC İsim</p>
              <p className="text-white text-sm bg-[#1c1928] rounded-lg px-3 py-2 mt-1">{app.oocName}</p>
            </div>
            <div>
              <p className="text-purple-500 text-xs tracking-wider uppercase font-semibold">OOC Yaş</p>
              <p className="text-white text-sm bg-[#1c1928] rounded-lg px-3 py-2 mt-1">{app.oocAge}</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-purple-400 text-sm font-semibold border-b border-purple-950 pb-1 mt-4">🎩 Seçmen Şapka Soru & Cevapları</p>
            {answersList.map((ans, i) => (
              <div key={i} className="bg-[#151221] p-3 rounded-lg border border-purple-950/50">
                <p className="text-amber-500/80 text-[10px] font-bold tracking-wider uppercase mb-1">Cevap {i + 1}</p>
                <p className="text-purple-200 text-sm leading-relaxed">{ans}</p>
              </div>
            ))}
          </div>

          {app.status === "pending" && onApprove && onReject && (
            <div className="flex flex-col sm:flex-row items-center gap-4 border-t border-purple-950/60 pt-4 mt-6">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-xs text-purple-400 font-semibold uppercase tracking-wider">Atanacak Bina:</label>
                <select
                  value={selectedHouse}
                  onChange={e => setSelectedHouse(e.target.value)}
                  className="bg-[#1c1928] border border-purple-800 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-amber-400"
                >
                  {houses.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
                <button
                  onClick={() => onApprove(selectedHouse)}
                  className="w-full sm:w-auto bg-green-700 hover:bg-green-600 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-all"
                >
                  Onayla
                </button>
                <button
                  onClick={onReject}
                  className="w-full sm:w-auto bg-red-800 hover:bg-red-700 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-all"
                >
                  Reddet
                </button>
              </div>
            </div>
          )}

          {app.status !== "pending" && app.reviewedBy && (
            <div className="text-purple-500 text-xs font-mono border-t border-purple-950/60 pt-3 mt-4">
              Kararı veren: <span className="text-amber-500 font-semibold">{app.reviewedBy}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IntroCard({
  intro,
  isOpen,
  onToggle,
  onApprove,
  onReject
}: {
  intro: CharacterIntro;
  isOpen: boolean;
  onToggle: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  return (
    <div className="bg-[#12101a]/90 backdrop-blur-md border border-purple-900/30 rounded-xl overflow-hidden shadow-lg">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-purple-950/20 transition-all text-left"
      >
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-white font-medium text-base">{intro.icName}</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border tracking-wide uppercase ${STATUS_COLORS[intro.status] ?? "text-purple-400"}`}>
              {STATUS_LABELS[intro.status] ?? intro.status}
            </span>
          </div>
          <div className="text-purple-400 text-xs mt-1 font-mono">
            Kullanıcı ID: {intro.discordId} • Karakter Yaşı: {intro.icAge}
          </div>
        </div>
        <span className="text-purple-500 font-mono text-xs">{isOpen ? "▲ Gizle" : "▼ Göster"}</span>
      </button>

      {isOpen && (
        <div className="px-6 pb-6 border-t border-purple-900/20 pt-4 space-y-4 bg-[#0d0b12]">
          <div>
            <p className="text-purple-500 text-xs tracking-wider uppercase font-semibold mb-2">📜 Karakter Hikayesi / Tanıtım Yazısı</p>
            <div className="bg-[#151221] p-4 rounded-lg border border-purple-950/50 text-purple-200 text-sm leading-relaxed whitespace-pre-line font-serif">
              {intro.icStory}
            </div>
          </div>

          {intro.status === "pending" && onApprove && onReject && (
            <div className="flex items-center gap-2 justify-end border-t border-purple-950/60 pt-4 mt-6">
              <button
                onClick={onApprove}
                className="bg-green-700 hover:bg-green-600 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-all"
              >
                Tanıtımı Onayla
              </button>
              <button
                onClick={onReject}
                className="bg-red-800 hover:bg-red-700 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-all"
              >
                Tanıtımı Reddet
              </button>
            </div>
          )}

          {intro.status !== "pending" && intro.reviewedBy && (
            <div className="text-purple-500 text-xs font-mono border-t border-purple-950/60 pt-3 mt-4">
              Kararı veren: <span className="text-amber-500 font-semibold">{intro.reviewedBy}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
