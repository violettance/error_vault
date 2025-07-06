"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, Upload, X, Menu } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { supabase, testSupabaseConnection, saveExam, saveSubject, uploadImage, batchSaveQuestionAnalyses } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { v4 as uuidv4 } from "uuid"
import { Loader2, Brain, Eye, CheckCircle } from "lucide-react"
import { batchAnalyzeImages } from "@/lib/gemini"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useRouter, usePathname } from 'next/navigation'
import Header from "@/components/ui/header"

// Exam type configurations
const EXAM_CONFIGS = {
  TYT: {
    name: "TYT",
    subjects: {
      Türkçe: 40,
      "Temel Matematik": 40,
      "Sosyal Bilimler": 20,
      "Fen Bilimleri": 20,
    },
  },
  AYT: {
    name: "AYT",
    types: {
      SAY: {
        name: "Sayısal (SAY)",
        subjects: {
          Matematik: 40,
          Fizik: 14,
          Kimya: 13,
          Biyoloji: 13,
        },
      },
      EA: {
        name: "Eşit Ağırlık (EA)",
        subjects: {
          Matematik: 40,
          "Türk Dili ve Edebiyatı": 24,
          "Tarih-1": 10,
          "Coğrafya-1": 6,
        },
      },
      SÖZ: {
        name: "Sözel (SÖZ)",
        subjects: {
          "Türk Dili ve Edebiyatı": 24,
          "Tarih-1": 10,
          "Coğrafya-1": 6,
          "Tarih-2": 11,
          "Coğrafya-2": 11,
          "Felsefe Grubu (Psikoloji, Sosyoloji, Mantık)": 12,
          "Din Kültürü (ya da ek felsefe)": 6,
        },
      },
    },
  },
}

export default function Dashboard() {
  const { toast } = useToast()
  const [date, setDate] = useState<Date>(new Date())
  const [wrongAnswerFiles, setWrongAnswerFiles] = useState<File[]>([])
  const [blankAnswerFiles, setBlankAnswerFiles] = useState<File[]>([])
  const [examType, setExamType] = useState<string>("")
  const [aytType, setAytType] = useState<string>("")
  const [examName, setExamName] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "error">("checking")
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false)
  const [analysisProgress, setAnalysisProgress] = useState<number>(0)
  const [analysisProgressFake, setAnalysisProgressFake] = useState<number>(0)
  const [showAnalysisDialog, setShowAnalysisDialog] = useState<boolean>(false)
  const [lastSavedExamId, setLastSavedExamId] = useState<string | null>(null)
  const [analysisComplete, setAnalysisComplete] = useState<boolean>(false)
  const [analysisResults, setAnalysisResults] = useState<number>(0)
  const router = useRouter()
  const pathname = usePathname()

  // Sayfa yüklendiğinde Supabase bağlantısını test et
  useEffect(() => {
    async function checkConnection() {
      const result = await testSupabaseConnection()
      setConnectionStatus(result.success ? "connected" : "error")

      if (!result.success) {
        toast({
          title: "Veritabanı Bağlantı Hatası",
          description: "Veritabanına bağlanılamadı. Lütfen daha sonra tekrar deneyin.",
          variant: "destructive",
        })
      }
    }

    checkConnection()
  }, [toast])

  // Subject states - dynamic based on exam type
  const [subjects, setSubjects] = useState<Record<string, { correct: number; wrong: number; blank: number }>>({})

  // Get current exam configuration
  const getCurrentExamConfig = () => {
    if (examType === "TYT") {
      return EXAM_CONFIGS.TYT.subjects
    } else if (examType === "AYT" && aytType) {
      return EXAM_CONFIGS.AYT.types[aytType as keyof typeof EXAM_CONFIGS.AYT.types]?.subjects || {}
    }
    return {}
  }

  // Reset subjects when exam type changes
  useEffect(() => {
    const config = getCurrentExamConfig()
    const newSubjects: Record<string, { correct: number; wrong: number; blank: number }> = {}
    
    Object.keys(config).forEach(subject => {
      newSubjects[subject] = { correct: 0, wrong: 0, blank: 0 }
    })
    
    setSubjects(newSubjects)
  }, [examType, aytType])

  // Reset AYT type when exam type changes
  useEffect(() => {
    if (examType !== "AYT") {
      setAytType("")
    }
  }, [examType])

  const handleSubjectChange = (subject: string, field: "correct" | "wrong" | "blank", value: number) => {
    const currentConfig = getCurrentExamConfig()
    const maxQuestions = currentConfig[subject as keyof typeof currentConfig] || 0
    
    // Get current subject scores
    const currentSubject = subjects[subject as keyof typeof subjects] || { correct: 0, wrong: 0, blank: 0 }
    
    // Calculate what the new total would be
    const newSubject = { ...currentSubject, [field]: value }
    const newTotal = newSubject.correct + newSubject.wrong + newSubject.blank
    
    // Check if new total exceeds maximum
    if (newTotal > maxQuestions) {
      toast({
        title: "Soru Sayısı Aşıldı",
        description: `${subject} için toplam ${maxQuestions} soru olmalı. Şu anda toplam: ${newTotal}`,
        variant: "destructive",
      })
      return // Don't update if it exceeds the limit
    }
    
    setSubjects((prev) => ({
      ...prev,
      [subject]: newSubject,
    }))
  }

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "0") {
      e.target.value = ""
    }
  }

  const handleInputBlur = (
    e: React.FocusEvent<HTMLInputElement>,
    subject: string,
    field: "correct" | "wrong" | "blank",
  ) => {
    if (e.target.value === "") {
      handleSubjectChange(subject, field, 0)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'wrong' | 'blank') => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      // Check file size (max 10MB)
      const validFiles = selectedFiles.filter((file) => file.size <= 10 * 1024 * 1024)

      if (validFiles.length !== selectedFiles.length) {
        toast({
          title: "Dosya boyutu çok büyük",
          description: "10MB'dan büyük dosyalar atlandı",
          variant: "destructive",
        })
      }

      if (fileType === 'wrong') {
        setWrongAnswerFiles((prev) => [...prev, ...validFiles])
      } else if (fileType === 'blank') {
        setBlankAnswerFiles((prev) => [...prev, ...validFiles])
      }
    }
  }

  const removeFile = (index: number, fileType: 'wrong' | 'blank') => {
    if (fileType === 'wrong') {
      setWrongAnswerFiles(wrongAnswerFiles.filter((_, i) => i !== index))
    } else if (fileType === 'blank') {
      setBlankAnswerFiles(blankAnswerFiles.filter((_, i) => i !== index))
    }
  }

  const validateForm = () => {
    if (!examType) {
      toast({
        title: "Hata",
        description: "Lütfen sınav türünü seçin",
        variant: "destructive",
      })
      return false
    }

    if (examType === "AYT" && !aytType) {
      toast({
        title: "Hata",
        description: "Lütfen AYT sınav türünü seçin",
        variant: "destructive",
      })
      return false
    }

    if (!date) {
      toast({
        title: "Hata",
        description: "Lütfen sınav tarihini seçin",
        variant: "destructive",
      })
      return false
    }

    if (!examName || examName.trim() === "") {
      toast({
        title: "Hata",
        description: "Lütfen deneme adını girin",
        variant: "destructive",
      })
      return false
    }

    // Check if at least one subject has data
    const hasSubjectData = Object.values(subjects).some(
      (subject) => subject.correct > 0 || subject.wrong > 0 || subject.blank > 0,
    )

    if (!hasSubjectData) {
      toast({
        title: "Hata",
        description: "En az bir ders için sonuç girmelisiniz",
        variant: "destructive",
      })
      return false
    }

    // Validate that each subject has exactly the correct number of questions
    const currentConfig = getCurrentExamConfig()
    for (const [subjectName, scores] of Object.entries(subjects)) {
      const totalQuestions = scores.correct + scores.wrong + scores.blank
      const expectedQuestions = currentConfig[subjectName as keyof typeof currentConfig]

      if (expectedQuestions && totalQuestions > 0 && totalQuestions !== expectedQuestions) {
        toast({
          title: "Hata",
          description: `${subjectName} için toplam ${expectedQuestions} soru olmalı. Şu anda: ${totalQuestions}`,
          variant: "destructive",
        })
        return false
      }
    }

    return true
  }

  const calculateTotalNetScore = () => {
    return Object.entries(subjects).reduce((total, [_, scores]) => {
      const netScore = scores.correct - scores.wrong * 0.25
      return total + netScore
    }, 0)
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    if (connectionStatus !== "connected") {
      toast({
        title: "Bağlantı Hatası",
        description: "Veritabanına bağlanılamadı. Lütfen sayfayı yenileyip tekrar deneyin.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      setUploadProgress(0)

      // Calculate total net score
      const totalNetScore = calculateTotalNetScore()

      // 1. Insert exam record - optimize edilmiş fonksiyonu kullan
      const examResult = await saveExam({
        exam_type: examType + (examType === "AYT" ? ` - ${aytType}` : ""),
        exam_date: date!.toISOString(),
        exam_name: examName,
        total_net_score: totalNetScore,
      })

      if (!examResult.success || !examResult.data) {
        throw new Error(examResult.error || "Exam data not returned")
      }

      const examId = examResult.data.id
      setUploadProgress(20)

      // 2. Insert subject records using our saveSubject function
      const subjectPromises = Object.entries(subjects)
        .filter(([_, scores]) => scores.correct > 0 || scores.wrong > 0 || scores.blank > 0)
        .map(async ([subjectName, scores]) => {
          try {
            const netScore = scores.correct - scores.wrong * 0.25
            const result = await saveSubject({
              exam_id: examId,
              subject_name: subjectName,
              correct_answers: scores.correct,
              wrong_answers: scores.wrong,
              blank_answers: scores.blank,
              net_score: netScore,
            })

            if (!result.success) {
              console.error(`Error inserting subject ${subjectName}:`, result.error)
              return { success: false, subject: subjectName, error: result.error }
            }

            return { success: true, subject: subjectName }
          } catch (err) {
            console.error(`Exception inserting subject ${subjectName}:`, err)
            return { success: false, subject: subjectName, error: err }
          }
        })

      const subjectResults = await Promise.allSettled(subjectPromises)
      const failedSubjects = subjectResults
        .filter((result) => result.status === "fulfilled" && !result.value.success)
        .map((result) => (result.status === "fulfilled" ? result.value.subject : "unknown"))

      if (failedSubjects.length > 0) {
        console.warn("Some subjects failed to save:", failedSubjects)
        // Continue anyway, just log the warning
      }

      setUploadProgress(50)

      // 3. Upload images if any
      const allFiles = [
        ...wrongAnswerFiles.map(f => ({ file: f, type: 'wrong_answers' })),
        ...blankAnswerFiles.map(f => ({ file: f, type: 'blank_answers' }))
      ]
      
      if (allFiles.length > 0) {
        const totalFiles = allFiles.length
        let completedFiles = 0
        let successfulUploads = 0

        for (const { file, type } of allFiles) {
          try {
            const result = await uploadImage(file, examId, type)
            if (result.success) {
              successfulUploads++
            }
          } catch (error) {
            console.error(`Error uploading file:`, error)
          } finally {
            completedFiles++
            setUploadProgress(50 + Math.floor((completedFiles / totalFiles) * 50))
          }
        }

        console.log(`Upload complete. ${successfulUploads}/${totalFiles} files uploaded successfully.`)
        
        // 4. Start AI analysis if any files were uploaded
        if (successfulUploads > 0) {
          setLastSavedExamId(examId)
          setShowAnalysisDialog(true)
          setIsAnalyzing(true)
          setAnalysisProgress(0)
          setAnalysisComplete(false)
          
          try {
            // Yalnızca Gemini API ile analiz
            const uploadedFiles = allFiles.map(f => f.file)
            
            const analyses = await batchAnalyzeImages(uploadedFiles, examId, (current, total) => {
              setAnalysisProgress(Math.floor((current / total) * 80))
            })
            
            if (analyses.length > 0) {
              setAnalysisProgress(85)
              
              // Convert Gemini analyses to database format
              const analysisData = analyses.map(analysis => ({
                exam_id: examId,
                date: analysis.date,
                question: analysis.question,
                source: analysis.source,
                subject: analysis.subject,
                topic: analysis.topic,
                related_topics: analysis.related_topics,
                sub_achievement: analysis.sub_achievement,
                difficulty_level: analysis.difficulty_level,
                selectivity: analysis.selectivity,
                learning_level: analysis.learning_level,
                new_generation_question: analysis.new_generation_question,
                question_type: analysis.question_type,
                solution_time: analysis.solution_time,
                question_format: analysis.question_format,
                error_type: analysis.error_type,
                solution_strategy: analysis.solution_strategy,
                solution_steps_count: analysis.solution_steps_count,
              }))
              
              // Save analyses to database
              const saveResult = await batchSaveQuestionAnalyses(analysisData)
              setAnalysisProgress(100)
              setAnalysisResults(analyses.length)
              setAnalysisComplete(true)
              
              if (saveResult.success) {
                toast({
                  title: "Analiz Tamamlandı",
                  description: `${analyses.length} soru başarıyla analiz edildi ve kaydedildi`,
                })
              } else {
                toast({
                  title: "Analiz Kaydedilemedi",
                  description: "Sorular analiz edildi ancak kaydedilemedi",
                  variant: "destructive",
                })
              }
            }
          } catch (analysisError) {
            console.error("Gemini API analysis error:", analysisError)
            toast({
              title: "Analiz Hatası",
              description: "Fotoğraflar analiz edilirken bir hata oluştu",
              variant: "destructive",
            })
            setAnalysisComplete(true)
          } finally {
            setIsAnalyzing(false)
          }
        }
      } else {
        setUploadProgress(100)
      }

      // Only show success message if no files were uploaded (no analysis needed)
      if (allFiles.length === 0) {
        toast({
          title: "Başarılı",
          description: "Sınav sonuçları başarıyla kaydedildi",
        })
      }

      // Reset form
      setExamType("")
      setAytType("")
      setExamName("")
      setDate(new Date())
      setWrongAnswerFiles([])
      setBlankAnswerFiles([])
      setSubjects({})
    } catch (error) {
      console.error("Error saving exam data:", error)
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Sınav sonuçları kaydedilirken bir hata oluştu",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      setUploadProgress(0)
    }
  }

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isAnalyzing && !analysisComplete) {
      setAnalysisProgressFake(0);
      interval = setInterval(() => {
        setAnalysisProgressFake((prev) => {
          if (prev < 80) return prev + 1;
          return prev;
        });
      }, 100);
    } else {
      setAnalysisProgressFake(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAnalyzing, analysisComplete]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-900 text-gray-100">
      <Header />

      {/* Connection Status */}
      {connectionStatus === "error" && (
        <div className="mx-auto mt-4 max-w-7xl rounded-md border border-red-800 bg-red-900/20 px-4 py-2 text-red-100">
          <p className="flex flex-wrap items-center gap-2">
            <span>⚠️</span>
            <span>Veritabanı bağlantısı kurulamadı. Bazı özellikler çalışmayabilir.</span>
            <Button
              variant="link"
              className="ml-auto text-red-300 hover:text-red-100"
              onClick={() => window.location.reload()}
            >
              Sayfayı Yenile
            </Button>
          </p>
        </div>
      )}

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        <h2 className="mb-6 text-xl font-bold sm:text-2xl">Deneme Sınavı Sonuçlarını Gir</h2>

        {/* Exam Details Card */}
        <Card className="mb-6 border-gray-800 bg-gray-900">
          <CardHeader>
            <CardTitle>Genel Deneme Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="exam-type">Sınav Türü</Label>
              <Select value={examType} onValueChange={setExamType}>
                <SelectTrigger id="exam-type" className="border-gray-700 bg-gray-800">
                  <SelectValue placeholder="Seçiniz" />
                </SelectTrigger>
                <SelectContent className="border-gray-700 bg-gray-800">
                  <SelectItem value="TYT">TYT</SelectItem>
                  <SelectItem value="AYT">AYT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ayt-type">Alan</Label>
              <Select value={aytType} onValueChange={setAytType} disabled={examType !== "AYT"}>
                <SelectTrigger id="ayt-type" className="border-gray-700 bg-gray-800">
                  <SelectValue placeholder={examType === "AYT" ? "Seçiniz" : "Önce AYT seçin"} />
                </SelectTrigger>
                <SelectContent className="border-gray-700 bg-gray-800">
                  <SelectItem value="SAY">Sayısal (SAY)</SelectItem>
                  <SelectItem value="EA">Eşit Ağırlık (EA)</SelectItem>
                  <SelectItem value="SÖZ">Sözel (SÖZ)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="exam-date">Sınav Tarihi</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-gray-700 bg-gray-800 text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: tr }) : <span>Tarih Seçiniz</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto border-gray-700 bg-gray-800 p-0">
                  <Calendar mode="single" selected={date} onSelect={(selectedDate) => selectedDate && setDate(selectedDate)} initialFocus className="bg-gray-800" />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="exam-name">
                Deneme Adı / Yayın <span className="text-red-500">*</span>
              </Label>
              <Input
                id="exam-name"
                placeholder="Örn: Özdebir TYT Deneme 1"
                className="border-gray-700 bg-gray-800"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Subject Results Cards */}
        {Object.keys(subjects).length > 0 && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(subjects).map(([subjectName, scores]) => {
              const currentConfig = getCurrentExamConfig()
              return (
                <SubjectCard
                  key={subjectName}
                  title={subjectName}
                  correct={scores.correct}
                  wrong={scores.wrong}
                  blank={scores.blank}
                  maxQuestions={currentConfig[subjectName as keyof typeof currentConfig] || 0}
                  onCorrectChange={(value) => handleSubjectChange(subjectName, "correct", value)}
                  onWrongChange={(value) => handleSubjectChange(subjectName, "wrong", value)}
                  onBlankChange={(value) => handleSubjectChange(subjectName, "blank", value)}
                  onInputFocus={handleInputFocus}
                  onInputBlur={(e, field) => handleInputBlur(e, subjectName, field)}
                />
              )
            })}
          </div>
        )}

        {/* File Upload Cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          {/* Wrong Answer Files */}
          <Card className="border-gray-800 bg-gray-900">
            <CardHeader>
              <CardTitle>Yanlış Cevaplar</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUploadSection 
                files={wrongAnswerFiles}
                onFileChange={(files) => setWrongAnswerFiles(prev => [...prev, ...files])}
                onRemoveFile={(index) => setWrongAnswerFiles(wrongAnswerFiles.filter((_, i) => i !== index))}
                title="Yanlış cevap fotoğraflarını yükleyin"
              />
            </CardContent>
          </Card>

          {/* Blank Answer Files */}
          <Card className="border-gray-800 bg-gray-900">
            <CardHeader>
              <CardTitle>Boş Cevaplar</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUploadSection 
                files={blankAnswerFiles}
                onFileChange={(files) => setBlankAnswerFiles(prev => [...prev, ...files])}
                onRemoveFile={(index) => setBlankAnswerFiles(blankAnswerFiles.filter((_, i) => i !== index))}
                title="Boş cevap fotoğraflarını yükleyin"
              />
            </CardContent>
          </Card>
        </div>

        {/* Save Button */}
        <div className="flex flex-col items-center justify-center gap-4 sm:items-end">
          {isSubmitting && uploadProgress > 0 && (
            <div className="w-full max-w-md">
              <div className="mb-2 flex justify-between text-sm">
                <span>Yükleniyor...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
                <div
                  className="h-full bg-[#8b5cf6] transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          <Button
            className="w-full bg-[#8b5cf6] px-6 py-5 text-base font-medium hover:bg-[#7c3aed] sm:w-auto sm:px-8 sm:py-6 sm:text-lg"
            onClick={handleSubmit}
            disabled={isSubmitting || connectionStatus === "checking"}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kaydediliyor...
              </>
            ) : connectionStatus === "checking" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Bağlantı Kontrol Ediliyor...
              </>
            ) : (
              "Sonuçları Kaydet"
            )}
          </Button>
        </div>
      </main>

      {/* AI Analysis Dialog */}
      <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
        <DialogContent className="border-gray-800 bg-gray-900 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-[#8b5cf6]" />
              Yapay Zeka Analizi
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {analysisComplete 
                ? "Yanlış ve boş cevaplarınız başarıyla analiz edildi!" 
                : "Yanlış ve boş cevaplarınız analiz ediliyor..."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {!analysisComplete && (
              <div className="w-full">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Brain className="h-4 w-4 animate-pulse" />
                    İşleniyor...
                  </span>
                  <span>{analysisComplete ? 100 : analysisProgressFake}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${analysisComplete ? 100 : analysisProgressFake}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {analysisComplete && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Analiz tamamlandı!</span>
                </div>
                
                <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                  <div className="text-sm text-gray-300">
                    <p><strong>{analysisResults}</strong> soru analiz edildi</p>
                    <p className="mt-1 text-xs text-gray-400">
                      Her soru için zorluk seviyesi, konu, çözüm stratejisi ve daha fazlası belirlendi.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setShowAnalysisDialog(false)
                      toast({
                        title: "Başarılı",
                        description: "Sınav sonuçları ve analiz sonuçları kaydedildi",
                      })
                    }}
                    className="flex-1 bg-[#8b5cf6] hover:bg-[#7c3aed]"
                  >
                    Tamam
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAnalysisDialog(false)
                      if (lastSavedExamId) {
                        router.push(`/exam-results?exam_id=${lastSavedExamId}`)
                      } else {
                        toast({
                          title: "Hata",
                          description: "Analiz edilen sınav bulunamadı.",
                          variant: "destructive",
                        })
                      }
                    }}
                    className="flex-1 border-gray-700 hover:bg-gray-800"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Analize Git
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface SubjectCardProps {
  title: string
  correct: number
  wrong: number
  blank: number
  maxQuestions: number
  onCorrectChange: (value: number) => void
  onWrongChange: (value: number) => void
  onBlankChange: (value: number) => void
  onInputFocus: (e: React.FocusEvent<HTMLInputElement>) => void
  onInputBlur: (e: React.FocusEvent<HTMLInputElement>, field: "correct" | "wrong" | "blank") => void
}

function SubjectCard({
  title,
  correct,
  wrong,
  blank,
  maxQuestions,
  onCorrectChange,
  onWrongChange,
  onBlankChange,
  onInputFocus,
  onInputBlur,
}: SubjectCardProps) {
  const net = correct - wrong * 0.25
  const totalQuestions = correct + wrong + blank

  return (
    <Card className="border-gray-800 bg-gray-900">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center justify-between text-base sm:text-lg">
          <span>{title}</span>
          <span className={`text-xs font-normal sm:text-sm ${
            totalQuestions !== maxQuestions && totalQuestions > 0
              ? "text-red-400 font-semibold" 
              : totalQuestions === maxQuestions && totalQuestions > 0
              ? "text-green-400 font-semibold"
              : "text-gray-400"
          }`}>
            {totalQuestions}/{maxQuestions}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 sm:p-6 sm:pt-0">
        <div className="space-y-1 sm:space-y-2">
          <Label htmlFor={`${title}-correct`} className="text-xs sm:text-sm">
            Doğru
          </Label>
          <Input
            id={`${title}-correct`}
            type="number"
            min="0"
            max={maxQuestions}
            className="border-gray-700 bg-gray-800 text-sm sm:text-base"
            value={correct === 0 ? "" : correct.toString()}
            placeholder=""
            onChange={(e) => onCorrectChange(Number.parseInt(e.target.value) || 0)}
            onFocus={onInputFocus}
            onBlur={(e) => onInputBlur(e, "correct")}
          />
        </div>
        <div className="space-y-1 sm:space-y-2">
          <Label htmlFor={`${title}-wrong`} className="text-xs sm:text-sm">
            Yanlış
          </Label>
          <Input
            id={`${title}-wrong`}
            type="number"
            min="0"
            max={maxQuestions}
            className="border-gray-700 bg-gray-800 text-sm sm:text-base"
            value={wrong === 0 ? "" : wrong.toString()}
            placeholder=""
            onChange={(e) => onWrongChange(Number.parseInt(e.target.value) || 0)}
            onFocus={onInputFocus}
            onBlur={(e) => onInputBlur(e, "wrong")}
          />
        </div>
        <div className="space-y-1 sm:space-y-2">
          <Label htmlFor={`${title}-blank`} className="text-xs sm:text-sm">
            Boş
          </Label>
          <Input
            id={`${title}-blank`}
            type="number"
            min="0"
            max={maxQuestions}
            className="border-gray-700 bg-gray-800 text-sm sm:text-base"
            value={blank === 0 ? "" : blank.toString()}
            placeholder=""
            onChange={(e) => onBlankChange(Number.parseInt(e.target.value) || 0)}
            onFocus={onInputFocus}
            onBlur={(e) => onInputBlur(e, "blank")}
          />
        </div>
        <div className="pt-1 text-xs sm:pt-2 sm:text-sm">
          <span className="font-medium text-[#8b5cf6]">Net:</span> 
          <span className={`font-bold ml-1 ${
            totalQuestions !== maxQuestions && totalQuestions > 0 ? "text-red-400" : ""
          }`}>
            {net.toFixed(2)}
          </span>
          {totalQuestions !== maxQuestions && totalQuestions > 0 && (
            <span className="ml-2 text-red-400 text-xs">
              {totalQuestions > maxQuestions ? "⚠️ Soru sayısı aşıldı" : "⚠️ Soru sayısı eksik"}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface FileUploadSectionProps {
  files: File[]
  onFileChange: (files: File[]) => void
  onRemoveFile: (index: number) => void
  title: string
}

function FileUploadSection({ files, onFileChange, onRemoveFile, title }: FileUploadSectionProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      // Check file size (max 10MB)
      const validFiles = selectedFiles.filter((file) => file.size <= 10 * 1024 * 1024)
      onFileChange(validFiles)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="flex w-full items-center justify-center">
        <label
          htmlFor={`file-upload-${title.replace(/\s+/g, '-').toLowerCase()}`}
          className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-700 bg-gray-800 hover:bg-gray-700"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="mb-3 h-10 w-10 text-gray-400" />
            <p className="mb-2 text-center text-sm text-gray-400">
              <span className="font-semibold">{title}</span>
            </p>
            <p className="text-xs text-gray-400">PNG, JPG veya JPEG (MAX. 10MB)</p>
            <p className="mt-1 flex items-center justify-center gap-1 text-xs text-green-400">
              <Brain className="h-3 w-3" />
              AI ile otomatik analiz edilecek
            </p>
          </div>
          <Input
            id={`file-upload-${title.replace(/\s+/g, '-').toLowerCase()}`}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
            accept="image/*"
          />
        </label>
      </div>

      {/* File Preview */}
      {files.length > 0 && (
        <div className="mt-4 w-full">
          <h3 className="mb-2 text-sm font-medium">Yüklenen Dosyalar ({files.length}):</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {files.map((file, index) => (
              <div
                key={index}
                className="group relative flex flex-col items-center overflow-hidden rounded-lg border border-gray-700 bg-gray-800 p-2"
              >
                <button
                  onClick={() => onRemoveFile(index)}
                  className="absolute right-1 top-1 z-10 rounded-full bg-gray-900 p-1 opacity-70 transition-opacity hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label="Dosyayı kaldır"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
                <div className="h-16 w-full overflow-hidden rounded sm:h-20">
                  <img
                    src={URL.createObjectURL(file) || "/placeholder.svg"}
                    alt={`Preview ${index}`}
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="mt-1 w-full truncate text-xs sm:mt-2">{file.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 