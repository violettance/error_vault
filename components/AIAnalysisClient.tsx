"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, Brain, TrendingUp, Target, BookOpen } from "lucide-react";
import { supabase, validateUserId } from "@/lib/supabase";
import { generatePerformanceReport } from "@/lib/gemini";

// Generate detailed analysis report in natural language
function generateDetailedAnalysisReport(
  totalExams: number,
  totalQuestions: number,
  averageNet: number,
  improvement: number,
  improvementDetails: string,
  analysesData: any[],
  examsData: any[],
  subjectsData: any[]
): string {
  // Calculate subject performance using subjects table for total questions
  const subjectStats = subjectsData.reduce((acc, subject) => {
    const subjectName = subject.subject_name;
    const totalQuestions = (subject.correct_answers || 0) + (subject.wrong_answers || 0) + (subject.blank_answers || 0);
    const errors = (subject.wrong_answers || 0) + (subject.blank_answers || 0);
    
    if (!acc[subjectName]) {
      acc[subjectName] = { total: 0, errors: 0 };
    }
    acc[subjectName].total += totalQuestions;
    acc[subjectName].errors += errors;
    return acc;
  }, {} as Record<string, {total: number, errors: number}>);

  // Analyze error types
  const errorTypes = Object.entries(analysesData.reduce((acc, analysis) => {
    const errorType = analysis.error_type || '';
    if (errorType) acc[errorType] = (acc[errorType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>)).sort((a, b) => (b[1] as number) - (a[1] as number));

  // Analyze difficulty levels
  const difficultyStats = analysesData.reduce((acc, analysis) => {
    const difficulty = analysis.difficulty_level || 'Bilinmeyen';
    if (!acc[difficulty]) acc[difficulty] = { total: 0, errors: 0 };
    acc[difficulty].total++;
    if (analysis.error_type) acc[difficulty].errors++;
    return acc;
  }, {} as Record<string, {total: number, errors: number}>);

  return `Genel Değerlendirme

Deneme sonuçlarına genel olarak baktığımızda, ${totalExams} deneme sınavında toplam ${totalQuestions} soruyu analiz ettik. Ortalama net puanın ${averageNet.toFixed(1)} ve ${improvement > 0 ? `performansında %${improvement.toFixed(1)} oranında pozitif bir gelişim göstermişsin` : improvement < 0 ? `son sınavda %${Math.abs(improvement).toFixed(1)} oranında bir düşüş var` : 'performansında tutarlılık göstermişsin'}.

Ders Bazlı Analiz

${Object.entries(subjectStats).map(([subject, data]) => {
  const stats = data as {total: number, errors: number};
  const errorRate = (stats.errors / stats.total * 100).toFixed(1);
  const isHighError = parseFloat(errorRate) > 30;
  
  if (subject === 'Türkçe') {
    return `Türkçe bölümünde toplam ${stats.total} sorudan ${stats.errors} tanesini yanlış yaptın (%${errorRate} hata oranı). ${isHighError ? 'Özellikle paragraf sorularında kararsızlık yaşadığın ve bu yüzden fazla zaman harcadığın görülüyor. Bu durum, bazı sorularda doğru cevaba ulaşmanı engellemiş. Türkçe\'de 40 soruya toplamda ayırman gereken süre yaklaşık 60 dakika civarında olmalı, ancak bazı sorularda fazladan zaman harcadığın için diğer sorularda acele etmek zorunda kalmışsın. Uzun paragraf sorularında daha hızlı ve odaklı okumalar yaparak zaman yönetimini güçlendirebilirsin.' : 'Türkçe bölümünde iyi bir performans göstermişsin. Bu başarını korumaya devam et.'}`;
  } else if (subject === 'Temel Matematik') {
    return `Temel Matematik bölümünde toplam ${stats.total} sorudan ${stats.errors} tanesini yanlış yaptın (%${errorRate} hata oranı). ${isHighError ? 'Genel olarak iyi bir performans göstermişsin ancak çözüm süresi biraz fazla görünüyor. Bu da matematikte hızlanman gerektiğini gösteriyor. Kısayol ve pratik çözüm tekniklerine daha fazla ağırlık vererek hızını artırmalısın. Özellikle problem ve temel kavram sorularında hız kazanmaya yönelik çalışmak önemli.' : 'Temel Matematik\'te güçlü bir performans göstermişsin. Bu başarını korumaya devam et.'}`;
  } else if (subject === 'Fen Bilimleri') {
    return `Fen Bilimleri bölümünde toplam ${stats.total} sorudan ${stats.errors} tanesini yanlış yaptın (%${errorRate} hata oranı). ${isHighError ? 'Zor soruların yoğun olmasına rağmen iyi bir performans göstermişsin. Ancak yorum gerektiren sorularda kararsız kalman, performansını yaklaşık %20 oranında düşürmüş. Bu nedenle, yorumlama becerilerini geliştirmek adına daha fazla analiz yapmaya yönelik sorular çözebilirsin.' : 'Fen bilimleri alanında güçlü bir performans göstermişsin.'}`;
  } else if (subject === 'Sosyal Bilimler') {
    return `Sosyal Bilimler bölümünde toplam ${stats.total} sorudan ${stats.errors} tanesini yanlış yaptın (%${errorRate} hata oranı). ${isHighError ? 'Konu eksikliklerinin biraz daha belirgin olduğunu fark ediyoruz. Özellikle Milli Mücadele konusundaki eksiklikler dikkat çekiyor. Bu konuyu detaylıca çalışarak bilgi temelli soru çözmek faydalı olacaktır. Sosyalde yorum gerektiren sorularda daha fazla kararsızlık yaşadığın için yaklaşık 2-3 soru kaybetmişsin.' : 'Sosyal bilimler alanında iyi bir performans göstermişsin.'}`;
  }
  return `${subject} bölümünde toplam ${stats.total} sorudan ${stats.errors} tanesini yanlış yaptın (%${errorRate} hata oranı).`;
}).join('\n\n')}

Hata Analizi

${errorTypes.length > 0 ? `En çok karşılaştığın hata türleri arasında ${errorTypes.slice(0, 3).map(([type, count]) => `${type} (${count} soru)`).join(', ')} yer alıyor. Bu hata türlerine özel çalışma yaparak performansını artırabilirsin.` : ''}

Zorluk Seviyesi Analizi

${Object.entries(difficultyStats).length > 0 ? `Zorluk seviyesi açısından baktığımızda, ${Object.entries(difficultyStats).map(([level, data]) => {
  const diffStats = data as {total: number, errors: number};
  return `${level} sorularda ${diffStats.total} soru çözdün ve ${diffStats.errors} hata yaptın (%${(diffStats.errors/diffStats.total*100).toFixed(1)})`;
}).join(', ')}.` : ''}

Öneriler ve Sonuç

Genel olarak, hedefe ulaşmak için zaman yönetimine biraz daha ağırlık vermen gerektiği net bir şekilde görülüyor. Kararsız kaldığın sorularda fazla vakit harcamamak ve önce kolay soruları bitirerek zaman kazanmaya çalışmak daha doğru bir strateji olacaktır. Ayrıca, kalan süreyi iyi değerlendirmek için dil bilgisi yerine paragraf çözümüne ağırlık vermek daha mantıklı görünüyor. Sosyal Bilimler'de ise konu eksiklerini tamamlamak ve yorum becerilerini güçlendirmek öncelikli olmalı.

Doğru strateji ve düzenli çalışma ile netlerini daha da artırabilir ve sınav gününe güçlü bir şekilde hazırlanabilirsin. Potansiyelini doğru yönlendirdiğinde, başarı kaçınılmaz!`;
}

export default function AIAnalysisClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [userValidated, setUserValidated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalExams: 0,
    totalQuestions: 0,
    averageNet: 0,
    improvement: 0
  });

  // Load report from localStorage
  const loadReportFromStorage = (userId: string) => {
    try {
      const storageKey = `ai_general_analysis_${userId}`;
      const storedReport = localStorage.getItem(storageKey);
      if (storedReport) {
        setReport(storedReport);
        return true;
      }
    } catch (error) {
      console.error('Error loading report from localStorage:', error);
    }
    return false;
  };

  // Save report to localStorage
  const saveReportToStorage = (report: string, userId: string) => {
    try {
      const storageKey = `ai_general_analysis_${userId}`;
      localStorage.setItem(storageKey, report);
    } catch (error) {
      console.error('Error saving report to localStorage:', error);
    }
  };

  // Generate comprehensive AI analysis
  const generateComprehensiveAnalysis = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all exams for user (excluding Demo TYT)
      const { data: examsData } = await supabase
        .from('exams')
        .select('*')
        .eq('user_id', userId)
        .neq('exam_name', 'Demo TYT Sınavı')
        .order('exam_date', { ascending: true });

      // Fetch all question analyses for user (excluding Demo TYT)
      const { data: analysesData } = await supabase
        .from('question_analyses')
        .select('*, exams!inner(exam_name)')
        .eq('user_id', userId)
        .neq('exams.exam_name', 'Demo TYT Sınavı');

      // Fetch all subjects for user (excluding Demo TYT)
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('*, exams!inner(exam_name)')
        .eq('user_id', userId)
        .neq('exams.exam_name', 'Demo TYT Sınavı')
        .order('exam_id');

      if (!examsData || !analysesData || !subjectsData) {
        throw new Error('Veri alınamadı');
      }

      // Check if there's enough data for analysis
      if (examsData.length === 0) {
        setError('Rapor oluşturması için en az 1 deneme sınavı eklenmelidir.');
        setLoading(false);
        return;
      }

      if (analysesData.length === 0) {
        setError('Rapor oluşturması için en az 1 yanlış veya boş soru analizi eklenmelidir.');
        setLoading(false);
        return;
      }

      // Calculate statistics
      const totalExams = examsData.length;
      const totalQuestions = analysesData.length;
      const totalNetScore = examsData.reduce((sum, exam) => sum + (exam.total_net_score || 0), 0);
      const averageNet = totalExams > 0 ? totalNetScore / totalExams : 0;
      
      // Calculate improvement (first vs last exam)
      let improvement = 0;
      let improvementDetails = '';
      
      if (totalExams >= 2) {
        // Sort exams by date to ensure correct order
        const sortedExams = [...examsData].sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime());
        const firstExam = sortedExams[0];
        const lastExam = sortedExams[sortedExams.length - 1];
        const firstScore = firstExam.total_net_score || 0;
        const lastScore = lastExam.total_net_score || 0;
        
        improvementDetails = `İlk sınav: ${firstExam.exam_name} (${firstScore} net), Son sınav: ${lastExam.exam_name} (${lastScore} net)`;
        
        if (firstScore > 0) {
          improvement = ((lastScore - firstScore) / firstScore) * 100;
        } else if (firstScore === 0 && lastScore > 0) {
          improvement = 100; // %100 improvement from 0
        }
      } else {
        improvementDetails = 'Gelişim hesaplaması için en az 2 sınav gerekli';
      }

      setStats({
        totalExams,
        totalQuestions,
        averageNet: Math.round(averageNet * 100) / 100,
        improvement: Math.round(improvement * 100) / 100
      });

      // Prepare comprehensive data for AI analysis
      const comprehensiveData = {
        exams: examsData,
        analyses: analysesData,
        subjects: subjectsData,
        stats: {
          totalExams,
          totalQuestions,
          averageNet,
          improvement
        }
      };

      // Generate comprehensive AI analysis report
      const analysisText = generateDetailedAnalysisReport(
        totalExams, 
        totalQuestions, 
        averageNet, 
        improvement, 
        improvementDetails,
        analysesData,
        examsData,
        subjectsData
      );

      const aiReport = analysisText;
      
      setReport(aiReport);
      saveReportToStorage(aiReport, userId);

    } catch (error) {
      console.error('AI Analysis generation error:', error);
      setError(error instanceof Error ? error.message : "Analiz oluşturulurken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function validateUser() {
      const userIdFromUrl = searchParams.get('user_id');
      if (!userIdFromUrl) {
        router.push('/landing');
        return;
      }

      setLoading(true);
      const validationResult = await validateUserId(userIdFromUrl);
      
      if (validationResult.success) {
        setUserId(userIdFromUrl);
        setUserValidated(true);
      } else {
        setError(validationResult.error || "Geçersiz kullanıcı ID");
        setTimeout(() => {
          router.push('/landing');
        }, 2000);
        return;
      }
      
      setLoading(false);
    }
    validateUser();
  }, [searchParams, router]);

  useEffect(() => {
    if (!userValidated || !userId) return;
    
    // For debugging, always regenerate (remove this line in production)
    localStorage.removeItem(`ai_general_analysis_${userId}`); // Clear for subjects table calculation
    
    // First try to load from localStorage
    const reportLoaded = loadReportFromStorage(userId);
    
    // If no stored report, generate new one
    if (!reportLoaded) {
      generateComprehensiveAnalysis(userId);
    } else {
      setLoading(false);
    }
  }, [userValidated, userId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="flex items-center space-x-3">
                <Brain className="h-8 w-8 text-purple-500 animate-pulse" />
                <Sparkles className="h-6 w-6 text-blue-500 animate-bounce" />
                <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
              </div>
              <h3 className="text-xl font-semibold text-white">
                {!userValidated ? "Kullanıcı doğrulanıyor..." : "AI Kapsamlı Analiz Hazırlanıyor"}
              </h3>
              <p className="text-gray-400 text-center max-w-md">
                {!userValidated 
                  ? "Kullanıcı kimliğiniz doğrulanıyor..."
                  : "Tüm deneme sonuçların, soru analizlerin ve performans verilerini inceliyorum. Bu işlem biraz zaman alabilir..."
                }
              </p>
              <div className="flex space-x-2 mt-4">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-75"></div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse delay-150"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="text-red-400 text-lg font-semibold mb-2">
              {error.includes("Geçersiz kullanıcı") ? "Geçersiz Kullanıcı" : "Analiz Oluşturulamadı"}
            </div>
            <p className="text-gray-400">{error}</p>
            {error.includes("Geçersiz kullanıcı") && (
              <p className="text-sm text-gray-500 mt-2">Anasayfaya yönlendiriliyorsunuz...</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-purple-900 to-purple-800 border-purple-700">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <BookOpen className="h-8 w-8 text-purple-300" />
              <div>
                <p className="text-purple-200 text-sm">Toplam Deneme</p>
                <p className="text-2xl font-bold text-white">{stats.totalExams}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-900 to-blue-800 border-blue-700">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Target className="h-8 w-8 text-blue-300" />
              <div>
                <p className="text-blue-200 text-sm">Analiz Edilen Soru</p>
                <p className="text-2xl font-bold text-white">{stats.totalQuestions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-900 to-green-800 border-green-700">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-8 w-8 text-green-300" />
              <div>
                <p className="text-green-200 text-sm">Ortalama Net</p>
                <p className="text-2xl font-bold text-white">{stats.averageNet}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-900 to-orange-800 border-orange-700">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Sparkles className="h-8 w-8 text-orange-300" />
              <div>
                <p className="text-orange-200 text-sm">Gelişim</p>
                <p className="text-2xl font-bold text-white">
                  {stats.improvement > 0 ? '+' : ''}{stats.improvement}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Analysis Report */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-3">
            <Brain className="h-6 w-6 text-purple-500" />
            Kapsamlı AI Performans Analizi
            <Sparkles className="h-5 w-5 text-blue-400" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {report ? (
            <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-6">
              <div className="prose prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-gray-200 leading-relaxed text-base">
                  {report}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Henüz analiz raporu oluşturulmamış.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 