import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface Lesson {
  id: number;
  professorDiscordId: string;
  subject: string;
  description: string | null;
  classYear: number;
  isLive: boolean;
  scheduledAt: string;
}

interface Exam {
  id: number;
  professorDiscordId: string;
  subject: string;
  classYear: number;
  type: string;
  isActive: boolean;
  examCode: string | null;
  examLink: string | null;
  startedAt: string | null;
  endedAt: string | null;
}

interface ExamResult {
  id: number;
  discordId: string;
  examId: number;
  score: number | null;
  isPassed: boolean | null;
  gradedAt: string | null;
  studentName?: string;
}

const SUBJECTS = [
  "biçim değiştirme",
  "tılsım",
  "iksir",
  "KSKS",
  "Sihir tarihi",
  "astronomi",
  "bitki bilim",
  "uçuş dersi",
  "aritmansi",
  "muggle bilimleri",
  "kehanet",
  "Sihirli Yaratıkların bakımı",
  "antik rünler",
  "cisimlenme",
];

export default function AcademicPage({ userRole = "student" }: { userRole?: string }) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [myResults, setMyResults] = useState<ExamResult[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Forms
  const [lessonSubject, setLessonSubject] = useState(SUBJECTS[0]);
  const [lessonYear, setLessonYear] = useState(1);
  const [lessonDesc, setLessonDesc] = useState("");

  const [examSubject, setExamSubject] = useState(SUBJECTS[0]);
  const [examYear, setExamYear] = useState(1);
  const [examType, setExamType] = useState("vize");
  const [examCode, setExamCode] = useState("");
  const [examLink, setExamLink] = useState("");

  // Ending lesson details
  const [endingLessonId, setEndingLessonId] = useState<number | null>(null);
  const [scrollSpellName, setScrollSpellName] = useState("");
  const [scrollAmount, setScrollAmount] = useState(1);

  // Student exam code entry
  const [examCodesSubmitted, setExamCodesSubmitted] = useState<Record<number, string>>({});
  const [revealedLinks, setRevealedLinks] = useState<Record<number, string>>({});

  // Grading
  const [gradingExamId, setGradingExamId] = useState<number | null>(null);
  const [examSubmissions, setExamSubmissions] = useState<ExamResult[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});

  const isStudent = userRole === "student";

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      if (isStudent) {
        const d = await api.get<{ exams: Exam[]; results: ExamResult[] }>("/exams");
        setExams(d.exams ?? []);
        setMyResults(d.results ?? []);
      } else {
        const lData = await api.get<{ lessons: Lesson[] }>("/lessons");
        const eData = await api.get<{ exams: Exam[] }>("/exams");
        setLessons(lData.lessons ?? []);
        setExams(eData.exams ?? []);
      }
    } catch (err: any) {
      setError(err.message ?? "Veriler yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Lesson actions
  async function handleCreateLesson(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await api.post("/lessons", {
        subject: lessonSubject,
        classYear: lessonYear,
        description: lessonDesc,
      });
      setSuccess("Ders başarıyla açıldı ve Discord duyurusu gönderildi!");
      setLessonDesc("");
      loadData();
    } catch (err: any) {
      setError(err.message ?? "Ders açılırken bir hata oluştu.");
    }
  }

  async function handleEndLesson(e: React.FormEvent) {
    e.preventDefault();
    if (!endingLessonId) return;
    setError("");
    setSuccess("");
    try {
      const res = await api.post<{ ok: boolean; participantsCount: number; rewardedCount: number }>(
        `/lessons/${endingLessonId}/end`,
        { amount: scrollAmount, spellName: scrollSpellName }
      );
      setSuccess(`Ders kapatıldı! Ses kanalındaki ${res.participantsCount} öğrenciye ${scrollAmount} adet ${scrollSpellName} Parşömeni dağıtıldı.`);
      setEndingLessonId(null);
      setScrollSpellName("");
      loadData();
    } catch (err: any) {
      setError(err.message ?? "Ders kapatılamadı. Ses kanalında olduğunuzdan emin olun!");
    }
  }

  // Exam actions
  async function handleCreateExam(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await api.post("/exams", {
        subject: examSubject,
        classYear: examYear,
        type: examType,
        examCode,
        examLink,
      });
      setSuccess("Sınav başarıyla oluşturuldu ve aktif edildi!");
      setExamCode("");
      setExamLink("");
      loadData();
    } catch (err: any) {
      setError(err.message ?? "Sınav oluşturulamadı.");
    }
  }

  async function handleDeactivateExam(id: number) {
    setError("");
    setSuccess("");
    try {
      await api.patch(`/exams/${id}`, { isActive: false });
      setSuccess("Sınav başarıyla kapatıldı.");
      loadData();
    } catch (err: any) {
      setError(err.message ?? "Sınav kapatılamadı.");
    }
  }

  // Student exam entry
  async function handleSubmitExamCode(examId: number) {
    setError("");
    const code = examCodesSubmitted[examId];
    if (!code) {
      alert("Lütfen sınav kodunu girin.");
      return;
    }
    try {
      const res = await api.post<{ ok: boolean; examLink: string }>(`/exams/${examId}/submit-code`, { code });
      setRevealedLinks(prev => ({ ...prev, [examId]: res.examLink }));
      window.open(res.examLink, "_blank");
    } catch (err: any) {
      alert(err.message ?? "Kod doğrulanamadı.");
    }
  }

  // Grading actions
  async function handleLoadSubmissions(examId: number) {
    setGradingExamId(examId);
    try {
      const res = await api.get<{ results: ExamResult[] }>(`/exams/${examId}/results`);
      setExamSubmissions(res.results ?? []);
      // Reset scores
      const initialScores: Record<string, number> = {};
      res.results.forEach(r => {
        initialScores[r.discordId] = r.score ?? 0;
      });
      setScores(initialScores);
    } catch (err: any) {
      alert(err.message ?? "Sınav katılımcıları yüklenemedi.");
    }
  }

  async function handleGradeStudent(studentDiscordId: string) {
    if (!gradingExamId) return;
    const score = scores[studentDiscordId];
    if (score < 0 || score > 100) {
      alert("Puan 0-100 arasında olmalıdır.");
      return;
    }
    try {
      await api.post(`/exams/${gradingExamId}/grade`, { discordId: studentDiscordId, score });
      alert("Öğrenci başarıyla notlandırıldı ve bilgilendirildi.");
      handleLoadSubmissions(gradingExamId);
      loadData();
    } catch (err: any) {
      alert(err.message ?? "Not girilemedi.");
    }
  }

  if (loading) return <div className="text-purple-400 text-center mt-20">🔮 Yükleniyor...</div>;

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-950/40 border border-red-700/50 rounded-xl p-4 text-red-300 text-sm shadow-md">
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="bg-green-950/40 border border-green-700/50 rounded-xl p-4 text-green-300 text-sm shadow-md">
          ✨ {success}
        </div>
      )}

      {/* STUDENT VIEW */}
      {isStudent && (
        <div className="space-y-6">
          <div className="bg-[#12101a] border border-purple-900/30 rounded-2xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-amber-400 mb-4" style={{ fontFamily: "Georgia, serif" }}>📝 Aktif Sınavlarım</h2>
            <p className="text-purple-400 text-sm mb-6">Sınıf yılına uygun şu an aktif olan sınavlar aşağıda listelenmiştir. Profesörünün verdiği sınav kodunu girerek bağlantıyı açabilirsin.</p>

            <div className="space-y-4">
              {exams.map(exam => {
                const isTaken = myResults.some(r => r.examId === exam.id);
                const result = myResults.find(r => r.examId === exam.id);
                const hasLink = revealedLinks[exam.id];

                return (
                  <div key={exam.id} className="bg-[#181524] border border-purple-950 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-white font-semibold text-lg capitalize">{exam.subject} Sınavı</h3>
                      <p className="text-purple-500 text-xs mt-1">Tür: {exam.type.toUpperCase()} • Hedef: {exam.classYear}. Sınıflar</p>
                      {result && result.score !== null && (
                        <p className="text-amber-400 text-xs font-semibold mt-2">
                          Notun: {result.score}/100 — {result.isPassed ? "✅ Geçti" : "❌ Kaldı"}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!hasLink && !result?.score && (
                        <>
                          <input
                            type="text"
                            placeholder="Sınav Kodu"
                            value={examCodesSubmitted[exam.id] ?? ""}
                            onChange={e => setExamCodesSubmitted({ ...examCodesSubmitted, [exam.id]: e.target.value })}
                            className="bg-[#12101a] border border-purple-900 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                          />
                          <button
                            onClick={() => handleSubmitExamCode(exam.id)}
                            className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all"
                          >
                            Kodu Gir ve Başla
                          </button>
                        </>
                      )}

                      {(hasLink || result?.score) && (
                        <button
                          onClick={() => window.open(hasLink || exam.examLink || "", "_blank")}
                          className="bg-green-700 hover:bg-green-600 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-all"
                        >
                          Sınav Sayfasına Git
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {exams.length === 0 && (
                <p className="text-purple-600 text-center py-6 text-sm">Şu an senin sınıfın için aktif sınav bulunmuyor.</p>
              )}
            </div>
          </div>

          {/* Transcript / Eski Sınavlar */}
          <div className="bg-[#12101a] border border-purple-900/30 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-purple-300 mb-4" style={{ fontFamily: "Georgia, serif" }}>🎓 Akademik Geçmiş & Notlarım</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-purple-300 text-sm">
                <thead>
                  <tr className="border-b border-purple-950 text-purple-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="pb-3">Sınav ID</th>
                    <th className="pb-3">Ders</th>
                    <th className="pb-3">Tür</th>
                    <th className="pb-3">Puan</th>
                    <th className="pb-3">Durum</th>
                    <th className="pb-3">Tarih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-950/40">
                  {myResults.map(res => (
                    <tr key={res.id} className="hover:bg-purple-950/10">
                      <td className="py-3 font-mono">{res.examId}</td>
                      <td className="py-3 font-medium capitalize text-white">{exams.find(e => e.id === res.examId)?.subject ?? "Bilinmeyen Ders"}</td>
                      <td className="py-3 uppercase text-xs">{exams.find(e => e.id === res.examId)?.type ?? "Vize"}</td>
                      <td className="py-3 font-semibold text-white">{res.score !== null ? `${res.score}/100` : "⏳ Okunuyor"}</td>
                      <td className="py-3">
                        {res.score !== null ? (
                          res.isPassed ? <span className="text-green-400 font-bold">GEÇTİ</span> : <span className="text-red-400 font-bold">KALDI</span>
                        ) : "⏳ Sonuç Bekleniyor"}
                      </td>
                      <td className="py-3 text-xs text-purple-500">{res.gradedAt ? new Date(res.gradedAt).toLocaleDateString() : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {myResults.length === 0 && (
                <p className="text-purple-600 text-center py-6 text-xs">Henüz girilmiş bir sınav notunuz bulunmuyor.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PROFESSOR / ADMIN VIEW */}
      {!isStudent && (
        <div className="space-y-8">
          {/* Lessons Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Lesson */}
            <div className="bg-[#12101a] border border-purple-900/30 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-amber-400 mb-4" style={{ fontFamily: "Georgia, serif" }}>📚 Yeni Canlı Ders Aç</h2>
              <form onSubmit={handleCreateLesson} className="space-y-4">
                <div>
                  <label className="block text-xs text-purple-400 uppercase font-semibold tracking-wider mb-1.5">Ders Seçin</label>
                  <select
                    value={lessonSubject}
                    onChange={e => setLessonSubject(e.target.value)}
                    className="w-full bg-[#1c1928] border border-purple-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  >
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-purple-400 uppercase font-semibold tracking-wider mb-1.5">Hedef Sınıf Yılı</label>
                  <select
                    value={lessonYear}
                    onChange={e => setLessonYear(Number(e.target.value))}
                    className="w-full bg-[#1c1928] border border-purple-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  >
                    {[1,2,3,4,5,6,7].map(yr => <option key={yr} value={yr}>{yr}. Yıl Öğrencileri</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-purple-400 uppercase font-semibold tracking-wider mb-1.5">Ders Açıklaması (Opsiyonel)</label>
                  <textarea
                    rows={2}
                    value={lessonDesc}
                    onChange={e => setLessonDesc(e.target.value)}
                    placeholder="Ders içeriği ve yeri hakkında kısa bir bilgi..."
                    className="w-full bg-[#1c1928] border border-purple-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-purple-700 hover:bg-purple-600 text-white text-xs font-semibold py-2.5 rounded-lg transition-all"
                >
                  📣 Dersi Başlat ve Duyur
                </button>
              </form>
            </div>

            {/* Live & Ended Lessons list */}
            <div className="bg-[#12101a] border border-purple-900/30 rounded-2xl p-6 shadow-xl lg:col-span-2">
              <h2 className="text-lg font-bold text-purple-300 mb-4" style={{ fontFamily: "Georgia, serif" }}>📋 Hogwarts Ders Logları</h2>
              <div className="max-h-[300px] overflow-y-auto space-y-3">
                {lessons.map(l => (
                  <div key={l.id} className="bg-[#181524] border border-purple-950 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold text-sm capitalize">{l.subject}</span>
                        {l.isLive ? (
                          <span className="bg-green-950/40 text-green-400 border border-green-800 text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wide">CANLI</span>
                        ) : (
                          <span className="bg-purple-950/40 text-purple-400 border border-purple-900 text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wide">BİTTİ</span>
                        )}
                      </div>
                      <p className="text-purple-400 text-xs mt-1">Sınıf Yılı: {l.classYear}. Yıl • Prof: {l.professorDiscordId}</p>
                    </div>

                    {l.isLive && (
                      <button
                        onClick={() => { setEndingLessonId(l.id); setScrollSpellName(l.subject); }}
                        className="bg-red-800 hover:bg-red-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all"
                      >
                        🔴 Bitir & Parşömen Ver
                      </button>
                    )}
                  </div>
                ))}
                {lessons.length === 0 && <p className="text-purple-600 text-center text-xs py-10">Henüz hiç ders kaydı yok.</p>}
              </div>
            </div>
          </div>

          {/* Lesson Ending Modal Panel */}
          {endingLessonId && (
            <div className="bg-[#1a1426] border border-amber-600/40 rounded-2xl p-6 shadow-xl">
              <h3 className="text-amber-400 font-bold text-base mb-2">🎁 Dersi Sonlandır & Parşömen Dağıt</h3>
              <p className="text-purple-400 text-xs mb-4">Ders bitiminde ses kanalında bulunan öğrencilerin envanterlerine bu ders için büyü parşömeni otomatik eklenecektir.</p>
              
              <form onSubmit={handleEndLesson} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-[10px] text-purple-400 uppercase font-semibold tracking-wider mb-1.5">Büyü Adı</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Alohomora"
                    value={scrollSpellName}
                    onChange={e => setScrollSpellName(e.target.value)}
                    className="w-full bg-[#12101a] border border-purple-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-purple-400 uppercase font-semibold tracking-wider mb-1.5">Verilecek Miktar</label>
                  <select
                    value={scrollAmount}
                    onChange={e => setScrollAmount(Number(e.target.value))}
                    className="w-full bg-[#12101a] border border-purple-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  >
                    {[1,2,3,4,5].map(v => <option key={v} value={v}>{v} Parşömen</option>)}
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-green-700 hover:bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all flex-1"
                  >
                    Dağıt ve Bitir
                  </button>
                  <button
                    type="button"
                    onClick={() => setEndingLessonId(null)}
                    className="bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 text-xs font-semibold px-4 py-2.5 rounded-lg transition-all"
                  >
                    Vazgeç
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Exams Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Exam Form */}
            <div className="bg-[#12101a] border border-purple-900/30 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-amber-400 mb-4" style={{ fontFamily: "Georgia, serif" }}>📝 Yeni Sınav Aç</h2>
              <form onSubmit={handleCreateExam} className="space-y-4">
                <div>
                  <label className="block text-xs text-purple-400 uppercase font-semibold tracking-wider mb-1.5">Ders Seçin</label>
                  <select
                    value={examSubject}
                    onChange={e => setExamSubject(e.target.value)}
                    className="w-full bg-[#1c1928] border border-purple-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  >
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-purple-400 uppercase font-semibold tracking-wider mb-1.5">Sınıf Yılı</label>
                  <select
                    value={examYear}
                    onChange={e => setExamYear(Number(e.target.value))}
                    className="w-full bg-[#1c1928] border border-purple-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  >
                    {[1,2,3,4,5,6,7].map(yr => <option key={yr} value={yr}>{yr}. Yıl</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-purple-400 uppercase font-semibold tracking-wider mb-1.5">Sınav Türü</label>
                  <select
                    value={examType}
                    onChange={e => setExamType(e.target.value)}
                    className="w-full bg-[#1c1928] border border-purple-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  >
                    <option value="vize">Vize Sınavı</option>
                    <option value="final">Final Sınavı</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-purple-400 uppercase font-semibold tracking-wider mb-1.5">Giriş Şifresi / Kodu</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: TRNS101"
                    value={examCode}
                    onChange={e => setExamCode(e.target.value)}
                    className="w-full bg-[#1c1928] border border-purple-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs text-purple-400 uppercase font-semibold tracking-wider mb-1.5">Google Form / Sınav Linki</label>
                  <input
                    type="url"
                    required
                    placeholder="https://docs.google.com/forms/..."
                    value={examLink}
                    onChange={e => setExamLink(e.target.value)}
                    className="w-full bg-[#1c1928] border border-purple-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold py-2.5 rounded-lg transition-all"
                >
                  📝 Sınavı Başlat ve Kodunu Dağıt
                </button>
              </form>
            </div>

            {/* Exams list */}
            <div className="bg-[#12101a] border border-purple-900/30 rounded-2xl p-6 shadow-xl lg:col-span-2">
              <h2 className="text-lg font-bold text-purple-300 mb-4" style={{ fontFamily: "Georgia, serif" }}>📋 Aktif & Geçmiş Sınavlar</h2>
              <div className="max-h-[480px] overflow-y-auto space-y-3">
                {exams.map(e => (
                  <div key={e.id} className="bg-[#181524] border border-purple-950 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold text-sm capitalize">{e.subject} Sınavı ({e.type.toUpperCase()})</span>
                        {e.isActive ? (
                          <span className="bg-red-950/40 text-red-400 border border-red-800 text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wide">AKTİF</span>
                        ) : (
                          <span className="bg-purple-950/40 text-purple-400 border border-purple-900 text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wide">KAPANDI</span>
                        )}
                      </div>
                      <p className="text-purple-400 text-xs mt-1">Hedef: {e.classYear}. Yıl • Şifre: <span className="font-mono text-amber-400 font-bold">{e.examCode ?? "-"}</span></p>
                    </div>

                    <div className="flex items-center gap-2">
                      {e.isActive && (
                        <button
                          onClick={() => handleDeactivateExam(e.id)}
                          className="bg-red-800 hover:bg-red-700 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all"
                        >
                          Deaktif Et
                        </button>
                      )}
                      <button
                        onClick={() => handleLoadSubmissions(e.id)}
                        className="bg-purple-800 hover:bg-purple-700 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all"
                      >
                        📄 Notlandır
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Student Grading List modal-like block */}
          {gradingExamId && (
            <div className="bg-[#12101a] border border-purple-900/30 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4 border-b border-purple-950 pb-3">
                <h3 className="text-lg font-bold text-purple-300">📄 Sınav Sonuç Değerlendirme — Sınav #{gradingExamId}</h3>
                <button
                  onClick={() => setGradingExamId(null)}
                  className="text-purple-500 hover:text-purple-300 text-sm font-semibold"
                >
                  Kapat
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-purple-300 text-sm">
                  <thead>
                    <tr className="border-b border-purple-950 text-purple-500 text-xs font-semibold uppercase">
                      <th className="pb-3">Öğrenci Adı (OOC / IC)</th>
                      <th className="pb-3">Discord ID</th>
                      <th className="pb-3">Mevcut Not</th>
                      <th className="pb-3">Geçti mi</th>
                      <th className="pb-3">Yeni Not Gir</th>
                      <th className="pb-3 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-950/40">
                    {examSubmissions.map(sub => (
                      <tr key={sub.discordId} className="hover:bg-purple-950/10">
                        <td className="py-3 font-medium text-white">{sub.studentName}</td>
                        <td className="py-3 font-mono text-xs">{sub.discordId}</td>
                        <td className="py-3 text-white font-semibold">{sub.score !== null ? `${sub.score}/100` : "⏳ Okunmadı"}</td>
                        <td className="py-3">
                          {sub.score !== null ? (
                            sub.isPassed ? <span className="text-green-400">Evet</span> : <span className="text-red-400">Hayır</span>
                          ) : "⏳ Bekliyor"}
                        </td>
                        <td className="py-3">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={scores[sub.discordId] ?? ""}
                            onChange={e => setScores({ ...scores, [sub.discordId]: parseInt(e.target.value) })}
                            className="w-20 bg-[#1c1928] border border-purple-800 text-white text-center rounded-lg px-2 py-1 text-sm focus:outline-none"
                          />
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleGradeStudent(sub.discordId)}
                            className="bg-green-700 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                          >
                            Puanı Kaydet
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {examSubmissions.length === 0 && (
                  <p className="text-purple-600 text-center py-6 text-xs">Sınava henüz giriş yapmış öğrenci bulunamadı.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
