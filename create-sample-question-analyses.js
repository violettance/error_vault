const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'your-supabase-url',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'
);

// Subjects data from database
const subjectsData = [
  { subject_name: "Fen Bilimleri", total_wrong: 15, total_blank: 14, total_questions: 29 },
  { subject_name: "Sosyal Bilimler", total_wrong: 11, total_blank: 6, total_questions: 17 },
  { subject_name: "Temel Matematik", total_wrong: 8, total_blank: 33, total_questions: 41 },
  { subject_name: "Türkçe", total_wrong: 15, total_blank: 16, total_questions: 31 }
];

// TYT Topics by subject
const tytTopics = {
  "Türkçe": [
    "Dilbilgisi Kuralları",
    "Sözcükte Anlam",
    "Paragrafın Anlamı", 
    "Cümlede Anlam",
    "Anlatım Bozuklukları",
    "Yazım Kuralları",
    "Noktalama İşaretleri",
    "Ses Bilgisi",
    "Kelime Türleri",
    "Cümle Bilgisi",
    "Okuduğunu Anlama",
    "Parçada Anlam"
  ],
  "Matematik": [
    "Temel Kavramlar",
    "Sayı Basamakları", 
    "Bölme ve Bölünebilme",
    "EBOB-EKOK",
    "Rasyonel Sayılar",
    "Basit Eşitsizlikler",
    "Mutlak Değer",
    "Üslü Sayılar",
    "Köklü Sayılar",
    "Çarpanlara Ayırma",
    "Oran-Orantı",
    "Denklem Çözme",
    "Problemler",
    "Mantık",
    "Kümeler",
    "Fonksiyonlar",
    "Permütasyon-Kombinasyon",
    "Olasılık",
    "İstatistik"
  ],
  "Geometri": [
    "Temel Geometri",
    "Açılar",
    "Üçgenler",
    "Dörtgenler",
    "Çember ve Daire",
    "Çokgenler",
    "Alan Hesaplamaları",
    "Hacim Hesaplamaları",
    "Benzerlik ve Eşlik",
    "Analitik Geometri"
  ],
  "Fizik": [
    "Fizik Bilimine Giriş",
    "Madde ve Özellikleri",
    "Hareket ve Kuvvet",
    "Enerji",
    "Isı ve Sıcaklık",
    "Elektrostatik",
    "Elektrik Akımı",
    "Manyetizma",
    "Dalgalar",
    "Optik"
  ],
  "Kimya": [
    "Kimya Bilimine Giriş",
    "Atom ve Periyodik Sistem",
    "Kimyasal Türler Arası Etkileşimler",
    "Maddenin Halleri",
    "Doğa ve Kimya",
    "Kimyasal Tepkimeler",
    "Asitler ve Bazlar",
    "Kimya Her Yerde"
  ],
  "Biyoloji": [
    "Biyoloji Bilimi",
    "Hücre",
    "Canlıların Çeşitliliği ve Sınıflandırılması",
    "Hücre Bölünmeleri",
    "Kalıtım",
    "Ekosistem Ekolojisi",
    "Güncel Çevre Sorunları"
  ],
  "Tarih": [
    "Tarih Öncesi Çağlar",
    "İlk Çağ Tarihi",
    "Orta Çağ Tarihi",
    "Yeni Çağ Tarihi",
    "Yakın Çağ Tarihi",
    "Osmanlı Devleti",
    "Türkiye Cumhuriyeti Tarihi",
    "Atatürk İlkeleri ve İnkılap Tarihi"
  ],
  "Coğrafya": [
    "Coğrafya Bilimi",
    "Haritalar",
    "Yeryüzünde Konum",
    "Fiziki Coğrafya",
    "İklim ve Bitki Örtüsü",
    "Türkiye'nin Coğrafi Özellikleri",
    "Beşeri Coğrafya",
    "Ekonomik Coğrafya",
    "Çevre ve Toplum"
  ],
  "Felsefe": [
    "Felsefe Nedir?",
    "Bilgi Felsefesi",
    "Varlık Felsefesi",
    "Ahlak Felsefesi",
    "Siyaset Felsefesi",
    "Sanat Felsefesi",
    "Din Felsefesi",
    "Mantık"
  ],
  "Din": [
    "İnanç Esasları",
    "İbadetler",
    "Ahlak",
    "Siyer",
    "Kur'an-ı Kerim",
    "Hz. Muhammed'in Hayatı",
    "İslam Tarihi",
    "Güncel Dini Meseleler"
  ]
};

// Subject mapping for alt dersler
const subjectMapping = {
  "Türkçe": ["Türkçe"],
  "Temel Matematik": ["Matematik", "Geometri"], 
  "Fen Bilimleri": ["Fizik", "Kimya", "Biyoloji"],
  "Sosyal Bilimler": ["Tarih", "Coğrafya", "Felsefe", "Din"]
};

// Sample values for other fields
const difficultyLevels = ["Easy", "Medium", "Hard"];
const selectivityLevels = ["High", "Medium", "Low"];
const learningLevels = ["Knowledge", "Comprehension", "Application", "Analysis", "Synthesis", "Evaluation"];
const questionTypes = ["Multiple Choice", "Open Ended", "Fill in the Blank", "True False", "Matching"];
const questionFormats = ["Text Only", "Text with Image", "Graph", "Table", "Diagram"];
const errorTypes = ["Conceptual", "Computational", "Reading", "Careless", "Time Management"];
const solutionStrategies = ["Direct Formula", "Step by Step", "Elimination", "Estimation", "Graphical"];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateQuestionAnalyses() {
  const analyses = [];
  const examId = "bba701cb-a771-4d71-b8d7-f3f3023a164b"; // From database
  
  // For each main subject, distribute questions among sub-subjects
  subjectsData.forEach(mainSubject => {
    const subSubjects = subjectMapping[mainSubject.subject_name];
    const totalQuestions = mainSubject.total_questions;
    
    // Distribute questions among sub-subjects
    const questionsPerSubSubject = Math.floor(totalQuestions / subSubjects.length);
    const remainder = totalQuestions % subSubjects.length;
    
    subSubjects.forEach((subSubject, index) => {
      let questionsForThisSubject = questionsPerSubSubject;
      if (index < remainder) {
        questionsForThisSubject += 1;
      }
      
      const topics = tytTopics[subSubject] || ["Genel Konu"];
      
      // Generate questions for this sub-subject
      for (let i = 0; i < questionsForThisSubject; i++) {
        const topic = getRandomElement(topics);
        const relatedTopics = topics.filter(t => t !== topic).slice(0, getRandomInt(1, 3));
        
        const analysis = {
          exam_id: examId,
          date: "2024-12-01",
          question: `${subSubject} - ${topic} konusundan örnek soru ${i + 1}`,
          source: "TYT 2024",
          subject: subSubject,
          topic: topic,
          related_topics: relatedTopics,
          sub_achievement: `${topic} konusunda temel beceriler`,
          difficulty_level: getRandomElement(difficultyLevels),
          selectivity: getRandomElement(selectivityLevels),
          learning_level: getRandomElement(learningLevels),
          new_generation_question: Math.random() > 0.5,
          question_type: getRandomElement(questionTypes),
          solution_time: getRandomInt(60, 300),
          question_format: getRandomElement(questionFormats),
          error_type: getRandomElement(errorTypes),
          solution_strategy: getRandomElement(solutionStrategies),
          solution_steps_count: getRandomInt(2, 8)
        };
        
        analyses.push(analysis);
      }
    });
  });
  
  return analyses;
}

async function insertQuestionAnalyses() {
  try {
    const analyses = generateQuestionAnalyses();
    console.log(`Generated ${analyses.length} question analyses`);
    
    // Insert in batches to avoid timeout
    const batchSize = 20;
    for (let i = 0; i < analyses.length; i += batchSize) {
      const batch = analyses.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('question_analyses')
        .insert(batch);
      
      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
        return;
      }
      
      console.log(`Inserted batch ${i / batchSize + 1}/${Math.ceil(analyses.length / batchSize)}`);
    }
    
    console.log('All question analyses inserted successfully!');
    
    // Verify the count
    const { count, error: countError } = await supabase
      .from('question_analyses')
      .select('*', { count: 'exact', head: true })
      .eq('exam_id', 'bba701cb-a771-4d71-b8d7-f3f3023a164b');
    
    if (countError) {
      console.error('Error counting records:', countError);
    } else {
      console.log(`Total records in database: ${count}`);
    }
    
  } catch (err) {
    console.error('Exception:', err);
  }
}

// Run the script
insertQuestionAnalyses(); 