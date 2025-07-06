import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { examName, chartData, totalQuestions } = await request.json();
    
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

SINAV VERİLERİ:
- Sınav Adı: ${examName}
- Toplam Analiz Edilen Soru: ${totalQuestions}

ZORLUK SEVİYESİ DAĞILIMI:
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

RAPOR İÇERİK REHBERİ:
1. Genel Değerlendirme ile başla
2. Her ana ders için detaylı analiz (Türkçe, Matematik, Geometri, Fen Bilimleri, Sosyal Bilimler)
3. Güçlü ve zayıf yönleri belirle
4. Hata türlerini analiz et
5. Zaman yönetimi önerileri
6. Konu bazlı çalışma önerileri
7. Strateji önerileri
8. Motivasyonel son paragraf

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