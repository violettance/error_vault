const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'your-supabase-url',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'
);

async function getSubjects() {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching subjects:', error);
      return;
    }

    console.log('Subjects data:');
    console.log(JSON.stringify(data, null, 2));
    
    // Calculate totals for each subject
    const subjectTotals = {};
    data.forEach(subject => {
      const name = subject.subject_name;
      if (!subjectTotals[name]) {
        subjectTotals[name] = { wrong: 0, blank: 0, total: 0 };
      }
      subjectTotals[name].wrong += subject.wrong_answers || 0;
      subjectTotals[name].blank += subject.blank_answers || 0;
      subjectTotals[name].total += (subject.wrong_answers || 0) + (subject.blank_answers || 0);
    });
    
    console.log('\nSubject totals for question_analyses:');
    console.log(JSON.stringify(subjectTotals, null, 2));
    
  } catch (err) {
    console.error('Exception:', err);
  }
}

getSubjects(); 