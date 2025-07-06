import { createClient } from "@supabase/supabase-js"
import { Database } from "./database.types"

// Supabase istemcisini oluşturuyoruz
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: (...args) => fetch(...args),
  },
})

// Supabase bağlantısını test etmek için yardımcı fonksiyon
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from("exams").select("count").limit(1)
    if (error) {
      console.error("Supabase bağlantı testi hatası:", error)
      return { success: false, error }
    }
    return { success: true, data }
  } catch (err) {
    console.error("Supabase bağlantı testi exception:", err)
    return { success: false, error: err }
  }
}

// Types for better type safety
export type ExamData = Database['public']['Tables']['exams']['Insert']
export type SubjectData = Database['public']['Tables']['subjects']['Insert']
export type QuestionAnalysisData = Database['public']['Tables']['question_analyses']['Insert']

// Exam kaydetmek için optimize edilmiş fonksiyon
export async function saveExam(examData: ExamData) {
  try {
    // Önce bağlantıyı test et
    const connectionTest = await testSupabaseConnection()
    if (!connectionTest.success) {
      throw new Error("Veritabanı bağlantısı kurulamadı")
    }

    // Exam kaydını oluştur
    const { data, error } = await supabase.from("exams").insert(examData).select()

    if (error) {
      console.error("Exam kayıt hatası:", error)

      // Hata tipine göre özel mesajlar
      if (error.code === "23505") {
        throw new Error("Bu sınav zaten kaydedilmiş")
      } else if (error.code === "23502") {
        throw new Error("Zorunlu alanlar eksik")
      } else if (error.code === "42P01") {
        throw new Error("Veritabanı tablosu bulunamadı")
      } else {
        throw new Error(`Sınav kaydı oluşturulamadı: ${error.message}`)
      }
    }

    if (!data || data.length === 0) {
      throw new Error("Sınav kaydı oluşturuldu ancak veri döndürülemedi")
    }

    return { success: true, data: data[0] }
  } catch (err) {
    console.error("Exam kaydetme exception:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu",
    }
  }
}

// Subject kaydetmek için fonksiyon
export async function saveSubject(subjectData: SubjectData) {
  try {
    const { data, error } = await supabase.from("subjects").insert(subjectData).select()

    if (error) {
      console.error("Subject kayıt hatası:", error)
      throw new Error(`Ders kaydı oluşturulamadı: ${error.message}`)
    }

    return { success: true, data: data[0] }
  } catch (err) {
    console.error("Subject kaydetme exception:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu",
    }
  }
}

// Image upload fonksiyonu
export async function uploadImage(file: File, examId: string, imageType: string = 'general') {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${examId}/${imageType}/${Date.now()}.${fileExt}`
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('exam-images')
      .upload(fileName, file)

    if (uploadError) {
      console.error("Image upload hatası:", uploadError)
      throw new Error(`Resim yüklenemedi: ${uploadError.message}`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('exam-images')
      .getPublicUrl(fileName)

    // Save image record to database
    const { data, error } = await supabase.from("exam_images").insert({
      exam_id: examId,
      image_url: urlData.publicUrl,
      image_type: imageType,
      file_name: file.name,
      file_size: file.size
    }).select()

    if (error) {
      console.error("Image record kayıt hatası:", error)
      throw new Error(`Resim kaydı oluşturulamadı: ${error.message}`)
    }

    return { success: true, data: data[0], url: urlData.publicUrl, fileName }
  } catch (err) {
    console.error("Image upload exception:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu",
    }
  }
}

// Question analysis kaydetmek için fonksiyon
export async function saveQuestionAnalysis(analysisData: QuestionAnalysisData) {
  try {
    const { data, error } = await supabase.from("question_analyses").insert(analysisData).select()

    if (error) {
      console.error("Question analysis kayıt hatası:", error)
      throw new Error(`Soru analizi kaydı oluşturulamadı: ${error.message}`)
    }

    return { success: true, data: data[0] }
  } catch (err) {
    console.error("Question analysis kaydetme exception:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu",
    }
  }
}

// Batch question analysis kaydetmek için fonksiyon
export async function batchSaveQuestionAnalyses(analysesData: QuestionAnalysisData[]) {
  try {
    const { data, error } = await supabase.from("question_analyses").insert(analysesData).select()

    if (error) {
      console.error("Batch question analysis kayıt hatası:", error)
      throw new Error(`Soru analizleri kaydı oluşturulamadı: ${error.message}`)
    }

    return { success: true, data }
  } catch (err) {
    console.error("Batch question analysis kaydetme exception:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu",
    }
  }
}

// Exam ID'ye göre soru analizlerini getirmek için fonksiyon
export async function getQuestionAnalyses(examId: string) {
  try {
    const { data, error } = await supabase
      .from("question_analyses")
      .select("*")
      .eq("exam_id", examId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Question analyses getirme hatası:", error)
      throw new Error(`Soru analizleri getirilemedi: ${error.message}`)
    }

    return { success: true, data }
  } catch (err) {
    console.error("Question analyses getirme exception:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu",
    }
  }
}

// User ID'ye göre soru analizlerini getirmek için fonksiyon
export async function getQuestionAnalysesByUser(userId: string) {
  try {
    const { data, error } = await supabase
      .from("question_analyses")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Question analyses getirme hatası:", error)
      throw new Error(`Soru analizleri getirilemedi: ${error.message}`)
    }

    return { success: true, data }
  } catch (err) {
    console.error("Question analyses getirme exception:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu",
    }
  }
}
