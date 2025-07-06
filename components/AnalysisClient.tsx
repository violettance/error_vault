"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { getQuestionAnalyses, getQuestionAnalysesByUser } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartContainer } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, ResponsiveContainer, LabelList } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PieChart, Pie, Cell } from "recharts";
import { Tooltip as RechartsTooltip } from "recharts";

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
];

export default function AnalysisClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedExamType, setSelectedExamType] = useState<string>("TYT");
  const [selectedSubject, setSelectedSubject] = useState<string>("Tümü");

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
  const [selectedSubSubject, setSelectedSubSubject] = useState<string>("all");

  // Alt ders seçenekleri için helper function
  const getSubSubjectOptions = (mainSubject: string) => {
    const options = subSubjects[mainSubject] || [];
    return [
      { label: "Tümü", value: "all" },
      ...options.map(sub => ({ label: sub, value: sub }))
    ];
  };

  // Analiz verileri için state
  const [difficultyDist, setDifficultyDist] = useState<any[]>([]);
  const [errorTypeDist, setErrorTypeDist] = useState<any[]>([]);
  const [subAchievementDist, setSubAchievementDist] = useState<any[]>([]);

  useEffect(() => {
    async function fetchAnalyses() {
      setLoading(true);
      setError(null);
      
      // Fetch all question analyses for the demo user
      const result = await getQuestionAnalysesByUser('demo_user');
      if (result.success) {
        setAnalyses(result.data || []);
      } else {
        setError(result.error || "Analizler alınamadı.");
      }
      setLoading(false);
    }
    fetchAnalyses();
  }, []);

  // Aggregate analizler: filtrele ve chart verilerini hazırla
  useEffect(() => {
    if (analyses.length === 0) return;

    // Filtreleme: Ana ders ve alt ders seçimine göre
    let filteredAnalyses = analyses;
    
    // Ana ders filtresi - ana dersi alt derslere eşleştir
    if (selectedMainSubject) {
      filteredAnalyses = filteredAnalyses.filter(analysis => {
        // Ana ders seçimine göre hangi alt dersleri dahil edeceğimizi belirle
        if (selectedMainSubject === "Türkçe") {
          return analysis.subject === "Türkçe";
        } else if (selectedMainSubject === "Temel Matematik") {
          return ["Matematik", "Geometri"].includes(analysis.subject);
        } else if (selectedMainSubject === "Fen Bilimleri") {
          return ["Fizik", "Kimya", "Biyoloji"].includes(analysis.subject);
        } else if (selectedMainSubject === "Sosyal Bilimler") {
          return ["Tarih", "Coğrafya", "Felsefe", "Din"].includes(analysis.subject);
        }
        return false;
      });
    }

    // Alt ders filtresi - seçili alt ders varsa sadece o alt dersi göster
    if (selectedSubSubject && selectedSubSubject !== "all") {
      filteredAnalyses = filteredAnalyses.filter(analysis => {
        return analysis.subject === selectedSubSubject;
      });
    }

    // Zorluk seviyeleri dağılımı
    const difficultyGroups = filteredAnalyses.reduce((acc, analysis) => {
      const level = analysis.difficulty_level || 'Bilinmiyor';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const difficultyData = ['Kolay', 'Orta', 'Zor'].map(level => ({
      level,
      count: difficultyGroups[level] || 0
    }));

    // Hata türleri dağılımı
    const errorGroups = filteredAnalyses.reduce((acc, analysis) => {
      const errorType = analysis.error_type || 'Bilinmiyor';
      acc[errorType] = (acc[errorType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorData = Object.entries(errorGroups).map(([type, count]) => ({
      type,
      count
    }));

    // Alt kazanımlar dağılımı
    const achievementGroups = filteredAnalyses.reduce((acc, analysis) => {
      const achievement = analysis.sub_achievement || 'Bilinmiyor';
      // Uzun metinleri kısalt
      const shortAchievement = achievement.length > 50 
        ? achievement.substring(0, 50) + '...' 
        : achievement;
      acc[shortAchievement] = (acc[shortAchievement] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const achievementData = Object.entries(achievementGroups)
      .map(([achievement, count]) => ({
        achievement,
        count
      }))
      .sort((a, b) => (b.count as number) - (a.count as number)) // En çok olandan aza sırala
      .slice(0, 10); // En fazla 10 tane göster

    setDifficultyDist(difficultyData);
    setErrorTypeDist(errorData);
    setSubAchievementDist(achievementData);
  }, [analyses, selectedMainSubject, selectedSubSubject]);

  // Ana ders değiştiğinde alt ders seçimini sıfırla
  useEffect(() => {
    setSelectedSubSubject("all");
  }, [selectedMainSubject]);

  return (
    <div className="space-y-6">
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
                <Select value={selectedMainSubject} onValueChange={v => { setSelectedMainSubject(v); setSelectedSubSubject("all"); }}>
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
                      {getSubSubjectOptions(selectedMainSubject).map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {/* Zorluk Seviyeleri Bar Chart */}
            <div className="mb-8">
              <div className="font-semibold text-lg mb-1">Zorluk Seviyeleri</div>
              <div className="text-gray-400 text-sm mb-2">
                Yanlış ve Boş Soruların Zorluk Seviyelerine Göre Dağılımları
                {selectedSubSubject && (
                  <span className="ml-2 text-[#8b5cf6]">({selectedSubSubject})</span>
                )}
              </div>
              {loading ? (
                <div className="w-full h-56 flex items-center justify-center">
                  <Loader2 className="animate-spin text-gray-400" />
                </div>
              ) : difficultyDist.length === 0 ? (
                <div className="w-full h-56 flex items-center justify-center text-gray-400">
                  Veri bulunamadı
                </div>
              ) : (
                <div className="w-full h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={difficultyDist} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <XAxis dataKey="level" />
                      <YAxis allowDecimals={false} />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: '#1f2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="count" position="top" fontSize={12} fill="#fff" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            {/* Hata Türleri Donut Chart */}
            <div className="mb-8">
              <div className="font-semibold text-lg mb-1">Hata Türleri</div>
              <div className="text-gray-400 text-sm mb-2">
                Yanlış ve Boş Soruların Hata Türlerine Göre Dağılımları
                {selectedSubSubject && (
                  <span className="ml-2 text-[#8b5cf6]">({selectedSubSubject})</span>
                )}
              </div>
              {loading ? (
                <div className="w-full h-56 flex items-center justify-center">
                  <Loader2 className="animate-spin text-gray-400" />
                </div>
              ) : errorTypeDist.length === 0 ? (
                <div className="w-full h-56 flex items-center justify-center text-gray-400">
                  Veri bulunamadı
                </div>
              ) : (
                <div className="w-full h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={errorTypeDist}
                        dataKey="count"
                        nameKey="type"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {errorTypeDist.map((entry, idx) => (
                          <Cell 
                            key={entry.type} 
                            fill={[
                              "#8b5cf6", "#a78bfa", "#c4b5fd", 
                              "#ddd6fe", "#f3e8ff", "#e879f9"
                            ][idx % 6]} 
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: '#1f2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            {/* Alt Kazanımlar Horizontal Bar Chart */}
            <div className="mb-8">
              <div className="font-semibold text-lg mb-1">Alt Kazanımlar</div>
              <div className="text-gray-400 text-sm mb-2">
                Yanlış ve Boş Soruların Alt Kazanımlara Göre Dağılımları
                {selectedSubSubject && (
                  <span className="ml-2 text-[#8b5cf6]">({selectedSubSubject})</span>
                )}
              </div>
              {loading ? (
                <div className="w-full h-56 flex items-center justify-center">
                  <Loader2 className="animate-spin text-gray-400" />
                </div>
              ) : subAchievementDist.length === 0 ? (
                <div className="w-full h-56 flex items-center justify-center text-gray-400">
                  Veri bulunamadı
                </div>
              ) : (
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={subAchievementDist} 
                      layout="vertical" 
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis 
                        dataKey="achievement" 
                        type="category" 
                        width={200}
                        tick={{ fontSize: 12 }}
                      />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: '#1f2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                      <Bar dataKey="count" fill="#a78bfa" radius={[0, 4, 4, 0]}>
                        <LabelList dataKey="count" position="right" fontSize={12} fill="#fff" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
    </div>
  );
} 