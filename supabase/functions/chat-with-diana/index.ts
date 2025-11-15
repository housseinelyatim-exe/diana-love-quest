import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Predefined question list - sequential order prevents re-asking
const QUESTION_LIST = [
  { field: 'name', category: 'basic' },
  { field: 'age', category: 'basic' },
  { field: 'gender', category: 'basic' },
  { field: 'where_was_born', category: 'location' },
  { field: 'where_he_live', category: 'location' },
  { field: 'where_want_to_live', category: 'location' },
  { field: 'marital_status', category: 'family' },
  { field: 'have_children', category: 'family' },
  { field: 'want_children', category: 'family' },
  { field: 'education_lvl', category: 'career' },
  { field: 'employment_status', category: 'career' },
  { field: 'job', category: 'career' },
  { field: 'height', category: 'physical' },
  { field: 'religion', category: 'values' },
  { field: 'practice_lvl', category: 'values' },
  { field: 'smoking', category: 'lifestyle' },
  { field: 'drinking', category: 'lifestyle' },
  { field: 'have_pet', category: 'lifestyle' },
  { field: 'dietary_habits', category: 'lifestyle' },
  { field: 'sleep_habits', category: 'lifestyle' },
  { field: 'life_goal', category: 'values' },
  { field: 'physical_activities', category: 'hobbies' },
  { field: 'cultural_activities', category: 'hobbies' },
  { field: 'creative_hobbies', category: 'hobbies' },
  { field: 'gaming_hobbies', category: 'hobbies' },
  { field: 'travel_frequency', category: 'travel' },
  { field: 'type_of_trips', category: 'travel' },
  { field: 'travel_style', category: 'travel' },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory, userId } = await req.json();
    console.log('💬 Chat request:', { userId, messageLength: message?.length || 0 });
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    console.log('👤 Profile data:', profile);

    // Initial greeting
    if (!message || message.trim() === '') {
      const lang = profile?.language || 'en';
      const greetings: Record<string, string> = {
        en: "Hi! I'm Diana, your matchmaking assistant. Let's build your profile! What's your name?",
        fr: "Bonjour ! Je suis Diana. Commençons par votre nom ?",
        ar: "مرحباً! أنا ديانا. ما اسمك؟",
        tn: "مرحبا! أنا ديانا. شنوّا اسمك؟"
      };

      return new Response(JSON.stringify({
        response: greetings[lang] || greetings.en,
        profileCompletion: calculateProfileCompletion(profile),
        currentCategory: determineCurrentCategory(profile).current,
        completedCategories: determineCurrentCategory(profile).completed
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const lang = profile?.language || 'en';

    // Build system prompt
    const systemPrompt = `You are Diana, a friendly matchmaking assistant.

PROFILE STATUS:
${JSON.stringify(profile, null, 2)}

Completion: ${calculateProfileCompletion(profile)}%

RULES:
1. Keep responses under 50 words
2. Ask ONE question at a time  
3. Extract profile data when provided
4. Language: ${lang}
5. Next question: ${getNextQuestion(profile, lang)}`;

    // Call AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...(conversationHistory || []).slice(-10),
          { role: 'user', content: message }
        ],
        tool_choice: 'auto',
        tools: [{
          type: 'function',
          function: {
            name: 'extract_profile_data',
            description: 'Extract profile information',
            parameters: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                age: { type: 'number' },
                gender: { type: 'string', enum: ['male', 'female', 'other'] },
                where_was_born: { type: 'string' },
                where_he_live: { type: 'string' },
                where_want_to_live: { type: 'string' },
                marital_status: { type: 'string', enum: ['single', 'divorced', 'widowed'] },
                have_children: { type: 'string', enum: ['yes', 'no', 'prefer_not_to_say'] },
                want_children: { type: 'string', enum: ['yes', 'no', 'prefer_not_to_say'] },
                education_lvl: { type: 'string', enum: ['high_school', 'bachelor', 'master', 'phd', 'vocational', 'other'] },
                employment_status: { type: 'string', enum: ['employed', 'self_employed', 'student', 'unemployed', 'retired'] },
                job: { type: 'string' },
                height: { type: 'number' },
                religion: { type: 'string', enum: ['muslim', 'christian', 'jewish', 'buddhist', 'hindu', 'other', 'none'] },
                practice_lvl: { type: 'string', enum: ['very_religious', 'religious', 'moderate', 'not_religious'] },
                smoking: { type: 'string', enum: ['yes', 'no', 'prefer_not_to_say'] },
                drinking: { type: 'string', enum: ['yes', 'no', 'prefer_not_to_say'] },
                have_pet: { type: 'string', enum: ['yes', 'no', 'prefer_not_to_say'] },
                dietary_habits: { type: 'string' },
                sleep_habits: { type: 'string' },
                life_goal: { type: 'string' },
                physical_activities: { type: 'array', items: { type: 'string' } },
                cultural_activities: { type: 'array', items: { type: 'string' } },
                creative_hobbies: { type: 'array', items: { type: 'string' } },
                gaming_hobbies: { type: 'array', items: { type: 'string' } },
                travel_frequency: { type: 'string', enum: ['never', 'rarely', 'sometimes', 'often', 'very_often'] },
                type_of_trips: { type: 'string' },
                travel_style: { type: 'string' }
              }
            }
          }
        }]
      })
    });

    if (!aiResponse.ok) {
      throw new Error('AI API failed');
    }

    const aiData = await aiResponse.json();
    const aiMessage = aiData.choices?.[0]?.message;
    let responseText = aiMessage?.content || 'Could you rephrase that?';

    // Extract and update profile
    let extractedData: any = null;
    if (aiMessage?.tool_calls?.length > 0) {
      for (const toolCall of aiMessage.tool_calls) {
        if (toolCall.function?.name === 'extract_profile_data') {
          try {
            extractedData = JSON.parse(toolCall.function.arguments);
            console.log('📝 Extracted:', extractedData);
          } catch (e) {
            console.error('Parse error:', e);
          }
        }
      }
    }

    // Update with progress tracking
    if (extractedData && Object.keys(extractedData).length > 0) {
      const answeredFields = Object.keys(extractedData);
      const askedQuestions = profile?.asked_questions || [];
      const updatedAsked = [...new Set([...askedQuestions, ...answeredFields])];
      
      const nextIdx = QUESTION_LIST.findIndex((q, idx) => 
        idx >= (profile?.current_question_index || 0) &&
        !profile?.[q.field] &&
        !updatedAsked.includes(q.field)
      );
      
      await supabase
        .from('profiles')
        .update({
          ...extractedData,
          asked_questions: updatedAsked,
          current_question_index: nextIdx >= 0 ? nextIdx : QUESTION_LIST.length
        })
        .eq('id', userId);
      
      console.log('✅ Profile updated with progress');
    }

    // Store messages
    await supabase.from('messages').insert([
      { sender_id: userId, content: message, is_from_diana: false },
      { sender_id: userId, content: responseText, is_from_diana: true }
    ]);

    // Get updated profile
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    return new Response(JSON.stringify({
      response: responseText,
      profileCompletion: calculateProfileCompletion(updatedProfile),
      currentCategory: determineCurrentCategory(updatedProfile).current,
      completedCategories: determineCurrentCategory(updatedProfile).completed
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      response: 'Sorry, something went wrong. Please try again.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function getNextQuestion(p: any, lang: string): string {
  const questions: Record<string, Record<string, string>> = {
    en: {
      name: "What's your name?",
      age: "How old are you?",
      gender: "What's your gender?",
      where_was_born: "Where were you born?",
      where_he_live: "Where do you currently live?",
      where_want_to_live: "Where would you like to live?",
      marital_status: "What's your marital status?",
      have_children: "Do you have children?",
      want_children: "Do you want children?",
      education_lvl: "What's your education level?",
      employment_status: "What's your employment status?",
      job: "What do you do for work?",
      height: "What's your height in cm?",
      religion: "What's your religion?",
      practice_lvl: "How religious are you?",
      smoking: "Do you smoke?",
      drinking: "Do you drink?",
      have_pet: "Do you have pets?",
      dietary_habits: "Tell me about your diet.",
      sleep_habits: "What are your sleep habits?",
      life_goal: "What are your life goals?",
      physical_activities: "What sports do you enjoy?",
      cultural_activities: "What cultural activities interest you?",
      creative_hobbies: "Any creative hobbies?",
      gaming_hobbies: "Do you game?",
      travel_frequency: "How often do you travel?",
      type_of_trips: "What kind of trips do you like?",
      travel_style: "How do you travel?",
      fallback: "Anything else to share?"
    },
    fr: {
      name: "Comment vous appelez-vous ?",
      age: "Quel âge avez-vous ?",
      gender: "Quel est votre genre ?",
      where_was_born: "Où êtes-vous né(e) ?",
      where_he_live: "Où habitez-vous ?",
      where_want_to_live: "Où aimeriez-vous vivre ?",
      marital_status: "Statut marital ?",
      have_children: "Avez-vous des enfants ?",
      want_children: "Voulez-vous des enfants ?",
      education_lvl: "Niveau d'études ?",
      employment_status: "Situation professionnelle ?",
      job: "Que faites-vous ?",
      height: "Votre taille en cm ?",
      religion: "Votre religion ?",
      practice_lvl: "Niveau de pratique religieuse ?",
      smoking: "Fumez-vous ?",
      drinking: "Buvez-vous ?",
      have_pet: "Avez-vous des animaux ?",
      dietary_habits: "Vos habitudes alimentaires ?",
      sleep_habits: "Vos habitudes de sommeil ?",
      life_goal: "Vos objectifs de vie ?",
      physical_activities: "Quels sports aimez-vous ?",
      cultural_activities: "Activités culturelles ?",
      creative_hobbies: "Hobbies créatifs ?",
      gaming_hobbies: "Aimez-vous les jeux ?",
      travel_frequency: "Fréquence de voyage ?",
      type_of_trips: "Type de voyages ?",
      travel_style: "Style de voyage ?",
      fallback: "Autre chose à partager ?"
    },
    ar: {
      name: "ما اسمك؟",
      age: "كم عمرك؟",
      gender: "ما جنسك؟",
      where_was_born: "أين ولدت؟",
      where_he_live: "أين تعيش؟",
      where_want_to_live: "أين تود أن تعيش؟",
      marital_status: "حالتك الاجتماعية؟",
      have_children: "هل لديك أطفال؟",
      want_children: "هل ترغب في أطفال؟",
      education_lvl: "مستواك التعليمي؟",
      employment_status: "وضعك المهني؟",
      job: "ماذا تعمل؟",
      height: "ما طولك بالسم؟",
      religion: "ما ديانتك؟",
      practice_lvl: "مستوى ممارستك الدينية؟",
      smoking: "هل تدخن؟",
      drinking: "هل تشرب الكحول؟",
      have_pet: "هل لديك حيوانات؟",
      dietary_habits: "عن عاداتك الغذائية؟",
      sleep_habits: "عادات نومك؟",
      life_goal: "أهدافك في الحياة؟",
      physical_activities: "ما الرياضات التي تحبها؟",
      cultural_activities: "الأنشطة الثقافية؟",
      creative_hobbies: "هوايات إبداعية؟",
      gaming_hobbies: "هل تحب الألعاب؟",
      travel_frequency: "كم مرة تسافر؟",
      type_of_trips: "نوع الرحلات؟",
      travel_style: "أسلوب سفرك؟",
      fallback: "شيء آخر؟"
    },
    tn: {
      name: "شنوّا اسمك؟",
      age: "قدّاش عمرك؟",
      gender: "شنوّا جنسك؟",
      where_was_born: "وين تولدت؟",
      where_he_live: "وين ساكن؟",
      where_want_to_live: "وين تحب تسكن؟",
      marital_status: "حالتك العائلية؟",
      have_children: "عندك صغار؟",
      want_children: "تحب يكون عندك صغار؟",
      education_lvl: "مستواك القرايي؟",
      employment_status: "وضعك المهني؟",
      job: "شنوّا تخدم؟",
      height: "قدّاش طولك بالسم؟",
      religion: "شنوّا ديانتك؟",
      practice_lvl: "مستوى ممارستك الدينية؟",
      smoking: "تشرب السجاير؟",
      drinking: "تشرب الكحول؟",
      have_pet: "عندك حيوانات؟",
      dietary_habits: "عاداتك في الماكلة؟",
      sleep_habits: "عاداتك في النوم؟",
      life_goal: "أهدافك في الحياة؟",
      physical_activities: "شنيّا الرياضات اللي تحبها؟",
      cultural_activities: "الأنشطة الثقافية؟",
      creative_hobbies: "هوايات إبداعية؟",
      gaming_hobbies: "تحب الألعاب؟",
      travel_frequency: "قدّاش مرة تسافر؟",
      type_of_trips: "شنوع الرحلات؟",
      travel_style: "أسلوبك في السفر؟",
      fallback: "حاجة أخرى؟"
    }
  };

  const t = (key: string) => questions[lang]?.[key] || questions.en[key] || questions.en.fallback;

  const currentIndex = p?.current_question_index || 0;
  const askedQuestions = p?.asked_questions || [];
  
  // Find next unanswered from predefined list
  for (let i = currentIndex; i < QUESTION_LIST.length; i++) {
    const { field } = QUESTION_LIST[i];
    if (!p?.[field] && !askedQuestions.includes(field)) {
      return t(field);
    }
  }
  
  // Check for any missed
  for (const { field } of QUESTION_LIST) {
    if (!p?.[field] && !askedQuestions.includes(field)) {
      return t(field);
    }
  }
  
  return t('fallback');
}

function calculateProfileCompletion(profile: any): number {
  if (!profile) return 0;
  const fields = QUESTION_LIST.map(q => q.field);
  const filled = fields.filter(f => profile?.[f] != null && profile?.[f] !== '').length;
  return Math.round((filled / fields.length) * 100);
}

function determineCurrentCategory(profile: any): { current: string; completed: string[] } {
  const categories = ['basic', 'location', 'family', 'career', 'physical', 'values', 'lifestyle', 'hobbies', 'travel'];
  const completed: string[] = [];
  let current = 'basic';
  
  for (const cat of categories) {
    const catFields = QUESTION_LIST.filter(q => q.category === cat);
    const allFilled = catFields.every(q => profile?.[q.field] != null);
    
    if (allFilled) {
      completed.push(cat);
    } else if (completed.length > 0 && current === 'basic') {
      current = cat;
    }
  }
  
  if (completed.length === categories.length) {
    current = 'complete';
  }
  
  return { current, completed };
}
