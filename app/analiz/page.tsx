"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { getQuestionAnalyses } from "@/lib/supabase"
import { Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChartContainer } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, ResponsiveContainer, LabelList } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { PieChart, Pie, Cell } from "recharts"
import { Tooltip as RechartsTooltip } from "recharts"

const COLUMNS = [
  "Ders",
  "Konu",
  "Bağlantılı Konular",
  "Alt Kazanım",
  "Zorluk Seviyesi",
  "Seçicilik",
  "Öğrenme Düzeyi",
  "Yeni Nesil Soru",
  "Soru Tipi",
  "Çözüm Süresi",
  "Soru Formatı",
  "Hata Türü",
  "Çözüm Stratejisi",
  "Çözüme Giden Adım Sayısı",
]

export default function DetayliAnalizPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const examId = searchParams.get("exam_id")
  const [loading, setLoading] = useState(true)
  const [analyses, setAnalyses] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedExamType, setSelectedExamType] = useState<string>("TYT")
  const [selectedSubject, setSelectedSubject] = useState<string>("Tümü")

  // Demo: Net skor verisi (gerçekte fetch ile dinamik olmalı)
  const months = ["Eylül", "Ekim", "Kasım", "Aralık", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran"];
  const allNetScoreData = [
    // TYT verileri
    { ay: "Eylül", net: 75.5, subject: "Tümü", examType: "TYT" },
    { ay: "Ekim", net: 85.0, subject: "Tümü", examType: "TYT" },
    { ay: "Kasım", net: 94.75, subject: "Tümü", examType: "TYT" },
    { ay: "Aralık", net: 94.5, subject: "Tümü", examType: "TYT" },
    { ay: "Eylül", net: 20, subject: "Türkçe", examType: "TYT" },
    { ay: "Ekim", net: 22, subject: "Türkçe", examType: "TYT" },
    { ay: "Kasım", net: 25, subject: "Türkçe", examType: "TYT" },
    { ay: "Aralık", net: 24, subject: "Türkçe", examType: "TYT" },
    { ay: "Eylül", net: 18, subject: "Temel Matematik", examType: "TYT" },
    { ay: "Ekim", net: 21, subject: "Temel Matematik", examType: "TYT" },
    { ay: "Kasım", net: 23, subject: "Temel Matematik", examType: "TYT" },
    { ay: "Aralık", net: 25, subject: "Temel Matematik", examType: "TYT" },
    { ay: "Eylül", net: 19, subject: "Fen Bilimleri", examType: "TYT" },
    { ay: "Ekim", net: 20, subject: "Fen Bilimleri", examType: "TYT" },
    { ay: "Kasım", net: 23, subject: "Fen Bilimleri", examType: "TYT" },
    { ay: "Aralık", net: 23, subject: "Fen Bilimleri", examType: "TYT" },
    { ay: "Eylül", net: 18.5, subject: "Sosyal Bilimler", examType: "TYT" },
    { ay: "Ekim", net: 22, subject: "Sosyal Bilimler", examType: "TYT" },
    { ay: "Kasım", net: 23.75, subject: "Sosyal Bilimler", examType: "TYT" },
    { ay: "Aralık", net: 22.5, subject: "Sosyal Bilimler", examType: "TYT" },
    // AYT için veri yok (demo)
  ];
  const subjects = ["Tümü", "Türkçe", "Temel Matematik", "Fen Bilimleri", "Sosyal Bilimler"];
  // Fill months for selected subject and exam type
  const netScoreData = months.map(month => {
    const found = allNetScoreData.find(d => d.subject === selectedSubject && d.ay === month && d.examType === selectedExamType);
    return found ? found : { ay: month, net: null };
  });
  const hasData = netScoreData.some(d => d.net !== null);

  // Ders ve alt-ders seçenekleri
  const mainSubjects = [
    { label: "Türkçe", value: "Türkçe" },
    { label: "Temel Matematik", value: "Temel Matematik" },
    { label: "Fen Bilimleri", value: "Fen Bilimleri" },
    { label: "Sosyal Bilimler", value: "Sosyal Bilimler" },
  ];
  const subSubjects: Record<string, string[]> = {
    "Temel Matematik": ["Matematik", "Geometri"],
    "Fen Bilimleri": ["Fizik", "Kimya", "Biyoloji"],
    "Sosyal Bilimler": ["Tarih", "Coğrafya", "Felsefe", "Din"],
  };
  const [selectedMainSubject, setSelectedMainSubject] = useState<string>(mainSubjects[0].value);
  const [selectedSubSubject, setSelectedSubSubject] = useState<string>("");

  // Analiz verileri için state
  const [difficultyDist, setDifficultyDist] = useState<any[]>([]);
  const [errorTypeDist, setErrorTypeDist] = useState<any[]>([]);
  const [subAchievementDist, setSubAchievementDist] = useState<any[]>([]);

  useEffect(() => {
    async function fetchAnalyses() {
      if (!examId) {
        setError("Sınav ID'si bulunamadı.")
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      const result = await getQuestionAnalyses(examId)
      if (result.success) {
        setAnalyses(result.data || [])
      } else {
        setError(result.error || "Analizler alınamadı.")
      }
      setLoading(false)
    }
    fetchAnalyses()
  }, [examId])

  // Aggregate analizler: filtrele ve chart verilerini hazırla
  useEffect(() => {
    if (!analyses || analyses.length === 0) {
      setDifficultyDist([])
      setErrorTypeDist([])
      setSubAchievementDist([])
      return
    }
    // Filtre: subject ve alt subject
    let filtered = analyses.filter((a) => {
      if (selectedMainSubject === "Türkçe") return a.subject === "Türkçe"
      if (selectedMainSubject === "Temel Matematik") {
        if (selectedSubSubject) return a.subject === selectedSubSubject
        return a.subject === "Temel Matematik" || a.subject === "Matematik" || a.subject === "Geometri"
      }
      if (selectedMainSubject === "Fen Bilimleri") {
        if (selectedSubSubject) return a.subject === selectedSubSubject
        return a.subject === "Fen Bilimleri" || ["Fizik", "Kimya", "Biyoloji"].includes(a.subject)
      }
      if (selectedMainSubject === "Sosyal Bilimler") {
        if (selectedSubSubject) return a.subject === selectedSubSubject
        return a.subject === "Sosyal Bilimler" || ["Tarih", "Coğrafya", "Felsefe", "Din"].includes(a.subject)
      }
      return false
    })
    // Zorluk seviyesi dağılımı
    const diffMap: Record<string, number> = {}
    filtered.forEach(a => {
      if (a.difficulty_level) diffMap[a.difficulty_level] = (diffMap[a.difficulty_level] || 0) + 1
    })
    const diffArr = Object.entries(diffMap).map(([name, value]) => ({ name, value }))
    setDifficultyDist(diffArr)
    // Hata türü dağılımı (en çok 5)
    const errMap: Record<string, number> = {}
    filtered.forEach(a => {
      if (a.error_type) errMap[a.error_type] = (errMap[a.error_type] || 0) + 1
    })
    let errArr = Object.entries(errMap).map(([name, value]) => ({ name, value }))
    errArr = errArr.sort((a, b) => b.value - a.value).slice(0, 5)
    setErrorTypeDist(errArr)
    // Alt kazanım dağılımı (en çok 5)
    const subAchMap: Record<string, number> = {}
    filtered.forEach(a => {
      if (a.sub_achievement) subAchMap[a.sub_achievement] = (subAchMap[a.sub_achievement] || 0) + 1
    })
    let subAchArr = Object.entries(subAchMap).map(([name, value]) => ({ name, value }))
    subAchArr = subAchArr.sort((a, b) => b.value - a.value).slice(0, 5)
    setSubAchievementDist(subAchArr)
  }, [analyses, selectedMainSubject, selectedSubSubject])

  return (
    <div className="min-h-screen w-full bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900 px-4 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-xl font-bold text-white">
            <span className="text-[#8b5cf6]">Error</span>Vault
          </h1>
          <div className="flex gap-3">
            <Button
              className={
                pathname === "/"
                  ? "bg-[#8b5cf6] text-white hover:bg-[#7c3aed]"
                  : "bg-gray-800 text-white border border-gray-700 hover:bg-gray-700"
              }
              onClick={() => router.push("/")}
            >
              Yeni Deneme Girişi
            </Button>
            <Button
              className={
                pathname === "/analiz"
                  ? "bg-[#8b5cf6] text-white hover:bg-[#7c3aed]"
                  : "bg-gray-800 text-white border border-gray-700 hover:bg-gray-700"
              }
              onClick={() => router.push("/analiz")}
            >
              Detaylı Analiz
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* TYT/AYT Seçimi */}
        <div className="mb-6 flex items-center gap-4">
          <Label htmlFor="exam-type-select">Sınav Türü</Label>
          <Select value={selectedExamType} onValueChange={setSelectedExamType}>
            <SelectTrigger id="exam-type-select" className="border-gray-700 bg-gray-800 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-gray-700 bg-gray-800">
              <SelectItem value="TYT">TYT</SelectItem>
              <SelectItem value="AYT">AYT</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Net Değişim Grafiği veya uyarı */}
        {hasData ? (
          <Card className="mb-8 border-gray-800 bg-gray-900">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Net Değişim Grafiği</CardTitle>
              <div className="w-48">
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="border-gray-700 bg-gray-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-gray-700 bg-gray-800">
                    {subjects.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={netScoreData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <XAxis dataKey="ay" axisLine={true} tickLine={false} padding={{ left: 30, right: 30 }} />
                    <YAxis axisLine={true} tickLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="net" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6' }}>
                      <LabelList dataKey="net" position="top" fontSize={14} fill="#fff" />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-8 border-gray-800 bg-gray-900">
            <CardContent>
              <div className="py-16 text-center text-lg text-gray-400">Henüz bu alanda deneme yok.</div>
            </CardContent>
          </Card>
        )}
        <Card className="border-gray-800 bg-gray-900 mb-8">
          <CardHeader>
            <CardTitle>Detaylı Analiz</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Ders ve alt-ders seçimleri */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="w-64">
                <Label htmlFor="main-subject-select">Ders</Label>
                <Select value={selectedMainSubject} onValueChange={v => { setSelectedMainSubject(v); setSelectedSubSubject(""); }}>
                  <SelectTrigger id="main-subject-select" className="border-gray-700 bg-gray-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-gray-700 bg-gray-800">
                    {mainSubjects.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {subSubjects[selectedMainSubject] && (
                <div className="w-64">
                  <Label htmlFor="sub-subject-select">Alt Ders</Label>
                  <Select value={selectedSubSubject} onValueChange={setSelectedSubSubject}>
                    <SelectTrigger id="sub-subject-select" className="border-gray-700 bg-gray-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-gray-700 bg-gray-800">
                      {(subSubjects[selectedMainSubject] as string[]).map((s: string) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {/* Zorluk Seviyeleri Bar Chart */}
            <div className="mb-8">
              <div className="font-semibold text-lg mb-1">Zorluk Seviyeleri</div>
              <div className="text-gray-400 text-sm mb-2">Yanlış ve Boş Soruların Zorluk Seviyelerine Göre Dağılımları</div>
              {loading ? (
                <div className="w-full h-56 flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" /></div>
              ) : difficultyDist.length === 0 ? (
                <div className="w-full h-56 flex items-center justify-center text-gray-400">Veri bulunamadı</div>
              ) : (
                <div className="w-full h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={difficultyDist} layout="vertical">
                      <XAxis type="number" allowDecimals={false} hide />
                      <YAxis dataKey="name" type="category" width={120} />
                      <RechartsTooltip />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            {/* Hata Türleri Donut Chart */}
            <div className="mb-8">
              <div className="font-semibold text-lg mb-1">Hata Türleri</div>
              <div className="text-gray-400 text-sm mb-2">Yanlış ve Boş Soruların Hata Türlerine Göre Dağılımları</div>
              {loading ? (
                <div className="w-full h-56 flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" /></div>
              ) : errorTypeDist.length === 0 ? (
                <div className="w-full h-56 flex items-center justify-center text-gray-400">Veri bulunamadı</div>
              ) : (
                <div className="w-full h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={errorTypeDist}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {errorTypeDist.map((entry, idx) => (
                          <Cell key={entry.name} fill={["#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#f3e8ff"][idx % 5]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            {/* Alt Kazanımlar Ters Bar Chart */}
            <div className="mb-8">
              <div className="font-semibold text-lg mb-1">Alt Kazanımlar</div>
              <div className="text-gray-400 text-sm mb-2">Yanlış ve Boş Soruların Alt Kazanımlara Göre Dağılımları</div>
              {loading ? (
                <div className="w-full h-56 flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" /></div>
              ) : subAchievementDist.length === 0 ? (
                <div className="w-full h-56 flex items-center justify-center text-gray-400">Veri bulunamadı</div>
              ) : (
                <div className="w-full h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subAchievementDist} layout="vertical">
                      <XAxis type="number" allowDecimals={false} hide />
                      <YAxis dataKey="name" type="category" width={180} />
                      <RechartsTooltip />
                      <Bar dataKey="value" fill="#a78bfa" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Button variant="outline" onClick={() => window.history.back()} className="border-gray-700">Geri Dön</Button>
      </main>
    </div>
  )
} 