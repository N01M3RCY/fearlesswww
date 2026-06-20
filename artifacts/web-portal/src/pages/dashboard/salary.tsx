import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface SalaryEntry { roleName: string; roleId: string; amount: number }

export default function SalaryPage() {
  const [salaries, setSalaries] = useState<SalaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.get<{ salaries: SalaryEntry[] }>("/salaries")
      .then(d => setSalaries(d.salaries ?? []))
      .finally(() => setLoading(false));
  }, []);

  function addRow() {
    setSalaries(p => [...p, { roleName: "", roleId: "", amount: 0 }]);
  }
  function removeRow(i: number) {
    setSalaries(p => p.filter((_, idx) => idx !== i));
  }
  function updateRow(i: number, key: keyof SalaryEntry, val: string | number) {
    setSalaries(p => p.map((s, idx) => idx === i ? { ...s, [key]: val } : s));
  }

  async function save() {
    setSaving(true);
    setMsg("");
    try {
      await api.post("/salaries", salaries);
      setMsg("✅ Maaş tablosu kaydedildi!");
    } catch (e: any) { setMsg(`❌ ${e.message}`); }
    setSaving(false);
  }

  async function payAll() {
    if (!confirm("Tüm uygun kullanıcılara şimdi maaş ödensin mi?")) return;
    setPaying(true);
    setMsg("");
    try {
      const result = await api.post<{ paid: number }>("/salaries/pay-all", {});
      setMsg(`✅ ${result.paid} kullanıcıya maaş ödendi!`);
    } catch (e: any) { setMsg(`❌ ${e.message}`); }
    setPaying(false);
  }

  if (loading) return <div className="text-purple-400 text-center mt-20">🔮 Yükleniyor...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-amber-400" style={{ fontFamily: "Georgia, serif" }}>💰 Maaş Sistemi</h2>
        <div className="flex gap-3">
          <button
            onClick={payAll}
            disabled={paying}
            className="bg-amber-700 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            {paying ? "Ödeniyor..." : "💸 Şimdi Maaş Öde"}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? "Kaydediliyor..." : "💾 Kaydet"}
          </button>
        </div>
      </div>

      <div className="bg-[#13111a] border border-purple-900/30 rounded-2xl p-6 mb-4">
        <p className="text-purple-400 text-sm mb-5">
          Her role bir maaş miktarı tanımla. Discord rol ID'si girilirse o ID'ye göre kontrol yapılır (önerilir); girilmezse rol adı ile karşılaştırılır.
          Maaşlar her 24 saatte bir otomatik ödenir, ya da "Şimdi Maaş Öde" ile manuel tetiklenebilir.
        </p>

        <div className="space-y-3">
          {/* Header */}
          <div className="grid grid-cols-12 gap-3 text-xs text-purple-500 font-medium uppercase tracking-wider pb-2 border-b border-purple-900/20">
            <div className="col-span-4">Rol Adı</div>
            <div className="col-span-4">Discord Rol ID</div>
            <div className="col-span-3">Miktar (Galleon)</div>
            <div className="col-span-1"></div>
          </div>

          {salaries.map((s, i) => (
            <div key={i} className="grid grid-cols-12 gap-3 items-center">
              <input
                value={s.roleName}
                onChange={e => updateRow(i, "roleName", e.target.value)}
                placeholder="örn. Profesör"
                className="col-span-4 bg-[#1c1928] border border-purple-800/40 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400"
              />
              <input
                value={s.roleId}
                onChange={e => updateRow(i, "roleId", e.target.value)}
                placeholder="Discord Role ID"
                className="col-span-4 bg-[#1c1928] border border-purple-800/40 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-amber-400"
              />
              <input
                type="number"
                value={s.amount || ""}
                onChange={e => updateRow(i, "amount", Number(e.target.value))}
                placeholder="50"
                className="col-span-3 bg-[#1c1928] border border-purple-800/40 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400"
              />
              <button onClick={() => removeRow(i)} className="col-span-1 text-red-500 hover:text-red-400 text-lg text-center">×</button>
            </div>
          ))}

          <button
            onClick={addRow}
            className="mt-2 w-full border border-dashed border-purple-700/50 hover:border-amber-500/50 rounded-xl py-3 text-purple-500 hover:text-amber-400 text-sm transition-colors"
          >
            + Yeni Rol Ekle
          </button>
        </div>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm ${msg.startsWith("✅") ? "bg-green-900/30 text-green-300 border border-green-700/40" : "bg-red-900/30 text-red-300 border border-red-700/40"}`}>
          {msg}
        </div>
      )}

      <div className="bg-[#13111a] border border-purple-900/20 rounded-2xl p-5 mt-4">
        <h3 className="text-amber-400 font-semibold text-sm mb-3">ℹ️ Nasıl Çalışır?</h3>
        <ul className="text-purple-400 text-xs space-y-1.5 list-disc list-inside">
          <li>Bot her 24 saatte bir otomatik maaş öder</li>
          <li>Bir kullanıcı birden fazla maaş rolüne sahipse sadece ilk eşleşen ödenir</li>
          <li>Maaş ödemesinde cüzdana eklenir, banka hesabına değil</li>
          <li>Her ödeme işlem geçmişine "salary" tipiyle kaydedilir</li>
          <li>Baykuş ile maaş bildirimi gönderilir</li>
        </ul>
      </div>
    </div>
  );
}
