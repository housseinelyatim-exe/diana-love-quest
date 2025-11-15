import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Predefined question list - comprehensive coverage of all profile fields
const QUESTION_LIST = [
  // Basic Info (3 questions)
  { field: 'name', category: 'basic' },
  { field: 'age', category: 'basic' },
  { field: 'gender', category: 'basic' },
  
  // Location (3 questions)
  { field: 'where_was_born', category: 'location' },
  { field: 'where_he_live', category: 'location' },
  { field: 'where_want_to_live', category: 'location' },
  
  // Physical (2 questions)
  { field: 'height', category: 'physical' },
  { field: 'height_preference', category: 'physical' },
  
  // Family (3 questions)
  { field: 'marital_status', category: 'family' },
  { field: 'have_children', category: 'family' },
  { field: 'want_children', category: 'family' },
  
  // Career (4 questions)
  { field: 'education_lvl', category: 'career' },
  { field: 'employment_status', category: 'career' },
  { field: 'job', category: 'career' },
  { field: 'work_life_balance', category: 'career' },
  
  // Values & Religion (3 questions)
  { field: 'religion', category: 'values' },
  { field: 'practice_lvl', category: 'values' },
  { field: 'life_goal', category: 'values' },
  
  // Health & Wellness (4 questions)
  { field: 'health', category: 'health' },
  { field: 'disabilities_and_special_need', category: 'health' },
  { field: 'disabilities_and_special_need_type', category: 'health' },
  { field: 'health_disability_preference', category: 'health' },
  
  // Lifestyle Habits (5 questions)
  { field: 'smoking', category: 'lifestyle' },
  { field: 'drinking', category: 'lifestyle' },
  { field: 'dietary_habits', category: 'lifestyle' },
  { field: 'sleep_habits', category: 'lifestyle' },
  { field: 'volunteer_community_work', category: 'lifestyle' },
  
  // Pets (2 questions)
  { field: 'have_pet', category: 'pets' },
  { field: 'pet', category: 'pets' },
  
  // Hobbies & Activities (4 questions)
  { field: 'physical_activities', category: 'hobbies' },
  { field: 'cultural_activities', category: 'hobbies' },
  { field: 'creative_hobbies', category: 'hobbies' },
  { field: 'gaming_hobbies', category: 'hobbies' },
  
  // Travel (4 questions)
  { field: 'travel_frequency', category: 'travel' },
  { field: 'type_of_trips', category: 'travel' },
  { field: 'travel_style', category: 'travel' },
  { field: 'travel_planning', category: 'travel' },
  
  // Relocation (2 questions)
  { field: 'relocation_same_country', category: 'relocation' },
  { field: 'relocation_across_countries', category: 'relocation' },
  
  // Relationship Preferences (3 questions)
  { field: 'role_in_relationship', category: 'relationship' },
  { field: 'age_range_preference', category: 'relationship' },
  { field: 'red_flags', category: 'relationship' },
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
        en: "Hi! I'm Diana, your matchmaking assistant 💝\n\nI'm here to help you find your perfect match through meaningful conversation. I'll guide you through building your complete profile by asking thoughtful questions about your life, values, interests, and what you're looking for in a partner.\n\nWe'll cover topics like your background, career, lifestyle, hobbies, travel preferences, and relationship goals. The more you share, the better I can understand you and find compatible matches!\n\nReady to begin? What's your name?",
        fr: "Bonjour ! Je suis Diana, votre assistante de matchmaking 💝\n\nJe suis là pour vous aider à trouver votre match parfait grâce à des conversations significatives. Je vais vous guider dans la création de votre profil complet en posant des questions réfléchies sur votre vie, vos valeurs, vos intérêts et ce que vous recherchez chez un partenaire.\n\nNous aborderons des sujets comme votre parcours, votre carrière, votre style de vie, vos loisirs, vos préférences de voyage et vos objectifs relationnels. Plus vous partagez, mieux je peux vous comprendre et trouver des matchs compatibles !\n\nPrêt à commencer ? Quel est votre nom ?",
        ar: "مرحباً! أنا ديانا، مساعدتك في إيجاد شريك الحياة 💝\n\nأنا هنا لمساعدتك في العثور على الشريك المثالي من خلال محادثة هادفة. سأرشدك خلال بناء ملفك الشخصي الكامل بطرح أسئلة مدروسة حول حياتك وقيمك واهتماماتك وما تبحث عنه في الشريك.\n\nسنتناول مواضيع مثل خلفيتك ومهنتك وأسلوب حياتك وهواياتك وتفضيلات السفر وأهداف العلاقة. كلما شاركت أكثر، كان بإمكاني فهمك بشكل أفضل وإيجاد التطابقات المناسبة!\n\nهل أنت مستعد للبدء؟ ما اسمك؟",
        tn: "مرحبا! أنا ديانا، مساعدتك باش تلقى شريك حياتك 💝\n\nأنا هنا باش نساعدك تلقى الشريك المثالي متاعك من خلال حديث معنى. باش نهديك كيفاش تبني بروفايلك الكامل بأسئلة مدروسة على حياتك وقيمك واهتماماتك وشنوا تحب تلقى في الشريك.\n\nباش نحكيو على أمور كيما خلفيتك وخدمتك وستايل حياتك وهواياتك وتفضيلات السفر والأهداف متاع العلاقة. كل ما تشارك أكثر، كل ما نفهمك أحسن ونلقالك ماتشات مناسبة!\n\nواجد باش نبداو؟ شنوّا اسمك؟"
      };

      const categoryStatus = getCategoryProgress(profile);
      
      return new Response(JSON.stringify({
        response: greetings[lang] || greetings.en,
        profileCompletion: calculateProfileCompletion(profile),
        currentCategory: determineCurrentCategory(profile).current,
        completedCategories: determineCurrentCategory(profile).completed,
        categoryProgress: categoryStatus
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
4. Do NOT ask for confirmation when answers are clear and straightforward
5. Only ask for clarification when answers are ambiguous, unclear, or mysterious
6. When data is successfully extracted, move directly to the next question
7. Language: ${lang}
8. Next question: ${getNextQuestion(profile, lang)}`;

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

    // Get updated profile for next question
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Generate response text
    let responseText = aiMessage?.content;
    
    // If extraction succeeded but no text response, generate next question
    if (!responseText && extractedData && Object.keys(extractedData).length > 0) {
      const nextQuestion = getNextQuestion(updatedProfile, lang);
      if (nextQuestion) {
        responseText = nextQuestion;
      } else {
        // Profile complete
        const completionMessages: Record<string, string> = {
          en: "Perfect! Feel free to tell me more about what matters to you, or ask me anything about finding your match.",
          fr: "Parfait ! N'hésitez pas à me dire plus sur ce qui compte pour vous, ou posez-moi des questions sur la recherche de votre match.",
          ar: "ممتاز! لا تتردد في إخباري المزيد عما يهمك، أو اسألني أي شيء عن إيجاد الشريك المناسب.",
          tn: "برشا مليح! ما تترددش تقولي أكثر على شنوا يهمك، ولا اسألني على أي حاجة على لقاء الماتش متاعك."
        };
        responseText = completionMessages[lang] || completionMessages.en;
      }
    }
    
    // Final fallback
    if (!responseText) {
      responseText = 'Could you rephrase that?';
    }

    // Store messages
    await supabase.from('messages').insert([
      { sender_id: userId, content: message, is_from_diana: false },
      { receiver_id: userId, content: responseText, is_from_diana: true }
    ]);

    const categoryStatus = getCategoryProgress(updatedProfile);
    
    return new Response(JSON.stringify({
      response: responseText,
      profileCompletion: calculateProfileCompletion(updatedProfile),
      currentCategory: determineCurrentCategory(updatedProfile).current,
      completedCategories: determineCurrentCategory(updatedProfile).completed,
      categoryProgress: categoryStatus
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
      height: "What's your height in cm?",
      height_preference: "What height preference do you have for a partner?",
      marital_status: "What's your marital status?",
      have_children: "Do you have children?",
      want_children: "Do you want children?",
      education_lvl: "What's your education level?",
      employment_status: "What's your employment status?",
      job: "What do you do for work?",
      work_life_balance: "How do you balance work and life?",
      religion: "What's your religion?",
      practice_lvl: "How religious are you?",
      life_goal: "What are your life goals?",
      health: "How would you describe your health?",
      disabilities_and_special_need: "Do you have any disabilities or special needs?",
      disabilities_and_special_need_type: "Can you tell me about your disability or special need?",
      health_disability_preference: "What's your preference regarding health and disabilities in a partner?",
      smoking: "Do you smoke?",
      drinking: "Do you drink alcohol?",
      dietary_habits: "Tell me about your dietary habits.",
      sleep_habits: "What are your sleep habits?",
      volunteer_community_work: "Do you volunteer or do community work?",
      have_pet: "Do you have pets?",
      pet: "Tell me about your pet(s).",
      physical_activities: "What physical activities do you enjoy?",
      cultural_activities: "What cultural activities interest you?",
      creative_hobbies: "Any creative hobbies?",
      gaming_hobbies: "Do you game?",
      travel_frequency: "How often do you travel?",
      type_of_trips: "What kind of trips do you like?",
      travel_style: "How do you travel?",
      travel_planning: "How do you plan your travels?",
      relocation_same_country: "Would you relocate within the same country?",
      relocation_across_countries: "Would you relocate to another country?",
      role_in_relationship: "What role do you see yourself in a relationship?",
      age_range_preference: "What age range are you looking for?",
      red_flags: "What are your relationship red flags?",
      fallback: "Anything else to share?"
    },
    fr: {
      name: "Comment vous appelez-vous ?",
      age: "Quel âge avez-vous ?",
      gender: "Quel est votre genre ?",
      where_was_born: "Où êtes-vous né(e) ?",
      where_he_live: "Où habitez-vous ?",
      where_want_to_live: "Où aimeriez-vous vivre ?",
      height: "Votre taille en cm ?",
      height_preference: "Quelle taille préférez-vous chez un partenaire ?",
      marital_status: "Statut marital ?",
      have_children: "Avez-vous des enfants ?",
      want_children: "Voulez-vous des enfants ?",
      education_lvl: "Niveau d'études ?",
      employment_status: "Situation professionnelle ?",
      job: "Que faites-vous ?",
      work_life_balance: "Comment équilibrez-vous travail et vie personnelle ?",
      religion: "Votre religion ?",
      practice_lvl: "Niveau de pratique religieuse ?",
      life_goal: "Vos objectifs de vie ?",
      health: "Comment décririez-vous votre santé ?",
      disabilities_and_special_need: "Avez-vous un handicap ou des besoins spéciaux ?",
      disabilities_and_special_need_type: "Parlez-moi de votre handicap ou besoin spécial.",
      health_disability_preference: "Quelle est votre préférence concernant la santé chez un partenaire ?",
      smoking: "Fumez-vous ?",
      drinking: "Buvez-vous de l'alcool ?",
      dietary_habits: "Vos habitudes alimentaires ?",
      sleep_habits: "Vos habitudes de sommeil ?",
      volunteer_community_work: "Faites-vous du bénévolat ?",
      have_pet: "Avez-vous des animaux ?",
      pet: "Parlez-moi de votre/vos animal/animaux.",
      physical_activities: "Quelles activités physiques aimez-vous ?",
      cultural_activities: "Activités culturelles ?",
      creative_hobbies: "Hobbies créatifs ?",
      gaming_hobbies: "Aimez-vous les jeux vidéo ?",
      travel_frequency: "Fréquence de voyage ?",
      type_of_trips: "Type de voyages ?",
      travel_style: "Style de voyage ?",
      travel_planning: "Comment planifiez-vous vos voyages ?",
      relocation_same_country: "Accepteriez-vous de déménager dans le même pays ?",
      relocation_across_countries: "Accepteriez-vous de déménager à l'étranger ?",
      role_in_relationship: "Quel rôle voyez-vous dans une relation ?",
      age_range_preference: "Quelle tranche d'âge recherchez-vous ?",
      red_flags: "Quels sont vos signaux d'alerte en relation ?",
      fallback: "Autre chose à partager ?"
    },
    ar: {
      name: "ما اسمك؟",
      age: "كم عمرك؟",
      gender: "ما جنسك؟",
      where_was_born: "أين ولدت؟",
      where_he_live: "أين تعيش؟",
      where_want_to_live: "أين تود أن تعيش؟",
      height: "ما طولك بالسم؟",
      height_preference: "ما تفضيلك لطول الشريك؟",
      marital_status: "حالتك الاجتماعية؟",
      have_children: "هل لديك أطفال؟",
      want_children: "هل ترغب في أطفال؟",
      education_lvl: "مستواك التعليمي؟",
      employment_status: "وضعك المهني؟",
      job: "ماذا تعمل؟",
      work_life_balance: "كيف توازن بين العمل والحياة؟",
      religion: "ما ديانتك؟",
      practice_lvl: "مستوى ممارستك الدينية؟",
      life_goal: "أهدافك في الحياة؟",
      health: "كيف تصف صحتك؟",
      disabilities_and_special_need: "هل لديك إعاقة أو احتياجات خاصة؟",
      disabilities_and_special_need_type: "أخبرني عن إعاقتك أو احتياجك الخاص؟",
      health_disability_preference: "ما تفضيلك بخصوص الصحة في الشريك؟",
      smoking: "هل تدخن؟",
      drinking: "هل تشرب الكحول؟",
      dietary_habits: "عن عاداتك الغذائية؟",
      sleep_habits: "عادات نومك؟",
      volunteer_community_work: "هل تتطوع أو تعمل في المجتمع؟",
      have_pet: "هل لديك حيوانات أليفة؟",
      pet: "أخبرني عن حيوانك الأليف.",
      physical_activities: "ما الأنشطة الرياضية التي تستمتع بها؟",
      cultural_activities: "الأنشطة الثقافية؟",
      creative_hobbies: "هوايات إبداعية؟",
      gaming_hobbies: "هل تحب الألعاب؟",
      travel_frequency: "كم مرة تسافر؟",
      type_of_trips: "نوع الرحلات؟",
      travel_style: "أسلوب سفرك؟",
      travel_planning: "كيف تخطط لسفرك؟",
      relocation_same_country: "هل تقبل الانتقال داخل نفس البلد؟",
      relocation_across_countries: "هل تقبل الانتقال إلى بلد آخر؟",
      role_in_relationship: "ما دورك في العلاقة؟",
      age_range_preference: "ما الفئة العمرية التي تبحث عنها؟",
      red_flags: "ما علامات التحذير في العلاقة؟",
      fallback: "شيء آخر؟"
    },
    tn: {
      name: "شنوّا اسمك؟",
      age: "قدّاش عمرك؟",
      gender: "شنوّا جنسك؟",
      where_was_born: "وين تولدت؟",
      where_he_live: "وين ساكن؟",
      where_want_to_live: "وين تحب تسكن؟",
      height: "قدّاش طولك بالسم؟",
      height_preference: "شنوّا تفضيلك لطول الشريك؟",
      marital_status: "حالتك العائلية؟",
      have_children: "عندك صغار؟",
      want_children: "تحب يكون عندك صغار؟",
      education_lvl: "مستواك القرايي؟",
      employment_status: "وضعك المهني؟",
      job: "شنوّا تخدم؟",
      work_life_balance: "كيفاش توازن بين الخدمة والحياة؟",
      religion: "شنوّا ديانتك؟",
      practice_lvl: "مستوى ممارستك الدينية؟",
      life_goal: "أهدافك في الحياة؟",
      health: "كيفاش توصف صحتك؟",
      disabilities_and_special_need: "عندك إعاقة ولا احتياجات خاصة؟",
      disabilities_and_special_need_type: "حكيلي على إعاقتك ولا احتياجك الخاص؟",
      health_disability_preference: "شنوّا تفضيلك بخصوص الصحة في الشريك؟",
      smoking: "تشرب السجاير؟",
      drinking: "تشرب الكحول؟",
      dietary_habits: "عاداتك في الماكلة؟",
      sleep_habits: "عاداتك في النوم؟",
      volunteer_community_work: "تتطوع ولا تخدم في المجتمع؟",
      have_pet: "عندك حيوانات أليفة؟",
      pet: "حكيلي على حيوانك الأليف.",
      physical_activities: "شنيّا الأنشطة الرياضية اللي تحبها؟",
      cultural_activities: "الأنشطة الثقافية؟",
      creative_hobbies: "هوايات إبداعية؟",
      gaming_hobbies: "تحب الألعاب؟",
      travel_frequency: "قدّاش مرة تسافر؟",
      type_of_trips: "شنوع الرحلات؟",
      travel_style: "أسلوبك في السفر؟",
      travel_planning: "كيفاش تخطط لسفرك؟",
      relocation_same_country: "تقبل تنقل في نفس البلاد؟",
      relocation_across_countries: "تقبل تنقل لبلاد أخرى؟",
      role_in_relationship: "شنوّا دورك في العلاقة؟",
      age_range_preference: "شنيّا الفئة العمرية اللي قاعد تدوّر عليها؟",
      red_flags: "شنيّا علامات التحذير في العلاقة؟",
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
  const categories = ['basic', 'location', 'physical', 'family', 'career', 'values', 'health', 'lifestyle', 'pets', 'hobbies', 'travel', 'relocation', 'relationship'];
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

function getCategoryProgress(profile: any): Record<string, { completed: number; total: number; percentage: number }> {
  const categories = ['basic', 'location', 'physical', 'family', 'career', 'values', 'health', 'lifestyle', 'pets', 'hobbies', 'travel', 'relocation', 'relationship'];
  const progress: Record<string, { completed: number; total: number; percentage: number }> = {};
  
  for (const cat of categories) {
    const catFields = QUESTION_LIST.filter(q => q.category === cat);
    const total = catFields.length;
    const completed = catFields.filter(q => profile?.[q.field] != null && profile?.[q.field] !== '').length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    progress[cat] = { completed, total, percentage };
  }
  
  return progress;
}
