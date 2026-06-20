import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface ConfigField { key: string; label: string; description: string; category: string; placeholder?: string }

const FIELDS: ConfigField[] = [
  // Kanallar
  { key: "SORTING_HAT_CHANNEL_ID", label: "Seçmen Şapkası Kanalı", description: "Seçmen Şapkası butonunun gönderileceği kanal ID", category: "channels", placeholder: "Discord Kanal ID" },
  { key: "SORTING_RESULT_CHANNEL_ID", label: "Seçmen Sonuç Kanalı", description: "Bina onay bildirimi gönderilecek kanal ID", category: "channels" },
  { key: "SORTING_APPROVE_CHANNEL_ID", label: "Başvuru Onay Kanalı", description: "Moderatör onay mesajlarının gönderileceği kanal ID", category: "channels" },
  { key: "BANK_CHANNEL_ID", label: "Banka Kanalı", description: "Gringotts işlemlerinin loglanacağı kanal ID", category: "channels" },
  { key: "HOUSE_CUP_CHANNEL_ID", label: "Bina Kupası Kanalı", description: "Puan değişikliği bildirimlerinin gönderileceği kanal", category: "channels" },
  { key: "INTRO_CHANNEL_ID", label: "Tanıtım Kanalı", description: "Karakter tanıtım başvurularının gönderileceği kanal", category: "channels" },
  { key: "OWL_CHANNEL_ID", label: "Baykuş Kanalı", description: "Baykuş postasının kullanılacağı kanal", category: "channels" },
  { key: "ANNOUNCEMENTS_CHANNEL_ID", label: "Duyuru Kanalı", description: "Genel duyurular için kanal ID", category: "channels" },
  // Roller
  { key: "GRYFFINDOR_ROLE_ID", label: "Gryffindor Rol ID", description: "", category: "roles" },
  { key: "SLYTHERIN_ROLE_ID", label: "Slytherin Rol ID", description: "", category: "roles" },
  { key: "RAVENCLAW_ROLE_ID", label: "Ravenclaw Rol ID", description: "", category: "roles" },
  { key: "HUFFLEPUFF_ROLE_ID", label: "Hufflepuff Rol ID", description: "", category: "roles" },
  { key: "PROFESSOR_ROLE_ID", label: "Profesör Rol ID", description: "", category: "roles" },
  { key: "AUROR_ROLE_ID", label: "Seherbaz (Auror) Rol ID", description: "", category: "roles" },
  { key: "MINISTRY_ROLE_ID", label: "Bakanlık Rol ID", description: "", category: "roles" },
  { key: "WAND_MASTER_ROLE_ID", label: "Asa Ustası Rol ID", description: "", category: "roles" },
  { key: "AZKABAN_ROLE_ID", label: "Azkaban Rol ID", description: "", category: "roles" },
  { key: "WARN1_ROLE_ID", label: "Warn 1 Rol ID", description: "", category: "roles" },
  { key: "WARN2_ROLE_ID", label: "Warn 2 Rol ID", description: "", category: "roles" },
  { key: "WARN3_ROLE_ID", label: "Warn 3 Rol ID", description: "", category: "roles" },
  { key: "YEAR1_ROLE_ID", label: "1. Yıl Rol ID", description: "", category: "roles" },
  { key: "YEAR2_ROLE_ID", label: "2. Yıl Rol ID", description: "", category: "roles" },
  { key: "YEAR3_ROLE_ID", label: "3. Yıl Rol ID", description: "", category: "roles" },
  { key: "YEAR4_ROLE_ID", label: "4. Yıl Rol ID", description: "", category: "roles" },
  { key: "YEAR5_ROLE_ID", label: "5. Yıl Rol ID", description: "", category: "roles" },
  { key: "YEAR6_ROLE_ID", label: "6. Yıl Rol ID", description: "", category: "roles" },
  { key: "YEAR7_ROLE_ID", label: "7. Yıl Rol ID", description: "", category: "roles" },
  // Sistem
  { key: "SALARY_INTERVAL_HOURS", label: "Maaş Aralığı (saat)", description: "Kaç saatte bir maaş ödenir (varsayılan: 24)", category: "system", placeholder: "24" },
  { key: "AZKABAN_DAYS", label: "Azkaban Süresi (gün)", description: "Warn 3 sonrası Azkaban süresi (varsayılan: 1)", category: "system", placeholder: "1" },
  { key: "XP_PER_MINUTE_VOICE", label: "Ses XP/dakika", description: "Ses kanalında dakika başına verilen XP (varsayılan: 1)", category: "system", placeholder: "1" },
];

const CATEGORIES: { id: string; label: string; icon: string }[] = [
  { id: "channels", label: "Kanal ID'leri", icon: "📢" },
  { id: "roles", label: "Rol ID'leri", icon: "🎭" },
  { id: "system", label: "Sistem Ayarları", icon: "⚙️" },
];

export default function ConfigPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [activeCategory, setActiveCategory] = useState("channels");

  useEffect(() => {
    api.get<{ config: Record<string, string> }>("/config").then(d => setValues(d.config ?? {})).finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true); setMsg("");
    try {
      const entries = Object.entries(values).filter(([, v]) => v).map(([key, value]) => ({ key, value }));
      await api.post("/config", entries);
      setMsg("✅ Ayarlar kaydedildi! Botu yeniden başlatmayı unutma.");
    } catch (e: any) { setMsg(`❌ ${e.message}`); }
    setSaving(false);
  }

  if (loading) return <div className="text-purple-400 text-center mt-20">🔮 Yükleniyor...</div>;

  const categoryFields = FIELDS.filter(f => f.category === activeCategory);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-amber-400" style={{ fontFamily: "Georgia, serif" }}>⚙️ Bot Ayarları</h2>
        <button onClick={save} disabled={saving} className="bg-purple-700 hover:bg-purple-600 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
          {saving ? "Kaydediliyor..." : "💾 Kaydet"}
        </button>
      </div>

      <p className="text-purple-400 text-sm mb-5">
        Discord'dan rol/kanal ID almak için: Geliştirici Modu açık olmalı (Discord Ayarlar → Gelişmiş → Geliştirici Modu).
        Ardından rol/kanala sağ tık → "ID'yi Kopyala".
      </p>

      {/* Category tabs */}
      <div className="flex gap-2 mb-6">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeCategory === cat.id ? "bg-purple-800 text-white" : "bg-[#13111a] text-purple-400 hover:text-white border border-purple-900/30"}`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Fields */}
      <div className="bg-[#13111a] border border-purple-900/30 rounded-2xl p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {categoryFields.map(field => (
            <div key={field.key}>
              <label className="text-purple-300 text-sm font-medium mb-1 block">{field.label}</label>
              {field.description && <p className="text-purple-600 text-xs mb-1.5">{field.description}</p>}
              <input
                type="text"
                value={values[field.key] ?? ""}
                onChange={e => setValues(p => ({ ...p, [field.key]: e.target.value }))}
                placeholder={field.placeholder ?? "Discord ID gir..."}
                className="w-full bg-[#1c1928] border border-purple-800/40 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
          ))}
        </div>
      </div>

      {msg && (
        <div className={`mt-4 rounded-xl px-4 py-3 text-sm ${msg.startsWith("✅") ? "bg-green-900/30 text-green-300 border border-green-700/40" : "bg-red-900/30 text-red-300 border border-red-700/40"}`}>
          {msg}
        </div>
      )}
    </div>
  );
}
