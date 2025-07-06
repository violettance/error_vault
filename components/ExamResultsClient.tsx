"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getQuestionAnalysesByUser, validateUserId } from "@/lib/supabase";
import { generatePerformanceReport } from "@/lib/gemini";
import { Loader2, FileText, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  PieChart, 
  Pie, 
  Cell,
  LabelList
} from "recharts";
import { supabase } from "@/lib/supabase";

export default function ExamResultsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const examIdFromUrl = searchParams.get("exam_id");
  const userId = searchParams.get("user_id");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userIdValid, setUserIdValid] = useState<boolean>(false);
  const [isValidatingUser, setIsValidatingUser] = useState<boolean>(true);
  const [selectedExamId, setSelectedExamId] = useState<string>(examIdFromUrl || "");
  const [exams, setExams] = useState<Array<{id: string, name: string}>>([]);
  const [chartData, setChartData] = useState<any>({
    difficulty: [],
    errorType: [],
    subject: [],
    status: [],
    selectivity: [],
    learningLevel: [],
    questionType: [],
    questionFormat: [],
    solutionStrategy: [],
    subAchievement: []
  });
  const [selectedExamName, setSelectedExamName] = useState<string>("");
  const [aiReport, setAiReport] = useState<string>("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [totalQuestions, setTotalQuestions] = useState(0);

  // User ID validation
  useEffect(() => {
    async function validateUser() {
      if (!userId) {
        router.push('/landing')
        return
      }

      const validation = await validateUserId(userId)
      
      if (!validation.success) {
        toast({
          title: "Geçersiz Erişim",
          description: "Geçersiz User ID. Ana sayfaya yönlendiriliyorsunuz.",
          variant: "destructive",
        })
        router.push('/landing')
        return
      }

      setUserIdValid(true)
      setIsValidatingUser(false)
    }

    validateUser()
  }, [userId, router, toast])

  // Initialize data
  useEffect(() => {
    if (!userIdValid) return
    
    let mounted = true;
    
    async function initializeData() {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all exams for current user (not just those with analyses)
        const { data: examsData } = await supabase
          .from('exams')
          .select('id, exam_name')
          .eq('user_id', userId!)
          .order('exam_date', { ascending: false });
        
        const examsList: Array<{id: string, name: string}> = (examsData || []).map(exam => ({
          id: exam.id,
          name: exam.exam_name
        }));
        
        if (!mounted) return;
        
        setExams(examsList);
        
        // Set initial exam selection
        if (examIdFromUrl && examsList.some(exam => exam.id === examIdFromUrl)) {
          setSelectedExamId(examIdFromUrl);
          const selectedExam = examsList.find(exam => exam.id === examIdFromUrl);
          setSelectedExamName(selectedExam?.name || "");
        } else if (examsList.length > 0) {
          setSelectedExamId(examsList[0].id);
          setSelectedExamName(examsList[0].name);
        }
        
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Bir hata oluştu");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    
    initializeData();
    
    return () => {
      mounted = false;
    };
  }, [userIdValid, userId]);

  // Update chart data when exam selection changes
  useEffect(() => {
    let mounted = true;
    
    async function updateChartData() {
      if (!selectedExamId) {
        setChartData({
          difficulty: [],
          errorType: [],
          subject: [],
          status: [],
          selectivity: [],
          learningLevel: [],
          questionType: [],
          questionFormat: [],
          solutionStrategy: [],
          subAchievement: []
        });
        setAiReport(""); // Clear AI report when no exam selected
        return;
      }
      
      try {
        const analysesResult = await getQuestionAnalysesByUser(userId!);
        if (!analysesResult.success) return;
        
        const filteredAnalyses = (analysesResult.data || []).filter((a: any) => a.exam_id === selectedExamId);
        
        if (!mounted) return;
        
        // Generate chart data
        const newChartData = {
          difficulty: generateDifficultyData(filteredAnalyses),
          errorType: generateErrorTypeData(filteredAnalyses),
          subject: generateSubjectData(filteredAnalyses),
          status: generateStatusData(filteredAnalyses),
          selectivity: generateSelectivityData(filteredAnalyses),
          learningLevel: generateLearningLevelData(filteredAnalyses),
          questionType: generateQuestionTypeData(filteredAnalyses),
          questionFormat: generateQuestionFormatData(filteredAnalyses),
          solutionStrategy: generateSolutionStrategyData(filteredAnalyses),
          subAchievement: generateSubAchievementData(filteredAnalyses)
        };
        
        setChartData(newChartData);
        setTotalQuestions(filteredAnalyses.length);
        
        // Check if there's a cached report for this exam
        const cacheKey = `exam_report_${selectedExamId}`;
        const cachedReport = localStorage.getItem(cacheKey);
        
        if (cachedReport) {
          const parsedCache = JSON.parse(cachedReport);
          // Check if cache is still valid (24 hours)
          const cacheTime = new Date(parsedCache.timestamp);
          const now = new Date();
          const hoursDiff = (now.getTime() - cacheTime.getTime()) / (1000 * 60 * 60);
          
          if (hoursDiff < 24) {
            setAiReport(parsedCache.report);
          } else {
            setAiReport(""); // Clear expired cache
          }
        } else {
          setAiReport(""); // Clear report if no cache
        }
        
      } catch (err) {
        console.error('Error updating chart data:', err);
      }
    }
    
    updateChartData();
    
    return () => {
      mounted = false;
    };
  }, [selectedExamId]);

  // Chart data generation functions
  const generateDifficultyData = (analyses: any[]) => {
    const groups = analyses.reduce((acc, analysis) => {
      const level = analysis.difficulty_level || 'Bilinmiyor';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return ['Kolay', 'Orta', 'Zor'].map(level => ({
      level,
      count: groups[level] || 0
    }));
  };

  const generateErrorTypeData = (analyses: any[]) => {
    const groups = analyses.reduce((acc, analysis) => {
      const type = analysis.error_type || 'Bilinmiyor';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(groups).map(([type, count]) => ({ type, count }));
  };

     const generateSubjectData = (analyses: any[]) => {
     // Only show wrong and blank answers for "Yanlış Dağılımı"
     const filteredAnalyses = analyses.filter(analysis => 
       analysis.question_status === 'Yanlış' || analysis.question_status === 'Boş'
     );
     
     const groups = filteredAnalyses.reduce((acc, analysis) => {
       const subject = analysis.subject || 'Bilinmiyor';
       acc[subject] = (acc[subject] || 0) + 1;
       return acc;
     }, {} as Record<string, number>);

     return Object.entries(groups).map(([subject, count]) => ({ subject, count }));
   };

  const generateStatusData = (analyses: any[]) => {
    const groups = analyses.reduce((acc, analysis) => {
      const status = analysis.question_status || 'Bilinmiyor';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(groups).map(([status, count]) => ({ status, count }));
  };

  const generateSelectivityData = (analyses: any[]) => {
    const groups = analyses.reduce((acc, analysis) => {
      const level = analysis.selectivity || 'Bilinmiyor';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return ['Yüksek', 'Orta', 'Düşük'].map(level => ({
      level,
      count: groups[level] || 0
    }));
  };

  const generateLearningLevelData = (analyses: any[]) => {
    const groups = analyses.reduce((acc, analysis) => {
      const level = analysis.learning_level || 'Bilinmiyor';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(groups).map(([level, count]) => ({ level, count }));
  };

  const generateQuestionTypeData = (analyses: any[]) => {
    const groups = analyses.reduce((acc, analysis) => {
      const type = analysis.question_type || 'Bilinmiyor';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(groups).map(([type, count]) => ({ type, count }));
  };

  const generateQuestionFormatData = (analyses: any[]) => {
    const groups = analyses.reduce((acc, analysis) => {
      const format = analysis.question_format || 'Bilinmiyor';
      acc[format] = (acc[format] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(groups).map(([format, count]) => ({ format, count }));
  };

  const generateSolutionStrategyData = (analyses: any[]) => {
    const groups = analyses.reduce((acc, analysis) => {
      const strategy = analysis.solution_strategy || 'Bilinmiyor';
      acc[strategy] = (acc[strategy] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(groups).map(([strategy, count]) => ({ strategy, count }));
  };

  const generateSubAchievementData = (analyses: any[]) => {
    const groups = analyses.reduce((acc, analysis) => {
      const achievement = analysis.sub_achievement || 'Bilinmiyor';
      // Uzun metinleri kısalt
      const shortAchievement = achievement.length > 30 ? achievement.substring(0, 30) + '...' : achievement;
      acc[shortAchievement] = (acc[shortAchievement] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(groups).map(([achievement, count]) => ({ achievement, count }));
  };

  // Generate AI Performance Report
  const generateAIReport = async () => {
    if (!selectedExamName || totalQuestions === 0) {
      setReportError("Rapor oluşturmak için bir deneme seçin ve veri yüklendiğinden emin olun");
      return;
    }

    setReportLoading(true);
    setReportError(null);
    setAiReport("");

    try {
      // Check if report exists in localStorage first
      const cacheKey = `exam_report_${selectedExamId}`;
      const cachedReport = localStorage.getItem(cacheKey);
      
      if (cachedReport) {
        const parsedCache = JSON.parse(cachedReport);
        // Check if cache is still valid (24 hours)
        const cacheTime = new Date(parsedCache.timestamp);
        const now = new Date();
        const hoursDiff = (now.getTime() - cacheTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          setAiReport(parsedCache.report);
          setReportLoading(false);
          return;
        }
      }

      // Get exam statistics from subjects table
      const { data: examStatsData } = await supabase
        .from('subjects')
        .select('subject_name, correct_answers, wrong_answers, blank_answers, net_score')
        .eq('exam_id', selectedExamId);

      const examStats = (examStatsData || []).map(stat => ({
        subject: stat.subject_name,
        correct: stat.correct_answers || 0,
        wrong: stat.wrong_answers || 0,
        blank: stat.blank_answers || 0,
        net: stat.net_score || 0
      }));

      // Get detailed question analyses
      const analysesResult = await getQuestionAnalysesByUser(userId!);
      let detailedAnalyses: Array<{subject: string, topic: string, sub_achievement: string, question_status: string, difficulty_level: string, error_type: string, solution_strategy: string, learning_level: string, selectivity: string}> = [];
      if (analysesResult.success) {
        detailedAnalyses = (analysesResult.data || [])
          .filter((a: any) => a.exam_id === selectedExamId)
          .map((a: any) => ({
            subject: a.subject,
            topic: a.topic,
            sub_achievement: a.sub_achievement,
            question_status: a.question_status,
            difficulty_level: a.difficulty_level,
            error_type: a.error_type,
            solution_strategy: a.solution_strategy,
            learning_level: a.learning_level,
            selectivity: a.selectivity
          }));
      }

      // Generate new report if not cached or cache expired
      const report = await generatePerformanceReport(selectedExamName, chartData, totalQuestions, examStats, detailedAnalyses);
      setAiReport(report);
      
      // Save to localStorage
      const cacheData = {
        report,
        timestamp: new Date().toISOString(),
        examId: selectedExamId,
        examName: selectedExamName
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      
    } catch (error) {
      console.error('AI Report generation error:', error);
      setReportError(error instanceof Error ? error.message : "Rapor oluşturulurken hata oluştu");
    } finally {
      setReportLoading(false);
    }
  };

  if (isValidatingUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Erişim kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  if (!userIdValid) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <span className="ml-2 text-lg">Analizler yükleniyor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-400 p-8">
        <p className="text-lg">{error}</p>
      </div>
    );
  }

  if (exams.length === 0) {
    return (
      <div className="text-center text-gray-400 p-8">
        <p className="text-lg">Henüz deneme sonucu bulunmuyor.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Exam Selection */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">
            Deneme Seçimi
            {selectedExamName && (
              <span className="text-sm text-gray-400 block mt-1 font-normal">
                Seçilen: {selectedExamName}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full max-w-md">
            <Label htmlFor="exam-select" className="text-white">Deneme</Label>
            <Select value={selectedExamId} onValueChange={(value) => {
              setSelectedExamId(value);
              const selectedExam = exams.find(exam => exam.id === value);
              setSelectedExamName(selectedExam?.name || "");
            }}>
              <SelectTrigger id="exam-select" className="border-gray-700 bg-gray-800">
                <SelectValue placeholder="Deneme seçin..." />
              </SelectTrigger>
              <SelectContent>
                {exams.map(exam => (
                  <SelectItem key={exam.id} value={exam.id}>
                    {exam.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      {selectedExamId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Difficulty Level Chart */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Zorluk Seviyeleri</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.difficulty} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
            </CardContent>
          </Card>

          {/* Error Type Chart */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Hata Türleri</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.errorType}
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
                      {chartData.errorType.map((entry: any, idx: number) => (
                        <Cell 
                          key={entry.type} 
                          fill={[
                            "#8b5cf6", "#a78bfa", "#c4b5fd", 
                            "#ddd6fe", "#ede9fe", "#f3f4f6"
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
            </CardContent>
          </Card>

          {/* Wrong Answer Distribution */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Yanlış Dağılımı</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.subject} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <XAxis dataKey="subject" />
                    <YAxis allowDecimals={false} />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="count" position="top" fontSize={12} fill="#fff" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Question Status */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Soru Durumu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.status}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {chartData.status.map((entry: any, idx: number) => (
                        <Cell 
                          key={entry.status} 
                          fill={["#ef4444", "#f97316"][idx % 2]} 
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
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Performance Report Section */}
      {selectedExamId && totalQuestions > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Performans Raporu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Button 
                  onClick={generateAIReport}
                  disabled={reportLoading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {reportLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Rapor Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Rapor Oluştur
                    </>
                  )}
                </Button>
                <span className="text-sm text-gray-400">
                  {totalQuestions} soru analizi üzerinden kişiselleştirilmiş rapor
                </span>
              </div>

              {reportError && (
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                  <p className="text-red-400">{reportError}</p>
                </div>
              )}

              {aiReport && (
                <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-6">
                  <div className="whitespace-pre-wrap text-gray-200 leading-relaxed text-base">
                    {aiReport}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 