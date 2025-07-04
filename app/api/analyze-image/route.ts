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
}

const ANALYSIS_PROMPT = `
Aşağıdaki görseldeki Türkiye üniversite sınavı (TYT/AYT) sorusunu analiz et ve aşağıdaki bilgileri JSON formatında döndür:
{
  "date": "YYYY-MM-DD formatında bugünün tarihi",
  "question": "Sorunun tam metni (Türkçe)",
  "source": "Kaynak bilgisi (TYT/AYT ve yıl)",
  "subject": "Ders adı (Matematik, Fizik, Kimya, Biyoloji, Türkçe, Sosyal Bilimler vb.)",
  "topic": "Ana konu başlığı",
  "related_topics": ["konu1", "konu2", "konu3"],
  "sub_achievement": "Alt kazanım",
  "difficulty_level": "Easy/Medium/Hard seçeneklerinden biri",
  "selectivity": "High/Medium/Low seçeneklerinden biri",
  "learning_level": "Knowledge/Comprehension/Application/Analysis/Synthesis/Evaluation seçeneklerinden biri",
  "new_generation_question": true,
  "question_type": "Multiple Choice/Open Ended/Fill in the Blank/True False/Matching seçeneklerinden biri",
  "solution_time": 120,
  "question_format": "Text Only/Text with Image/Graph/Table/Diagram seçeneklerinden biri",
  "error_type": "Conceptual/Computational/Reading/Careless/Time Management seçeneklerinden biri",
  "solution_strategy": "Direct Formula/Step by Step/Elimination/Estimation/Graphical seçeneklerinden biri",
  "solution_steps_count": 3
}
Önemli notlar:
- related_topics: Array olarak döndür
- new_generation_question: Boolean olarak döndür (true/false)
- solution_time: Saniye cinsinden sayı olarak döndür
- solution_steps_count: Sayı olarak döndür
- Tüm enum alanlar için sadece belirtilen seçenekleri kullan
- Sadece JSON formatında yanıt ver, başka açıklama ekleme.
`;

// Supabase bağlantısı
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';
const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const examId = formData.get('exam_id') as string | undefined;
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 });
    }
    if (!examId) {
      return NextResponse.json({ error: 'exam_id eksik' }, { status: 400 });
    }

    const analyses: QuestionAnalysis[] = [];
    for (const file of files) {
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
          ANALYSIS_PROMPT,
          imagePart,
        ]);
        const response = await result.response;
        const text = response.text();
        // JSON'u ayıkla
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}') + 1;
        if (jsonStart === -1 || jsonEnd === 0) throw new Error('Gemini yanıtında JSON bulunamadı');
        const jsonResponse = text.substring(jsonStart, jsonEnd);
        const analysis = JSON.parse(jsonResponse) as QuestionAnalysis;
        analyses.push(analysis);
        // Duplicate kontrolü: Aynı exam_id ve question ile kayıt var mı?
        const { data: existing, error: checkError } = await supabase
          .from('question_analyses')
          .select('id')
          .eq('exam_id', examId)
          .eq('question', analysis.question)
          .maybeSingle();
        if (!existing) {
          await supabase.from('question_analyses').insert({
            exam_id: examId,
            ...analysis,
          });
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