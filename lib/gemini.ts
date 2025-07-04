export interface QuestionAnalysis {
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

// API route'u çağırarak resim analizi
export async function analyzeQuestionImage(file: File): Promise<QuestionAnalysis> {
  const formData = new FormData();
  formData.append('files', file);
  
  const response = await fetch('/api/analyze-image', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API çağrısı başarısız');
  }
  
  const result = await response.json();
  
  if (!result.success || !result.analyses || result.analyses.length === 0) {
    throw new Error('Analiz başarısız');
  }
  
  return result.analyses[0];
}

// Batch analiz
export async function batchAnalyzeImages(
  files: File[],
  examId: string,
  onProgress?: (current: number, total: number) => void
): Promise<QuestionAnalysis[]> {
  const formData = new FormData();
  formData.append('exam_id', examId);
  files.forEach(file => {
    formData.append('files', file);
  });
  const response = await fetch('/api/analyze-image', {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API çağrısı başarısız');
  }
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Analiz başarısız');
  }
  // Progress callback'i çağır
  if (onProgress) {
    onProgress(files.length, files.length);
  }
  return result.analyses || [];
} 