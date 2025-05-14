import { createClient } from "@supabase/supabase-js"

// Supabase istemcisini oluşturuyoruz
const supabaseUrl = "https://kbtfhmczzsldtyifaaoi.supabase.co"
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtidGZobWN6enNsZHR5aWZhYW9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyMzMwNzMsImV4cCI6MjA2MjgwOTA3M30.cpEgSfjs-F4ck0smjwphYgm3GLmtQUa3UBWeLuLEVU0"

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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

// Exam kaydetmek için optimize edilmiş fonksiyon
export async function saveExam(examData) {
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
