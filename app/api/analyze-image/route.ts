import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

interface QuestionAnalysis {
  date: string;
  question: string;
  source: string;
  subject: string;
  topic: string;
  related_topics: string[];
  sub_achievement: string;
  difficulty_level: string;
  selectivity: string;
  learning_level: string;
  new_generation_question: boolean;
  question_type: string;
  solution_time: number;
  question_format: string;
  error_type: string;
  solution_strategy: string;
  solution_steps_count: number;
  question_status?: string;
}

function normalizeAnalysisValues(analysis: QuestionAnalysis): QuestionAnalysis {
  // Normalize values to ensure they match database constraints
  const normalized = { ...analysis };
  
  // Difficulty level normalization
  if (normalized.difficulty_level) {
    const difficulty = normalized.difficulty_level.toLowerCase();
    if (difficulty.includes('kolay')) normalized.difficulty_level = 'Kolay';
    else if (difficulty.includes('orta')) normalized.difficulty_level = 'Orta';
    else if (difficulty.includes('zor')) normalized.difficulty_level = 'Zor';
  }
  
  // Selectivity normalization
  if (normalized.selectivity) {
    const selectivity = normalized.selectivity.toLowerCase();
    if (selectivity.includes('yüksek') || selectivity.includes('high')) normalized.selectivity = 'Yüksek';
    else if (selectivity.includes('orta') || selectivity.includes('medium')) normalized.selectivity = 'Orta';
    else if (selectivity.includes('düşük') || selectivity.includes('low')) normalized.selectivity = 'Düşük';
  }
  
  // Learning level normalization
  if (normalized.learning_level) {
    const learning = normalized.learning_level.toLowerCase();
    if (learning.includes('bilgi') || learning.includes('knowledge')) normalized.learning_level = 'Bilgi';
    else if (learning.includes('kavrama') || learning.includes('comprehension')) normalized.learning_level = 'Kavrama';
    else if (learning.includes('uygulama') || learning.includes('application')) normalized.learning_level = 'Uygulama';
    else if (learning.includes('analiz') || learning.includes('analysis')) normalized.learning_level = 'Analiz';
    else if (learning.includes('sentez') || learning.includes('synthesis')) normalized.learning_level = 'Sentez';
    else if (learning.includes('değerlendirme') || learning.includes('evaluation')) normalized.learning_level = 'Değerlendirme';
  }
  
  // Question type normalization
  if (normalized.question_type) {
    normalized.question_type = 'Çoktan Seçmeli'; // TYT soruları sadece çoktan seçmeli
  }
  
  // Question format normalization
  if (normalized.question_format) {
    const format = normalized.question_format.toLowerCase();
    if (format.includes('metin ve görsel') || format.includes('metin ve resim') || format.includes('text with image')) normalized.question_format = 'Metin ve Görsel';
    else if (format.includes('grafik') || format.includes('graph')) normalized.question_format = 'Grafik';
    else if (format.includes('tablo') || format.includes('table')) normalized.question_format = 'Tablo';
    else if (format.includes('diyagram') || format.includes('diagram')) normalized.question_format = 'Diyagram';
    else normalized.question_format = 'Metin'; // Default to Metin
  }
  
  // Error type normalization
  if (normalized.error_type) {
    const error = normalized.error_type.toLowerCase();
    if (error.includes('kavramsal') || error.includes('conceptual')) normalized.error_type = 'Kavramsal';
    else if (error.includes('işlem') || error.includes('hesaplama') || error.includes('computational')) normalized.error_type = 'İşlem';
    else if (error.includes('okuma') || error.includes('reading')) normalized.error_type = 'Okuma';
    else if (error.includes('dikkatsizlik') || error.includes('careless')) normalized.error_type = 'Dikkatsizlik';
    else normalized.error_type = 'Kavramsal'; // Default to Kavramsal
  }
  
  // Solution strategy normalization
  if (normalized.solution_strategy) {
    const strategy = normalized.solution_strategy.toLowerCase();
    if (strategy.includes('doğrudan formül') || strategy.includes('direct formula')) normalized.solution_strategy = 'Doğrudan Formül';
    else if (strategy.includes('adım adım') || strategy.includes('step by step')) normalized.solution_strategy = 'Adım Adım';
    else if (strategy.includes('eleyerek çözüm') || strategy.includes('eleme') || strategy.includes('elimination')) normalized.solution_strategy = 'Eleyerek çözüm';
    else if (strategy.includes('çıkarım yapma') || strategy.includes('inference')) normalized.solution_strategy = 'Çıkarım yapma';
    else if (strategy.includes('grafiksel') || strategy.includes('graphical')) normalized.solution_strategy = 'Grafiksel';
    else if (strategy.includes('formül kullanma') || strategy.includes('formula')) normalized.solution_strategy = 'Formül kullanma';
    else if (strategy.includes('gruplama') || strategy.includes('grouping')) normalized.solution_strategy = 'Gruplama';
    else if (strategy.includes('tablo yapma') || strategy.includes('table')) normalized.solution_strategy = 'Tablo yapma';
    else if (strategy.includes('denklem çözme') || strategy.includes('equation')) normalized.solution_strategy = 'Denklem çözme';
    else normalized.solution_strategy = 'Adım Adım'; // Default to Adım Adım
  }
  
  return normalized;
}

function getAnalysisPrompt(): string {
  const basePrompt = `
Aşağıdaki görseldeki TYT sorusunu analiz et. Önce hangi derse ait olduğunu tespit et, sonra o derse göre analiz yap ve JSON formatında döndür:
{
  "date": "YYYY-MM-DD formatında bugünün tarihi",
  "question": "Sorunun tam metni",
  "source": "Kaynak bilgisi",
  "subject": "Tespit edilen ders adı",
  "topic": "Ana kategori",
  "related_topics": ["bağlantılı konu"],
  "sub_achievement": "Alt kazanım/kategori",
  "difficulty_level": "Kolay/Orta/Zor",
  "selectivity": "Yüksek/Orta/Düşük",
  "learning_level": "Bilgi/Kavrama/Uygulama/Analiz/Sentez/Değerlendirme",
  "new_generation_question": true,
  "question_type": "Çoktan Seçmeli",
  "solution_time": 120,
  "question_format": "Metin/Metin ve Görsel/Grafik/Tablo/Diyagram",
  "error_type": "Kavramsal/İşlem/Okuma/Dikkatsizlik",
  "solution_strategy": "Doğrudan Formül/Adım Adım/Eleyerek çözüm/Çıkarım yapma/Grafiksel/Formül kullanma/Gruplama/Tablo yapma/Denklem çözme",
  "solution_steps_count": 3
}

`;

  const subjectPrompts: Record<string, string> = {
    "Türkçe": `
Ana kategoriler: Sözcükte Anlam, Deyim ve Atasözü, Cümlede Anlam, Ses Bilgisi, Yazım Kuralları, Noktalama İşaretleri, Sözcükte Yapı, Sözcük Grupları, Cümlenin Ögeleri, Cümle Türleri, Anlatım Bozukluğu, Paragraf, Sözcük Türleri, Fiiller
Alt kategoriler: Ünlülerle İlgili Ses Olayları, Ünsüzlerle İlgili Ses Olayları, Ünlü Uyumları, Kök Bilgisi, İsim Çekim Ekleri, Fiil Çekim Ekleri, Yapım Ekleri, Yapı Bilgisi, Temel Ögeler, Yardımcı Ögeler, Vurgu-soru Unsurları, Paragrafta Anlatım Teknikleri, Paragrafta Düşünceyi Geliştirme Yolları, Paragrafta Yapı, Paragrafta Konu-Ana Düşünce, Paragrafta Yardımcı Düşünce, Öncüllü-Çoklu-Röportajlı Sorular, İsimler, Zamirler, Sıfatlar, Zarflar, Edat, Bağlaç, Ünlem, Fiilde Kip, Fiilde Kişi, Fiilde Yapı, Ek Fiil, Fiilimsi, Fiilde Çatı`,
    
    "Matematik": `
Ana kategoriler: Temel Kavramlar, Sayı Basamakları, Bölme ve Bölünebilme, EBOB – EKOK, Rasyonel Sayılar, Basit Eşitsizlikler, Mutlak Değer, Üslü Sayılar, Köklü Sayılar, Çarpanlara Ayırma, Oran Orantı, Denklem Çözme, Problemler, Kümeler – Kartezyen Çarpım, Mantık, Fonksiyonlar, Polinomlar, 2.Dereceden Denklemler, Permütasyon ve Kombinasyon, Binom, Olasılık, Veri – İstatistik
Alt kategoriler: Sayı Kümeleri, Pozitif ve Negatif Sayılar, En Büyük ve En Küçük Değer, Tek ve Çift Sayılar, Ardışık Sayılar, Asal Sayılar, Faktöriyel, Sayı Problemleri, Kesir Problemleri, Yaş Problemleri, Hareket-Hız Problemleri, İşçi-Emek Problemleri, Yüzde Problemleri, Kar-Zarar Problemleri, Karışım Problemleri, Grafik Problemleri, Rutin Olmayan Problemler`,
    
    "Geometri": `
Ana kategoriler: Temel Kavramlar, Doğruda Açılar, Üçgende Açılar, Özel Üçgenler, Açıortay, Kenarortay, Yükseklik, Eşlik ve Benzerlik, Üçgende Alan, Üçgende Benzerlik, Açı Kenar Bağıntıları, Çokgenler, Özel Dörtgenler, Çember ve Daire, Analitik Geometri, Katı Cisimler, Çemberin Analitiği
Alt kategoriler: Dik Üçgen, İkizkenar Üçgen, Eşkenar Üçgen, Dörtgenler, Deltoid, Paralelkenar, Eşkenar Dörtgen, Dikdörtgen, Kare, Yamuk, Çemberde Açı, Çemberde Uzun, Dairede Çevre ve Alan, Noktanın Analitiği, Doğrunun Analitiği, Dönüşüm Geometrisi, Analitik Geometri, Prizmalar, Küp, Silindir, Piramit, Koni, Küre`,
    
    "Tarih": `
Ana kategoriler: Tarih ve Zaman, İnsanlığın İlk Dönemleri, Ortaçağ'da Dünya, İlk ve Orta Çağlarda Türk Dünyası, İslam Medeniyetinin Doğuşu, İlk Türk İslam Devletleri, Yerleşme ve Devletleşme Sürecinde Selçuklu Türkiyesi, Beylikten Devlete Osmanlı Siyaseti(1300-1453), Dünya Gücü Osmanlı Devleti (1453-1600), Yeni Çağ Avrupa Tarihi, Yakın Çağ Avrupa Tarihi, Osmanlı Devletinde Arayış Yılları, 18. Yüzyılda Değişim ve Diplomasi, En Uzun Yüzyıl, Osmanlı Kültür ve Medeniyeti, 20. Yüzyılda Osmanlı Devleti, I. Dünya Savaşı, Mondros Ateşkesi İşgaller ve Cemiyetler, Kurtuluş Savaşına Hazırlık Dönemi, I. TBMM Dönemi, Kurtuluş Savaşı ve Antlaşmalar, II. TBMM Dönemi ve Çok Partili Hayata Geçiş, Türk İnkılabı, Atatürk İlkeleri, Atatürk Dönemi Türk Dış Politikası`,
    
    "Coğrafya": `
Ana kategoriler: Doğa ve İnsan, Dünya'nın Şekli ve Hareketleri, Coğrafi Konum, Harita Bilgisi, Atmosfer ve Sıcaklık, İklimler, Basınç ve Rüzgarlar, Nem Yağış ve Buharlaşma, İç Kuvvetler, Kayaçlar, Dış Kuvvetler, Su Toprak ve Bitkiler, Nüfus, Göç, Yerleşme, Türkiye'nin Yer Şekilleri, Ekonomik Faaliyetler, Bölgeler, Ulaşım, Çevre ve Toplum, Doğal Afetler
Alt kategoriler: Uzunluk-Alan Hesaplama, Projeksiyonlar, Ölçek Hesaplama, İzohipsler, Akarsular, Rüzgar, Karstik, Buzul, Dalgalar, Kıyı Tipleri, Nüfusun Dağılışı, Nüfus Piramitleri`,
    
    "Felsefe": `
Ana kategoriler: Felsefenin Konusu, Bilgi Felsefesi, Varlık Felsefesi, Din Kültür ve Medeniyet, Ahlak Felsefesi, Sanat Felsefesi, Din Felsefesi, Siyaset Felsefesi, Bilim Felsefesi`,
    
    "Din": `
Ana kategoriler: İnanç, İbadet, Ahlak ve Değerler, Din Kültür ve Medeniyet, Hz. Mhammed, Vahiy ve Akıl, Dünya ve Ahiret, Kuran'a göre Hz. Muhammed, İnançla İlgili Meseleler, Yahudilik ve Hristiyanlık, İslam ve Bilim, Anadolu da İslam, İslam Düşüncesinde Tasavvufi Yorumlar, Güncel Dini Meseleler, Hint ve Çin Dinleri`,
    
    "Fizik": `
Ana kategoriler: Fizik Bilimine Giriş, Madde ve Özellikleri, Sıvıların Kaldırma Kuvveti, Basınç, Isı Sıcaklık ve Genleşme, Hareket ve Kuvvet, İş Güç ve Enerji, Elektrik, Manyetizma, Dalgalar, Optik
Alt kategoriler: Özkütle, Dayanıklılık, Adezyon, Kohezyon, Katı Basıncı, Gaz Basıncı, Sıvı Basıncı, Newton'un Hareket Yasaları, Statik ve Kinetik Sürtünme Kuvveti, Elektrostatik, Elektriksel Kuvvet ve Elektrik Alanı, Elektrik Akımı, Elektriksel Enerji ve Güç, Mıknatıs, Manyetik Alan, Temel Dalga Bilgisi, Yay Dalgaları, Su Dalgaları, Ses Dalgaları, Deprem Dalgaları, Aydınlanma, Gölge, Düzlem Ayna, Küresel Ayna, Işığın Kırılması, Renkler, Mercekler`,
    
    "Kimya": `
Ana kategoriler: Simyada Kimyaya, Atom ve Yapısı, Periyodik Sistem, Kimyasal Türler Arası Etkileşimler, Maddenin Halleri, Doğa ve Kimya, Kimyanın Temel Kanunları, Kimyasal Hesaplamalar, Karışımlar, Asitler Bazlar ve Tuzlar, Kimya Her Yerde
Alt kategoriler: Kimyanın ve Kimyacıların Başlıca Çalışma Alanları, Kimyanın Sembolik Dili, Kimya Uygulamalarında İş Sağlığı ve Güvenliği, Atom Modelleri, Atomun Temel Parçaları, Atomla İlgili Terimler, Elementlerin Sınıflandırılması, Periyodik Özelliklerin Değişimi, Güçlü Etkileşimler, Zayıf Etkileşimler, Fiziksel Ve Kimyasal Özellikler, Katılar, Sıvılar, Gazlar, Kütlenin Korunumu, Sabit Oranlar Kanunu, Katlı Oranlar Kanunu, Mol Kavramı, Kimyasal Tepkimeler, Heterojen-Homojen Karışımlar, Çözünme Olgusu, Çözelti Derişimleri, Koligatif Özellikler, Ayırma ve Saflaştırma Teknikleri`,
    
    "Biyoloji": `
Ana kategoriler: Canlıların Ortak Özellikleri, Canlıların Temel Bileşenleri, Hücre ve Organeller, Madde Geçişleri, Canlıların Sınıflandırılması, Hücrede Bölünme, Üreme, Kalıtım, Ekosistem
Alt kategoriler: Karbonhidratlar, Yağlar, Proteinler, Enzimler, Hormonlar, Vitaminler, Nükleik Asitler, Metabolizma ve ATP, Bakteri, Arke, Protista, Mantarlar, Bitkiler, Omurgalı Hayvanlar, Omurgasız Hayvanlar, Mitoz Bölünme, Mayoz Bölünme, Eşeyli Üreme, Eşeysiz Üreme, Besin Piramitleri, Besin Zincirleri, Madde Döngüleri, Çevre`
  };

  return basePrompt + `
TYT dersleri ve kategorileri:

TÜRKÇE: Sözcükte Anlam, Deyim ve Atasözü, Cümlede Anlam, Ses Bilgisi, Yazım Kuralları, Noktalama İşaretleri, Sözcükte Yapı, Sözcük Grupları, Cümlenin Ögeleri, Cümle Türleri, Anlatım Bozukluğu, Paragraf, Sözcük Türleri, Fiiller

MATEMATİK: Temel Kavramlar, Sayı Basamakları, Bölme ve Bölünebilme, EBOB – EKOK, Rasyonel Sayılar, Basit Eşitsizlikler, Mutlak Değer, Üslü Sayılar, Köklü Sayılar, Çarpanlara Ayırma, Oran Orantı, Denklem Çözme, Problemler, Kümeler – Kartezyen Çarpım, Mantık, Fonksiyonlar, Polinomlar, 2.Dereceden Denklemler, Permütasyon ve Kombinasyon, Binom, Olasılık, Veri – İstatistik

GEOMETRİ: Temel Kavramlar, Doğruda Açılar, Üçgende Açılar, Özel Üçgenler, Açıortay, Kenarortay, Yükseklik, Eşlik ve Benzerlik, Üçgende Alan, Üçgende Benzerlik, Açı Kenar Bağıntıları, Çokgenler, Özel Dörtgenler, Çember ve Daire, Analitik Geometri, Katı Cisimler, Çemberin Analitiği

TARİH: Tarih ve Zaman, İnsanlığın İlk Dönemleri, Ortaçağ'da Dünya, İlk ve Orta Çağlarda Türk Dünyası, İslam Medeniyetinin Doğuşu, İlk Türk İslam Devletleri, Yerleşme ve Devletleşme Sürecinde Selçuklu Türkiyesi, Beylikten Devlete Osmanlı Siyaseti(1300-1453), Dünya Gücü Osmanlı Devleti (1453-1600), Yeni Çağ Avrupa Tarihi, Yakın Çağ Avrupa Tarihi, Osmanlı Devletinde Arayış Yılları, 18. Yüzyılda Değişim ve Diplomasi, En Uzun Yüzyıl, Osmanlı Kültür ve Medeniyeti, 20. Yüzyılda Osmanlı Devleti, I. Dünya Savaşı, Mondros Ateşkesi İşgaller ve Cemiyetler, Kurtuluş Savaşına Hazırlık Dönemi, I. TBMM Dönemi, Kurtuluş Savaşı ve Antlaşmalar, II. TBMM Dönemi ve Çok Partili Hayata Geçiş, Türk İnkılabı, Atatürk İlkeleri, Atatürk Dönemi Türk Dış Politikası

COĞRAFYA: Doğa ve İnsan, Dünya'nın Şekli ve Hareketleri, Coğrafi Konum, Harita Bilgisi, Atmosfer ve Sıcaklık, İklimler, Basınç ve Rüzgarlar, Nem Yağış ve Buharlaşma, İç Kuvvetler, Kayaçlar, Dış Kuvvetler, Su Toprak ve Bitkiler, Nüfus, Göç, Yerleşme, Türkiye'nin Yer Şekilleri, Ekonomik Faaliyetler, Bölgeler, Ulaşım, Çevre ve Toplum, Doğal Afetler

FELSEFE: Felsefenin Konusu, Bilgi Felsefesi, Varlık Felsefesi, Din Kültür ve Medeniyet, Ahlak Felsefesi, Sanat Felsefesi, Din Felsefesi, Siyaset Felsefesi, Bilim Felsefesi

DİN: İnanç, İbadet, Ahlak ve Değerler, Din Kültür ve Medeniyet, Hz. Mhammed, Vahiy ve Akıl, Dünya ve Ahiret, Kuran'a göre Hz. Muhammed, İnançla İlgili Meseleler, Yahudilik ve Hristiyanlık, İslam ve Bilim, Anadolu da İslam, İslam Düşüncesinde Tasavvufi Yorumlar, Güncel Dini Meseleler, Hint ve Çin Dinleri

FİZİK: Fizik Bilimine Giriş, Madde ve Özellikleri, Sıvıların Kaldırma Kuvveti, Basınç, Isı Sıcaklık ve Genleşme, Hareket ve Kuvvet, İş Güç ve Enerji, Elektrik, Manyetizma, Dalgalar, Optik

KİMYA: Simyada Kimyaya, Atom ve Yapısı, Periyodik Sistem, Kimyasal Türler Arası Etkileşimler, Maddenin Halleri, Doğa ve Kimya, Kimyanın Temel Kanunları, Kimyasal Hesaplamalar, Karışımlar, Asitler Bazlar ve Tuzlar, Kimya Her Yerde

BİYOLOJİ: Canlıların Ortak Özellikleri, Canlıların Temel Bileşenleri, Hücre ve Organeller, Madde Geçişleri, Canlıların Sınıflandırılması, Hücrede Bölünme, Üreme, Kalıtım, Ekosistem

Sadece JSON formatında yanıt ver, başka açıklama ekleme.`;
}

// Supabase bağlantısı
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';
const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const fileTypes = formData.getAll('file_types') as string[];
    const examId = formData.get('exam_id') as string | undefined;
    
    console.log('API received files:', files.length);
    console.log('API received file_types:', fileTypes);
    console.log('API received exam_id:', examId);
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 });
    }
    if (!examId) {
      return NextResponse.json({ error: 'exam_id eksik' }, { status: 400 });
    }

    const analyses: QuestionAnalysis[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileType = fileTypes[i] || 'wrong_answers'; // default to wrong_answers
      try {
        // Dosyayı buffer olarak oku
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        // Gemini'ye base64 olarak gönder
        const imagePart = {
          inlineData: {
            data: buffer.toString('base64'),
            mimeType: file.type || 'image/png',
          },
        };
        // Prompt + görseli gönder
        const result = await model.generateContent([
          getAnalysisPrompt(),
          imagePart,
        ]);
        const response = await result.response;
        const text = response.text();
        // JSON'u ayıkla
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}') + 1;
        if (jsonStart === -1 || jsonEnd === 0) throw new Error('Gemini yanıtında JSON bulunamadı');
        const jsonResponse = text.substring(jsonStart, jsonEnd);
        const rawAnalysis = JSON.parse(jsonResponse) as QuestionAnalysis;
        const analysis = normalizeAnalysisValues(rawAnalysis);
        
        // Remove question_status from analysis since we'll set it based on fileType
        delete analysis.question_status;
        
        analyses.push(analysis);
        // Duplicate kontrolü: Aynı exam_id ve question ile kayıt var mı?
        const { data: existing, error: checkError } = await supabase
          .from('question_analyses')
          .select('id')
          .eq('exam_id', examId)
          .eq('question', analysis.question)
          .maybeSingle();
        
        if (checkError) {
          console.error('Duplicate check error:', checkError);
        }
        
        if (!existing) {
          // Dosya türüne göre question_status ayarla
          const questionStatus = fileType === 'blank_answers' ? 'Boş' : 'Yanlış';
          
          console.log('Processing file:', file.name);
          console.log('File type:', fileType);
          console.log('Question status will be:', questionStatus);
          
          console.log('Inserting analysis:', {
            exam_id: examId,
            subject: analysis.subject,
            difficulty_level: analysis.difficulty_level,
            selectivity: analysis.selectivity,
            learning_level: analysis.learning_level,
            question_type: analysis.question_type,
            question_format: analysis.question_format,
            error_type: analysis.error_type,
            solution_strategy: analysis.solution_strategy,
            question_status: questionStatus
          });
          
          console.log('Full analysis object:', analysis);
          
          const { data: insertData, error: insertError } = await supabase.from('question_analyses').insert({
            exam_id: examId,
            question_status: questionStatus,
            ...analysis,
          });
          
          if (insertError) {
            console.error('Insert error:', insertError);
            console.error('Failed analysis data:', analysis);
            throw new Error(`Database insert failed: ${insertError.message}`);
          }
        }
      } catch (error) {
        console.error(`Dosya ${file.name} analizi başarısız:`, error);
      }
    }
    return NextResponse.json({
      success: true,
      analyses,
      message: `${analyses.length}/${files.length} dosya başarıyla analiz edildi`
    });
  } catch (error) {
    console.error('API analiz hatası:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Bilinmeyen hata',
      success: false
    }, { status: 500 });
  }
} 