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
import { supabase, testSupabaseConnection, saveExam } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { v4 as uuidv4 } from "uuid"
import { Loader2 } from "lucide-react"

// Ders başına maksimum soru sayıları
const MAX_QUESTIONS = {
  Türkçe: 40,
  "Temel Matematik": 40,
  "Sosyal Bilimler": 20,
  "Fen Bilimleri": 20,
}

export default function Home() {
  const { toast } = useToast()
  const [date, setDate] = useState<Date>()
  const [files, setFiles] = useState<File[]>([])
  const [examType, setExamType] = useState<string>("")
  const [examName, setExamName] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "error">("checking")

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

  // Subject states
  const [subjects, setSubjects] = useState({
    Türkçe: { correct: 0, wrong: 0, blank: 0 },
    "Sosyal Bilimler": { correct: 0, wrong: 0, blank: 0 },
    "Temel Matematik": { correct: 0, wrong: 0, blank: 0 },
    "Fen Bilimleri": { correct: 0, wrong: 0, blank: 0 },
  })

  const handleSubjectChange = (subject: string, field: "correct" | "wrong" | "blank", value: number) => {
    setSubjects((prev) => ({
      ...prev,
      [subject]: {
        ...prev[subject as keyof typeof prev],
        [field]: value,
      },
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

      setFiles((prev) => [...prev, ...validFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
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

    // Validate maximum question counts for each subject
    for (const [subjectName, scores] of Object.entries(subjects)) {
      const totalQuestions = scores.correct + scores.wrong + scores.blank
      const maxQuestions = MAX_QUESTIONS[subjectName as keyof typeof MAX_QUESTIONS]

      if (totalQuestions > maxQuestions) {
        toast({
          title: "Hata",
          description: `${subjectName} için maksimum ${maxQuestions} soru girilebilir. Şu anda: ${totalQuestions}`,
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
        exam_type: examType,
        exam_date: date.toISOString(),
        exam_name: examName,
        total_net_score: totalNetScore,
      })

      if (!examResult.success) {
        throw new Error(examResult.error)
      }

      const examId = examResult.data.id
      setUploadProgress(20)

      // 2. Insert subject records - hata yönetimini iyileştir
      const subjectPromises = Object.entries(subjects)
        .filter(([_, scores]) => scores.correct > 0 || scores.wrong > 0 || scores.blank > 0)
        .map(async ([subjectName, scores]) => {
          try {
            const netScore = scores.correct - scores.wrong * 0.25
            const { error } = await supabase.from("subjects").insert({
              exam_id: examId,
              subject_name: subjectName,
              correct_count: scores.correct,
              wrong_count: scores.wrong,
              blank_count: scores.blank,
              net_score: netScore,
            })

            if (error) {
              console.error(`Error inserting subject ${subjectName}:`, error)
              return { success: false, subject: subjectName, error }
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

      // 3. Upload images if any - optimize edilmiş yükleme
      if (files.length > 0) {
        const totalFiles = files.length
        let completedFiles = 0
        let successfulUploads = 0

        // Batch işleme için dosyaları grupla (3'er dosya)
        const batchSize = 3
        const fileBatches = []

        for (let i = 0; i < files.length; i += batchSize) {
          fileBatches.push(files.slice(i, i + batchSize))
        }

        // Her batch'i sırayla işle
        for (const batch of fileBatches) {
          const batchPromises = batch.map(async (file) => {
            try {
              const fileExt = file.name.split(".").pop()
              const fileName = `${uuidv4()}.${fileExt}`
              const filePath = `question_images/${examId}/${fileName}`

              // Upload file to storage
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from("question.images")
                .upload(filePath, file, {
                  cacheControl: "3600",
                  upsert: false,
                })

              if (uploadError) {
                console.error(`Error uploading file:`, uploadError)
                return { success: false, error: uploadError }
              }

              // Get public URL
              const { data: urlData } = supabase.storage.from("question.images").getPublicUrl(filePath)

              if (!urlData || !urlData.publicUrl) {
                console.error(`Failed to get public URL for file`)
                return { success: false, error: "Failed to get public URL" }
              }

              // Insert record in question_images table
              const { data: imageData, error: imageError } = await supabase
                .from("question_images")
                .insert({
                  exam_id: examId,
                  image_url: urlData.publicUrl,
                })
                .select()

              if (imageError) {
                console.error(`Error inserting image record:`, imageError)
                return { success: false, error: imageError }
              }

              successfulUploads++
              return { success: true, data: imageData }
            } catch (error) {
              console.error(`Error processing file:`, error)
              return { success: false, error }
            } finally {
              completedFiles++
              setUploadProgress(50 + Math.floor((completedFiles / totalFiles) * 50))
            }
          })

          // Her batch'i paralel işle
          await Promise.all(batchPromises)
        }

        console.log(`Upload complete. ${successfulUploads}/${files.length} files uploaded successfully.`)
      } else {
        setUploadProgress(100)
      }

      toast({
        title: "Başarılı",
        description: "Sınav sonuçları başarıyla kaydedildi",
      })

      // Reset form
      setExamType("")
      setExamName("")
      setDate(undefined)
      setFiles([])
      setSubjects({
        Türkçe: { correct: 0, wrong: 0, blank: 0 },
        "Sosyal Bilimler": { correct: 0, wrong: 0, blank: 0 },
        "Temel Matematik": { correct: 0, wrong: 0, blank: 0 },
        "Fen Bilimleri": { correct: 0, wrong: 0, blank: 0 },
      })
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

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900 px-4 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-xl font-bold text-white">
            <span className="text-[#8b5cf6]">Error</span>Vault
          </h1>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:gap-3">
            <Button className="bg-[#8b5cf6] hover:bg-[#7c3aed]">Yeni Deneme Girişi</Button>
            <Button variant="outline" disabled className="relative">
              Detaylı Analiz
              <span className="absolute -right-2 -top-2 rounded-full bg-[#8b5cf6] px-2 py-0.5 text-xs font-semibold text-white">
                Yakında
              </span>
            </Button>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Menü</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="border-gray-800 bg-gray-900 text-white">
                <SheetHeader>
                  <SheetTitle className="text-white">
                    <span className="text-[#8b5cf6]">Error</span>Vault
                  </SheetTitle>
                  <SheetDescription className="text-gray-400">Deneme sınavı sonuçlarınızı takip edin</SheetDescription>
                </SheetHeader>
                <div className="mt-6 flex flex-col gap-4">
                  <Button className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed]">Yeni Deneme Girişi</Button>
                  <Button variant="outline" disabled className="relative w-full">
                    Detaylı Analiz
                    <span className="absolute -right-2 -top-2 rounded-full bg-[#8b5cf6] px-2 py-0.5 text-xs font-semibold text-white">
                      Yakında
                    </span>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

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
          <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className="bg-gray-800" />
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
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(subjects).map(([subjectName, scores]) => (
            <SubjectCard
              key={subjectName}
              title={subjectName}
              correct={scores.correct}
              wrong={scores.wrong}
              blank={scores.blank}
              maxQuestions={MAX_QUESTIONS[subjectName as keyof typeof MAX_QUESTIONS]}
              onCorrectChange={(value) => handleSubjectChange(subjectName, "correct", value)}
              onWrongChange={(value) => handleSubjectChange(subjectName, "wrong", value)}
              onBlankChange={(value) => handleSubjectChange(subjectName, "blank", value)}
              onInputFocus={handleInputFocus}
              onInputBlur={(e, field) => handleInputBlur(e, subjectName, field)}
            />
          ))}
        </div>

        {/* Wrong Questions Upload Card */}
        <Card className="mb-6 border-gray-800 bg-gray-900">
          <CardHeader>
            <CardTitle>Yanlış ve Boş Soruların Fotoğraflarını Yükle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="flex w-full items-center justify-center">
                <label
                  htmlFor="file-upload"
                  className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-700 bg-gray-800 hover:bg-gray-700"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="mb-3 h-10 w-10 text-gray-400" />
                    <p className="mb-2 text-center text-sm text-gray-400">
                      <span className="font-semibold">Fotoğraf yüklemek için tıklayın</span> veya sürükleyip bırakın
                    </p>
                    <p className="text-xs text-gray-400">PNG, JPG veya JPEG (MAX. 10MB)</p>
                  </div>
                  <Input
                    id="file-upload"
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
                  <h3 className="mb-2 text-sm font-medium">Yüklenen Dosyalar:</h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="group relative flex flex-col items-center overflow-hidden rounded-lg border border-gray-700 bg-gray-800 p-2"
                      >
                        <button
                          onClick={() => removeFile(index)}
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
          </CardContent>
        </Card>

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
          <span className="text-xs font-normal text-gray-400 sm:text-sm">
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
            value={correct}
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
            value={wrong}
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
            value={blank}
            onChange={(e) => onBlankChange(Number.parseInt(e.target.value) || 0)}
            onFocus={onInputFocus}
            onBlur={(e) => onInputBlur(e, "blank")}
          />
        </div>
        <div className="pt-1 text-xs sm:pt-2 sm:text-sm">
          <span className="font-medium text-[#8b5cf6]">Net:</span> <span className="font-bold">{net.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
