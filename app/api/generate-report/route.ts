import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { examName, chartData, totalQuestions, examStats, detailedAnalyses } = await request.json();
    
    if (!examName || !chartData || !totalQuestions) {
      return NextResponse.json(
        { success: false, error: 'Eksik parametreler' },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Create detailed analysis prompt
    const prompt = `
Sen bir YKS (Yükseköğretim Kurumları Sınavı) uzmanısın. Aşağıdaki "${examName}" sınavı verilerini analiz ederek öğrenci için kişiselleştirilmiş bir performans raporu oluştur.

ÖNEMLİ NOT: Bu rapor sadece YANLIŞ VE BOŞ BIRAKILAN sorular için yapılmıştır. Doğru cevaplar analiz edilmemiştir.

SINAV VERİLERİ:
- Sınav Adı: ${examName}
- Toplam Analiz Edilen Soru (Yanlış/Boş): ${totalQuestions}

${examStats ? `
GENEL SINAV SONUÇLARI:
${examStats.map((stat: any) => `- ${stat.subject}: ${stat.correct} Doğru, ${stat.wrong} Yanlış, ${stat.blank} Boş (Net: ${stat.net})`).join('\n')}
` : ''}

YANLIŞ/BOŞ SORULARIN ZORLUK SEVİYESİ DAĞILIMI:
${chartData.difficulty.map((d: any) => `- ${d.level}: ${d.count} soru`).join('\n')}

HATA TÜRLERİ DAĞILIMI:
${chartData.errorType.map((d: any) => `- ${d.type}: ${d.count} soru`).join('\n')}

DERS DAĞILIMI (Yanlış/Boş):
${chartData.subject.map((d: any) => `- ${d.subject}: ${d.count} soru`).join('\n')}

SORU DURUMU:
${chartData.status.map((d: any) => `- ${d.status}: ${d.count} soru`).join('\n')}

SEÇİCİLİK DAĞILIMI:
${chartData.selectivity.map((d: any) => `- ${d.level}: ${d.count} soru`).join('\n')}

ÖĞRENME SEVİYESİ DAĞILIMI:
${chartData.learningLevel.map((d: any) => `- ${d.level}: ${d.count} soru`).join('\n')}

${detailedAnalyses && detailedAnalyses.length > 0 ? `
DETAYLI SORU ANALİZLERİ:
${detailedAnalyses.map((analysis: any) => `
- ${analysis.subject} - ${analysis.topic} (${analysis.sub_achievement})
  * Durum: ${analysis.question_status}
  * Zorluk: ${analysis.difficulty_level}
  * Hata Türü: ${analysis.error_type}
  * Çözüm Stratejisi: ${analysis.solution_strategy}
  * Öğrenme Seviyesi: ${analysis.learning_level}
  * Seçicilik: ${analysis.selectivity}
`).join('\n')}
` : ''}

RAPOR İÇERİK REHBERİ:
Bu rapor örnek PDF'deki gibi olmalı. Şu yapıyı takip et:

1. GENEL DEĞERLENDİRME
   - Sınav performansının genel analizi
   - Güçlü ve zayıf yönlerin belirlenmesi
   - Net skorların değerlendirilmesi

2. DERS BAZLI ANALİZ
   - Her ders için detaylı analiz
   - SPESİFİK KONU ADLARINı kullan (örn: "Sözcükte Anlam", "Oran Orantı", "Basınç")
   - O derste yapılan hataların türü
   - Ders bazlı öneriler
   - Alt kazanımları belirt (örn: "Parçada Boşluk Doldurma", "Doğrusal ilişkiyi kullanarak problem çözme")

3. HATA ANALİZİ
   - Kavramsal hatalar: Hangi konularda kavram eksikliği var
   - İşlem hataları: Hangi derslerde işlem hatası yapılıyor
   - Okuma hataları: Hangi soru türlerinde okuma problemi var
   - Dikkatsizlik hataları: Hangi durumlarda dikkatsizlik yapılıyor
   - Her hata türü için SPESİFİK öneriler

4. ÇÖZÜM STRATEJİSİ ANALİZİ
   - "Çıkarım yapma" stratejisinde zorluk yaşanıyorsa: Hangi derslerde ve neden
   - "Eleyerek çözüm" stratejisinde zorluk yaşanıyorsa: Hangi soru türlerinde
   - "Adım Adım" çözüm gerektiren sorularda: Hangi aşamada takılıyor
   - "Doğrudan Formül" kullanımında: Formül bilgisi eksikliği var mı
   - Strateji bazlı öneriler

5. ZORLUK SEVİYESİ ANALİZİ
   - Kolay sorulardaki performans: Hangi konularda bile zorluk yaşanıyor
   - Orta seviye sorulardaki performans: En çok hangi derslerde problem var
   - Zor sorulardaki performans: Hangi stratejiler işe yaramıyor
   - Seviye bazlı strateji önerileri

6. ÇALIŞMA ÖNERİLERİ
   - SPESİFİK konu bazlı çalışma planı (konu adlarını kullan)
   - Zaman yönetimi
   - Çözüm stratejileri geliştirme
   - Tekrar programı

7. HEDEF VE MOTİVASYON
   - Gelecek denemeler için hedefler
   - Motivasyonel mesajlar
   - Başarı için somut adımlar

ÖNEMLİ TALİMATLAR:
- Detaylı soru analizlerindeki SPESİFİK konu adlarını kullan
- "Türkçe: Bir soruyu yanlış cevaplamışsın" yerine "Türkçe - Sözcükte Anlam konusunda Parçada Boşluk Doldurma alt kazanımında zorluk yaşamışsın" yaz
- Çözüm stratejilerini analiz et: "Eleyerek çözüm stratejisinde zorluk yaşıyor olabilirsin" gibi
- Hata türlerini konu bazlı analiz et: "Kavramsal hatalar özellikle Matematik - Oran Orantı konusunda görülüyor"
- Zorluk seviyelerini karşılaştır: "Orta seviye sorularda özellikle Fizik - Basınç konusunda zorlanıyorsun"
- Boş bırakılan sorular için farklı yaklaşım: "Bu soruyu boş bırakmışsın, konu bilgisi eksikliği olabilir"
- Yanlış cevaplanan sorular için: "Bu soruyu yanlış cevaplamışsın, çözüm stratejisi problemi olabilir"

YAZIM STILI:
- Samimi ve destekleyici ton kullan
- Somut sayılar ve yüzdeler ver
- Pratik öneriler sun
- Pozitif yaklaşım sergile
- Türkçe yazım kurallarına uy
- Paragraflar halinde düzenle
- HİÇBİR MARKDOWN FORMATLAMASI KULLANMA
- ** işaretleri kullanma
- ### işaretleri kullanma
- # işaretleri kullanma
- Başlıkları düz metin olarak yaz
- Sadece normal paragraf metni kullan

Raporu oluştur:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const report = response.text();

    return NextResponse.json({
      success: true,
      report: report
    });

  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Rapor oluşturulurken hata oluştu' },
      { status: 500 }
    );
  }
} 