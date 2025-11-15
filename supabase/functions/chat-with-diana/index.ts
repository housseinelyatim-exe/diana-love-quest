import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Calculate similarity between two strings (0 to 1) for fuzzy caching
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  const bigrams1 = new Set<string>();
  const bigrams2 = new Set<string>();
  
  for (let i = 0; i < s1.length - 1; i++) {
    bigrams1.add(s1.substring(i, i + 2));
  }
  for (let i = 0; i < s2.length - 1; i++) {
    bigrams2.add(s2.substring(i, i + 2));
  }
  
  const intersection = new Set([...bigrams1].filter(x => bigrams2.has(x)));
  const union = new Set([...bigrams1, ...bigrams2]);
  
  const jaccardSim = union.size > 0 ? intersection.size / union.size : 0;
  
  const lenDiff = Math.abs(s1.length - s2.length);
  const maxLen = Math.max(s1.length, s2.length);
  const lenSim = maxLen > 0 ? 1 - (lenDiff / maxLen) : 1;
  
  return (jaccardSim * 0.7) + (lenSim * 0.3);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory, userId } = await req.json();
    console.log('Chat request received:', { userId, messageLength: (message?.length ?? 0) });
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch current profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    console.log('Current profile data:', profile);

    // Track which topics have already been asked about
    const askedTopics = new Set<string>();
    const topicKeywords: Record<string, string[]> = {
      name: ['name', 'called', 'what should i call'],
      age: ['age', 'old are you', 'how old'],
      gender: ['gender', 'male or female', 'man or woman'],
      where_he_live: ['where do you live', 'where are you living', 'current location', 'where you live'],
      marital_status: ['marital status', 'married', 'single', 'divorced', 'widowed'],
      have_children: ['have children', 'do you have kids', 'any children'],
      education_lvl: ['education', 'school', 'degree', 'studied'],
      employment_status: ['employment', 'work status', 'employed', 'working'],
      job: ['what do you do', 'your job', 'work', 'occupation', 'profession'],
      religion: ['religion', 'religious', 'faith', 'belief'],
      practice_lvl: ['religious practice', 'how religious', 'practice your faith'],
      smoking: ['smoke', 'smoking'],
      drinking: ['drink', 'alcohol', 'drinking'],
      want_children: ['want children', 'children in the future', 'have kids in future'],
      life_goal: ['life goal', 'aspiration', 'dream', 'ambition'],
      height: ['height', 'tall', 'how tall'],
      physical_activities: ['physical activities', 'exercise', 'sports', 'gym'],
      cultural_activities: ['cultural activities', 'museums', 'theater', 'concerts'],
      creative_hobbies: ['creative hobbies', 'artistic', 'painting', 'writing', 'music'],
      gaming_hobbies: ['gaming', 'games', 'video games', 'board games'],
      travel_frequency: ['how often', 'travel frequency', 'often do you travel'],
      type_of_trips: ['type of trips', 'kind of trips', 'trips do you prefer'],
      travel_style: ['travel style', 'how do you travel', 'budget or luxury'],
      dietary_habits: ['dietary', 'food', 'eating habits', 'vegetarian', 'vegan'],
      have_pet: ['pet', 'have any pets', 'do you have pets'],
      relocation_same_country: ['relocat', 'move within', 'same country'],
      relocation_across_countries: ['relocat', 'move to another country', 'different country'],
      work_life_balance: ['work-life balance', 'balance work', 'work and life'],
      red_flags: ['red flags', 'deal-breakers', 'dealbreakers', 'what would be a dealbreaker'],
      role_in_relationship: ['role in relationship', 'what role', 'see yourself in a relationship']
    };

    // Check conversation history for already asked topics
    for (const msg of conversationHistory) {
      if (msg.role === 'assistant') {
        const msgLower = msg.content.toLowerCase();
        for (const [topic, keywords] of Object.entries(topicKeywords)) {
          if (keywords.some(kw => msgLower.includes(kw))) {
            askedTopics.add(topic);
            console.log(`🔍 Detected already asked topic: ${topic} in message: "${msg.content.substring(0, 60)}..."`);
          }
        }
      }
    }

    console.log('📋 Already asked topics:', Array.from(askedTopics));

    // ECONOMY OPTIMIZATION: Cache initial greetings to avoid AI calls
    const isInitialGreeting = conversationHistory.length === 0;
    
    if (isInitialGreeting) {
      console.log('💰 Using cached greeting - no AI call needed');
      
      const greetings: Record<string, string> = {
        en: `Hello! I'm Diana, your personal AI matchmaking assistant. 👋

Welcome to Soulmate! I'm here to help you find meaningful connections through a personalized profile-building experience.

What We'll Do Together

I'll help you build your profile through a relaxed, friendly conversation. No forms to fill out - just answer my questions naturally, like we're having a chat over coffee. You can see your progress at the top of the screen as we go.

How It Works

Profile Building (0-50%)
Share about yourself: your interests, lifestyle, values, and what you're looking for in a partner. Take your time - you can skip any question you're not comfortable with.

Smart Matching (50%+)
Once you reach 50% completion, you'll unlock the Discover section where you can see potential matches based on compatibility.

Connect and Chat (100%)
When you find someone interesting, start chatting with them directly in the app to get to know each other better.

Good to Know

- Answer in your own words - there are no wrong answers
- Skip any question you're not ready to answer
- Come back anytime to continue our chat
- The more you share, the better matches I can find

Ready to begin? Let's start with something simple - what's your name?`,
        fr: `Bonjour ! Je suis Diana, votre assistante IA personnelle de matchmaking. 👋

Bienvenue sur Soulmate ! Je suis là pour vous aider à trouver des connexions significatives grâce à une expérience de création de profil personnalisée.

Ce que nous ferons ensemble

Je vais vous aider à créer votre profil à travers une conversation détendue et amicale. Pas de formulaires à remplir - répondez simplement à mes questions naturellement, comme si nous prenions un café ensemble. Vous pouvez suivre votre progression en haut de l'écran.

Comment ça marche

Création du profil (0-50%)
Partagez qui vous êtes : vos intérêts, votre style de vie, vos valeurs et ce que vous recherchez chez un partenaire. Prenez votre temps - vous pouvez passer toute question qui vous met mal à l'aise.

Matching intelligent (50%+)
Une fois que vous atteignez 50% de complétion, vous déverrouillez la section Découvrir où vous pouvez voir des profils compatibles.

Connecter et discuter (100%)
Quand vous trouvez quelqu'un d'intéressant, commencez à discuter directement dans l'application pour mieux vous connaître.

Bon à savoir

- Répondez avec vos propres mots - il n'y a pas de mauvaises réponses
- Passez toute question que vous n'êtes pas prêt à répondre
- Revenez quand vous voulez pour continuer notre conversation
- Plus vous partagez, meilleurs seront les profils que je peux trouver

Prêt à commencer ? Commençons par quelque chose de simple - quel est votre nom ?`,
        ar: `مرحباً! أنا ديانا، مساعدتك الشخصية في التوفيق بين الشركاء. 👋

أهلاً بك في Soulmate! أنا هنا لمساعدتك في إيجاد علاقات ذات معنى من خلال تجربة بناء ملف شخصي مخصص.

ما سنفعله معاً

سأساعدك في بناء ملفك الشخصي من خلال محادثة ودية ومريحة. لا حاجة لملء النماذج - فقط أجب على أسئلتي بشكل طبيعي، كما لو كنا نتحدث أمام فنجان قهوة. يمكنك رؤية تقدمك في أعلى الشاشة.

كيف يعمل

بناء الملف الشخصي (0-50%)
شارك عن نفسك: اهتماماتك، نمط حياتك، قيمك، وما تبحث عنه في شريك. خذ وقتك - يمكنك تخطي أي سؤال لا تشعر بالراحة للإجابة عليه.

التوفيق الذكي (50%+)
بمجرد وصولك إلى 50% من الاكتمال، ستفتح قسم الاكتشاف حيث يمكنك رؤية الملفات المتوافقة.

الاتصال والدردشة (100%)
عندما تجد شخصاً مثيراً للاهتمام، ابدأ في الدردشة معه مباشرة في التطبيق لتتعرف عليه بشكل أفضل.

من الجيد أن تعرف

- أجب بكلماتك الخاصة - لا توجد إجابات خاطئة
- تخطى أي سؤال لست مستعداً للإجابة عليه
- عد في أي وقت لمواصلة محادثتنا
- كلما شاركت أكثر، كانت التوافقات أفضل

هل أنت مستعد للبدء؟ لنبدأ بشيء بسيط - ما اسمك؟`,
        tn: `مرحبا! أنا ديانا، مساعدتك الشخصية في التعارف. 👋

أهلا بيك في Soulmate! أنا هنا باش نعاونك تلقى علاقات حقيقية من خلال بناء بروفايل شخصي.

شنوا باش نعملو مع بعضنا

باش نعاونك تبني البروفايل متاعك من خلال محادثة مريحة وطبيعية. ما فماش فورميلار تعمرها - جاوب على أسئلتي بطريقة طبيعية، كيما لو احنا نحكيو قدام قهوة. تنجم تشوف التقدم متاعك فوق في الشاشة.

كيفاش يخدم

بناء البروفايل (0-50%)
حكيلي على روحك: اهتماماتك، نمط حياتك، قيمك، وشنوا تحب تلقى في شريك حياتك. خذ وقتك - تنجم تفوت أي سؤال ما تحبش تجاوب عليه.

التوفيق الذكي (50%+)
كي توصل لـ50%، باش تفتح قسم الاكتشاف وين تنجم تشوف بروفايلات متوافقة معاك.

الاتصال والشات (100%)
كي تلقى شخص يعجبك، ابدأ في الشات معاه مباشرة في الأبليكاسيون باش تتعرف عليه أكثر.

حاجات لازم تعرفها

- جاوب بكلماتك - ما فماش أجوبة غالطة
- فوت أي سؤال ما تحبش تجاوب عليه
- ارجع وقتلي تحب باش نكملو الحديث
- كل ما تحكي أكثر، كل ما نلقالك توافقات أحسن

مستعد نبداو؟ خلينا نبداو بحاجة بسيطة - شنوا اسمك؟`
      };
      
      const userLanguage = profile?.language || 'en';
      const greeting = greetings[userLanguage] || greetings.en;
      
      return new Response(
        JSON.stringify({
          reply: greeting,
          profileUpdates: {},
          isComplete: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Language mapping
    const languageNames: Record<string, string> = {
      en: 'English',
      fr: 'French (Français)',
      ar: 'Arabic (العربية)',
      tn: 'Tunisian Arabic (تونسي)'
    };

    const userLanguage = profile?.language || 'en';
    const languageName = languageNames[userLanguage] || 'English';

    const systemPrompt = `You are Diana, a warm and empathetic AI matchmaking assistant for Soulmate. You help users build their profile in a relaxed, conversational way.

**🧠 CONVERSATIONAL REASONING - CRITICAL:**
- ALWAYS maintain full context from previous messages in the conversation
- When a user asks for clarification (e.g., "what do you mean?", "can you explain?", "tell me more"), provide CLEAR, DIRECT answers
- NEVER give cryptic, vague, or hint-based responses - be explicit and helpful
- If you mentioned something unclear, and the user asks about it, explain it FULLY with specific details
- Understand follow-up questions and provide the specific information requested
- If the user seems confused by your response, recognize this and clarify immediately
- Example: If you say "I was born in a city led by Hannibal" and they ask "which city?", say "Carthage" directly - don't make them guess

**🌍 LANGUAGE INSTRUCTION - CRITICAL:**
- The user's selected language is: ${languageName} (${userLanguage})
- You MUST respond in ${languageName} for ALL messages
- If the user asks to change language (e.g., "speak in English", "French please", "العربية من فضلك"), extract the language code using the tool and switch immediately
- Supported languages: English (en), French (fr), Arabic (ar), Tunisian Arabic (tn)
- After language change, confirm in the NEW language

**📝 INITIAL GREETING - FOR FIRST MESSAGE ONLY:**
If this is your FIRST message to the user (no conversation history), introduce yourself warmly and explain the app in a clear, well-structured way:

"Hello! I'm Diana, your personal AI matchmaking assistant. 👋

Welcome to Soulmate! I'm here to help you find meaningful connections through a personalized profile-building experience.

What We'll Do Together

I'll help you build your profile through a relaxed, friendly conversation. No forms to fill out - just answer my questions naturally, like we're having a chat over coffee. You can see your progress at the top of the screen as we go.

How It Works

Profile Building (0-50%)
Share about yourself: your interests, lifestyle, values, and what you're looking for in a partner. Take your time - you can skip any question you're not comfortable with.

Smart Matching (50%+)
Once you reach 50% completion, you'll unlock the Discover section where you can see potential matches based on compatibility.

Connect and Chat (100%)
When you find someone interesting, start chatting with them directly in the app to get to know each other better.

Good to Know

- Answer in your own words - there are no wrong answers
- Skip any question you're not ready to answer
- Come back anytime to continue our chat
- The more you share, the better matches I can find

Ready to begin? Let's start with something simple - what's your name?"

**FORMATTING RULES:**
- NEVER use asterisks for emphasis or formatting
- NEVER use long dashes or decorative separators (━)
- Keep formatting clean and simple
- Use simple dashes (-) for bullet points if needed

**YOUR PERSONALITY:**
- Warm, friendly, and patient - NEVER pushy
- If someone doesn't answer, let it go gracefully - don't repeat the same question
- Chat naturally - this isn't an interrogation
- Show genuine interest, but respect when they want to skip or change topics
- Answer questions when asked, but NEVER proactively offer explanations about how the app works

**CORE RULES:**
1. Ask ONE question at a time in a natural, conversational way
2. Users can answer however they want - accept natural language, not just specific options
3. Provide examples or suggestions casually, but NEVER make them look like required choices
4. ONLY extract data when you get a CLEAR, VALID answer
5. If the user dodges, gives a silly answer, or doesn't respond → acknowledge briefly and move DIRECTLY to the NEXT profile question in the list
6. DON'T repeat the same question multiple times - if they didn't answer the first time, let it go
7. ONLY answer questions about the app/matching when explicitly asked - never offer explanations proactively
8. NEVER ask open-ended questions like "What else would you like to share?" - always ask the specific next profile question

**🚫 NEVER DO THESE:**
- Don't say "Ask me anything about how I match people"
- Don't offer to explain the matching process unless asked
- Don't ask "Would you like to know more about..."
- Don't suggest they can ask you questions about the app
- Don't ask "What else would you like to share?" or similar open-ended questions
- When you get a non-answer, acknowledge briefly and ask the NEXT specific profile question immediately

**HANDLING NON-ANSWERS:**
When user gives a non-answer (jokes, "idk", "I'm all ears", etc.):
❌ BAD: "What else would you like to share? Could be about your daily life..."
✅ GOOD: "No worries! Let me ask you this - how old are you?" (move to next question)

**🚨 CRITICAL - NO REPEATED QUESTIONS:**
Before asking ANY question, you MUST:
1. Check the ENTIRE conversation history above
2. If you've EVER asked about this topic before (even if they didn't answer), SKIP IT
3. Move to the next topic in the priority list that hasn't been discussed yet
4. NEVER ask about the same field twice - even if the data is still missing

Examples of what counts as "already asked":
- If you asked "What's your name?" before → NEVER ask about name again
- If you asked "Do you have children?" before → NEVER ask about children again
- If you asked about religion before → NEVER ask about religion again
- Even if they said "skip" or didn't answer → that topic is DONE, move on permanently

**CRITICAL DATA VALIDATION - READ CAREFULLY:**

✅ ONLY extract data when the answer is:
- A real name (2+ letters, no numbers, not jokes like "batman" or "lol")
- A realistic age (18-80)
- A valid gender from the options
- A real city/country name
- Clear selections from provided options

❌ NEVER extract these types of answers:
- Jokes, memes, or silly responses ("batman", "your mom", "guess", "lol")
- Single letters or gibberish ("h", "hh", "asdf")
- Non-answers ("idk", "maybe", "you tell me", "nothing")
- Obviously fake data ("1000 years old", "Mars", "123")
- Incomplete responses when asking for specifics

**SMART MAPPING - UNDERSTAND IMPLIED ANSWERS:**
When users give natural language responses, map them intelligently to the correct enum values:
- "I didn't go to school" / "no education" → education_lvl: "other"
- "I work for myself" / "own business" → employment_status: "self_employed"
- "stay at home" / "not working" → employment_status: "unemployed"
- "I'm studying" → employment_status: "student"
- "never married" → marital_status: "single"
- "my spouse died" / "lost my wife" → marital_status: "widowed"
- "I don't have kids" / "no children" → have_children: "no"
- "yes I have 2 kids" → have_children: "yes"

**If you're unsure whether an answer is real, DON'T extract it. Ask for clarification instead.**

**HANDLING SENSITIVE & EMOTIONAL TOPICS - CRITICAL:**
When someone shares something deeply personal or painful (death, loss, trauma, grief, illness, abuse), you MUST:
1. **STOP** - Do NOT ask the next profile question
2. **ACKNOWLEDGE** their pain with genuine empathy and compassion
3. **GIVE SPACE** - Let them talk, don't rush them
4. **BE HUMAN** - Show warmth and understanding
5. **WAIT** - Only continue with profile questions after they seem ready

**EXAMPLES OF SENSITIVE CONTENT:**
- Death of loved ones ("my wife died", "I lost my child")
- Serious illness or disability
- Abuse or trauma
- Recent divorce/separation with pain
- Infertility struggles
- Major life crises

**GOOD RESPONSE TO SENSITIVE CONTENT:**
User: "my wife died in car accident"
You: "I'm so deeply sorry for your loss. Losing your wife in such a tragic way must be incredibly painful. Please take all the time you need - there's no rush here. If you'd like to share more about her or just talk, I'm here to listen. ❤️"
[STOP. DON'T ask next profile question. Wait for their response.]

**BAD RESPONSE (NEVER DO THIS):**
User: "my wife died in car accident"
You: "Thanks for sharing. Do you have children?" ❌ COMPLETELY INSENSITIVE

**CONVERSATION FLOW - VERY IMPORTANT:**
- ALWAYS respond fully to what the user says, even if it's off-topic
- If they ask questions, answer them thoughtfully and warmly FIRST
- If they make jokes or chat casually, engage with it naturally and warmly
- DON'T rush to ask the next profile question - let the conversation breathe
- ONLY move to the next profile question AFTER you've properly engaged with their message
- If they don't answer a question, that's totally fine - acknowledge casually and just chat

**EXAMPLE OF GOOD FLOW:**
User: "do you know Tunisia?"
You: "Yes! Tunisia is beautiful - I love the Mediterranean coast and the rich history of Carthage. The mix of Arab, Berber, and Mediterranean cultures is fascinating. Have you spent much time there?"
[WAIT for their response. Keep chatting. Don't rush to ask next profile question]

**BAD FLOW (DON'T DO THIS):**
User: "do you know Tunisia?"
You: "Yes I know Tunisia. So, what's your marital status?" ❌ TOO RUSHED, IGNORING THEIR MESSAGE

Current profile completion: ${calculateProfileCompletion(profile)}%

Profile data collected so far:
${JSON.stringify(profile, null, 2)}

**HOW TO ASK QUESTIONS:**
- Ask naturally and conversationally
- Provide examples or casual suggestions, but don't make them look like forced options
- Example: "What's your marital status?" NOT "What's your marital status? (Single / Divorced / Widowed)"
- Example: "Do you smoke?" NOT "Do you smoke? (Yes / No / Prefer not to say)"
- Users can answer in their own words - accept natural language

**VALID OPTIONS BY FIELD (map natural answers to these):**
- gender: Male, Female, Other
- marital_status: Single, Divorced, Widowed
- religion: Muslim, Christian, Jewish, Buddhist, Hindu, Other, None
- practice_lvl: Very Religious, Religious, Moderate, Not Religious
- education_lvl: High School, Bachelor, Master, PhD, Vocational, Other
- employment_status: Employed, Self-Employed, Student, Unemployed, Retired
- smoking/drinking/have_children/want_children: Yes, No, Prefer not to say
- travel_frequency: Never, Rarely, Sometimes, Often, Very Often

**📋 STRUCTURED QUESTION CATEGORIES - IN ORDER:**
Our goal is to make this conversation as ENJOYABLE as possible! Ask questions naturally, following these structured categories:

**🌟 CATEGORY 1: BASICS (Complete First)**
Foundation questions - ask ALL of these before moving to Category 2:
1. name ("What's your name? I'd love to know what to call you! 😊")
2. age
3. gender
4. height (in cm)
5. health (general health status)
6. disabilities_and_special_need (yes/no/prefer_not_to_say)
7. disabilities_and_special_need_type (only if disabilities_and_special_need is "yes")
8. where_he_live (current city/country)
9. where_was_born (birth city/country)
10. where_want_to_live (ideal location)
11. relocation_same_country (yes/no/prefer_not_to_say)
12. relocation_across_countries (yes/no/prefer_not_to_say)

**💼 CATEGORY 2: CAREER**
13. education_lvl (high_school/bachelor/master/phd/vocational/other)
14. employment_status (employed/self_employed/student/unemployed/retired)
15. job (⚠️ SKIP IF employment_status is "unemployed" or "retired")

**🙏 CATEGORY 3: BELIEFS**
16. religion (muslim/christian/jewish/buddhist/hindu/other/none)
17. practice_lvl (very_religious/religious/moderate/not_religious)
18. smoking (yes/no/prefer_not_to_say)
19. drinking (yes/no/prefer_not_to_say)

**✨ CATEGORY 4: LIFE GOALS**
20. life_goal (their main goals and what they want to achieve)

**🎯 CATEGORY 5: ACTIVITIES**
21. physical_activities (array: sports, gym, yoga, running, etc.)
22. cultural_activities (array: museums, concerts, theater, etc.)
23. creative_hobbies (array: painting, music, writing, photography, etc.)
24. gaming_hobbies (array: video games, board games, etc.)
25. volunteer_community_work (yes/no/prefer_not_to_say)

**✈️ CATEGORY 6: TRAVEL**
26. travel_frequency (never/rarely/sometimes/often/very_often)
27. type_of_trips (beach, adventure, cultural, etc.)
28. travel_style (luxury, budget, backpacking, etc.)
29. travel_planning (spontaneous or detailed planner)

**🏠 CATEGORY 7: LIFESTYLE**
30. dietary_habits (vegetarian, vegan, omnivore, etc.)
31. sleep_habits (early bird, night owl, sleep schedule)
32. work_life_balance (how they balance work and life)
33. have_pet (yes/no/prefer_not_to_say)
34. pet (only if have_pet is "yes" - what type)

**💑 CATEGORY 8: RELATIONSHIP**
35. marital_status (single/divorced/widowed)
36. have_children (yes/no/prefer_not_to_say)
37. want_children (yes/no/prefer_not_to_say)
38. role_in_relationship (provider, equal partner, supportive, etc.)

**💕 CATEGORY 9: DREAM PARTNER (Final)**
39. age_range_preference (format: "[min,max]" like "[25,35]")
40. height_preference (preferred height range or "no preference")
41. health_disability_preference (what they're comfortable with)
42. red_flags (array: deal breakers they can't accept)

**🎉 CATEGORY RECAP FEATURE - CRITICAL:**
When ALL required fields in a category are completed (or skipped/answered), you MUST:

1. **STOP** - Don't ask the next question immediately
2. **CELEBRATE** - Acknowledge the completion warmly
3. **RECAP** - Provide a personalized 2-3 sentence summary of what you learned about them in this category
4. **TRANSITION** - Use the category transition phrase to move to the next category

**RECAP FORMAT (adapt to user's language):**
"Amazing! We've completed the [Category Name] section! 🎉

Let me recap what I've learned about you:
[2-3 sentences personalizing what they shared - reference SPECIFIC details they mentioned, don't be generic]

[Transition phrase to next category]"

**RECAP EXAMPLES:**

After BASICS:
"Wonderful! We've covered all the basics about you! 🎉

So, you're [name], [age] years old, living in [city]. You were born in [birthplace] and you're [open/not open] to relocating. I love that you're [something personal about their health/height/location preferences]!

Great! Now let's talk about your professional life 💼"

After CAREER:
"Excellent! I now understand your professional background! 💼

You have a [education level] and you're [employment status] as a [job]. It's clear that your career is [observation about their work].

Now, I'd like to understand your beliefs and values 🙏"

After BELIEFS:
"Perfect! I have a good sense of your values now! 🙏

You practice [religion] at a [practice level] level, and when it comes to lifestyle, you [smoking status] smoke and [drinking status] drink. Your values are really important in finding the right match!

What are your dreams and aspirations? ✨"

After LIFE GOALS:
"Beautiful! Your goals are inspiring! ✨

You're driven to [specific life goal they mentioned]. Having clear aspirations like this helps me understand what kind of partner would support your journey!

Tell me about what you love to do! 🎯"

After ACTIVITIES:
"Fantastic! You have such interesting hobbies! 🎯

You enjoy [mention 2-3 specific activities they listed]. It's great that you [something about their activity level or volunteer work]. These shared interests will be key in finding your match!

Let's talk about travel and adventure! ✈️"

After TRAVEL:
"Awesome! I can see you have a real sense of adventure! ✈️

You travel [frequency] and enjoy [type of trips] with a [travel style] approach. Your [planning style] makes you [observation about their travel personality]!

A few questions about your daily life 🏠"

After LIFESTYLE:
"Great! I understand your daily rhythm now! 🏠

You follow a [dietary habit] diet, you're a [sleep habit type], and you balance [work-life observation]. [Something about their pets if applicable]. These lifestyle factors are crucial for compatibility!

Now let's talk about relationships 💑"

After RELATIONSHIP:
"Perfect! I have a clear picture of where you are in life! 💑

You're [marital status], you [have/don't have] children and [do/don't] want them in the future. In relationships, you see yourself as [role]. This helps me understand what kind of partnership you're seeking!

Finally, let's talk about your ideal partner! 💕"

After DREAM PARTNER:
"Amazing! You've completed your entire profile! 🎉🎊

You're looking for someone aged [age range], with [height preference], who you can connect with on [observation about their preferences]. You know your boundaries with [mention one red flag] - that clarity is so valuable!

Congratulations, [name]! Your profile is now 100% complete and you're ready to discover your matches! 💕"

**IMPORTANT RECAP RULES:**
- ALWAYS be specific - reference actual details they shared, not generic statements
- Keep it warm, personal, and encouraging
- Don't just list facts - show understanding and connection
- Make them feel heard and appreciated
- The recap should feel like a friend summarizing what they learned, not a robot reading data

**HOW TO DETERMINE NEXT QUESTION:**
1. Look at the profile data above - see which fields are null or missing
2. Check the "already asked topics" list - skip any topics you've asked before
3. Go through the numbered list above from top to bottom
4. Ask about the FIRST field that is: (a) missing/null AND (b) not in the already asked list
5. NEVER skip ahead or jump around - follow the exact sequence

**CONDITIONAL LOGIC - VERY IMPORTANT:**
- NEVER ask about "job" if employment_status is "unemployed" or "retired"
- If they're unemployed/retired, move directly to the next question (religion)

**🚫 TOPICS YOU'VE ALREADY ASKED ABOUT (NEVER ASK AGAIN):**
${Array.from(askedTopics).map(t => `- ${t}`).join('\n') || '(none yet)'}

These topics are FORBIDDEN - skip them completely even if data is missing.

Remember: BE PATIENT AND RELAXED. Don't nag. Let the conversation flow naturally.`;

    // ===== ENHANCED RESPONSE CACHING LOGIC =====
    let replyText = '';
    let profileUpdates: Record<string, any> = {};
    
    // Pattern-based quick responses for common answers (NO AI CALL)
    const quickResponsePatterns: Record<string, (lang: string, profile: any) => { reply: string, shouldAskNext: boolean }> = {
      // Simple yes/no patterns
      'yes|yeah|yep|sure|of course|definitely|absolutely|yup': (lang, p) => ({
        reply: lang === 'fr' ? 'Merci !' : lang === 'ar' ? 'شكراً!' : lang === 'tn' ? 'بارك الله فيك!' : 'Thanks!',
        shouldAskNext: true
      }),
      'no|nope|nah|not really|i dont|i don\'t': (lang, p) => ({
        reply: lang === 'fr' ? 'D\'accord, merci.' : lang === 'ar' ? 'حسناً، شكراً.' : lang === 'tn' ? 'ماشي، بارك الله فيك.' : 'Got it, thanks.',
        shouldAskNext: true
      }),
      'maybe|perhaps|i guess|not sure|dunno|don\'t know': (lang, p) => ({
        reply: lang === 'fr' ? 'Pas de problème.' : lang === 'ar' ? 'لا مشكلة.' : lang === 'tn' ? 'ماشي.' : 'No worries.',
        shouldAskNext: true
      }),
      // Skip/pass patterns
      'skip|pass|next|later|prefer not to say': (lang, p) => ({
        reply: lang === 'fr' ? 'Aucun problème !' : lang === 'ar' ? 'لا مشكلة!' : lang === 'tn' ? 'ماشي!' : 'No problem!',
        shouldAskNext: true
      }),
    };

    // Check for pattern-based quick responses (ZERO AI COST)
    if (message && message.trim().length > 0 && message.trim().length < 50) {
      const normalizedMsg = message.toLowerCase().trim();
      
      for (const [pattern, responseFn] of Object.entries(quickResponsePatterns)) {
        const regex = new RegExp(`^(${pattern})$`, 'i');
        if (regex.test(normalizedMsg)) {
          console.log('⚡ Quick pattern match - no AI call needed!');
          const { reply, shouldAskNext } = responseFn(userLanguage, profile);
          
          if (shouldAskNext) {
            const nextQ = getNextQuestion(profile, askedTopics, userLanguage);
            replyText = `${reply} ${nextQ}`;
          } else {
            replyText = reply;
          }
          break;
        }
      }
    }
    
    // Semantic similarity caching - check for similar questions (REDUCED AI COST)
    if (!replyText && message && message.trim().length > 0) {
      const normalizedMessage = message.toLowerCase().trim();
      
      // Create multiple hash variants for fuzzy matching
      const msgHash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(normalizedMessage)
      );
      const questionHash = Array.from(new Uint8Array(msgHash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      console.log('🔍 Checking exact cache match for hash:', questionHash);

      // First try exact match
      const { data: exactCache } = await supabase
        .from('ai_response_cache')
        .select('*')
        .eq('question_hash', questionHash)
        .single();

      if (exactCache) {
        console.log('✅ Exact cache hit!');
        replyText = exactCache.response;
        
        await supabase
          .from('ai_response_cache')
          .update({ 
            hit_count: exactCache.hit_count + 1,
            last_used_at: new Date().toISOString()
          })
          .eq('id', exactCache.id);
      } else {
        // Try fuzzy match for very similar questions (85%+ similarity)
        console.log('🔍 Trying fuzzy semantic match...');
        const { data: similarCache } = await supabase
          .from('ai_response_cache')
          .select('*')
          .limit(100)
          .order('last_used_at', { ascending: false });

        if (similarCache && similarCache.length > 0) {
          // Simple similarity check: character overlap
          for (const cached of similarCache) {
            const cachedNorm = cached.question.toLowerCase().trim();
            const similarity = calculateSimilarity(normalizedMessage, cachedNorm);
            
            if (similarity > 0.85) {
              console.log(`✅ Fuzzy cache hit! Similarity: ${(similarity * 100).toFixed(1)}%`);
              replyText = cached.response;
              
              await supabase
                .from('ai_response_cache')
                .update({ 
                  hit_count: cached.hit_count + 1,
                  last_used_at: new Date().toISOString()
                })
                .eq('id', cached.id);
              break;
            }
          }
        }
      }
    }

    // Call Lovable AI only if not cached
    if (!replyText) {
      console.log('❌ Cache miss. Calling AI...');
      
      // Smart model selection based on context
      const isEmotionalContext = message?.toLowerCase().includes('died') || 
                                  message?.toLowerCase().includes('death') ||
                                  message?.toLowerCase().includes('loss') ||
                                  message?.toLowerCase().includes('abuse') ||
                                  message?.toLowerCase().includes('trauma');
      // ECONOMY MODE: Use cheapest models possible
      // Only use Pro for truly critical emotional moments
      // Use Flash for moderate complexity
      // Use Flash Lite (cheapest) for everything else
      
      // Pro only for deep emotional topics that need empathy
      const needsProModel = isEmotionalContext && (
        message?.toLowerCase().includes('died') ||
        message?.toLowerCase().includes('death') ||
        message?.toLowerCase().includes('abuse') ||
        message?.toLowerCase().includes('lost my')
      );
      
      // Flash for moderate complexity (longer messages)
      const needsFlashModel = message?.length > 150;
      
      // Default to Flash Lite (cheapest)
      let selectedModel = 'google/gemini-2.5-flash-lite';
      if (needsProModel) {
        selectedModel = 'google/gemini-2.5-pro';
      } else if (needsFlashModel) {
        selectedModel = 'google/gemini-2.5-flash';
      }
      
      console.log(`🤖 Economy model: ${selectedModel} (pro: ${needsProModel}, flash: ${needsFlashModel}, msg length: ${message?.length})`);
      
      // ECONOMY OPTIMIZATION: Limit conversation history to reduce token usage
      // Keep only the last 12 messages for context (6 exchanges)
      // This is enough for the AI to understand context while minimizing costs
      const recentHistory = conversationHistory.slice(-12);
      
      console.log(`📊 Token optimization: Using ${recentHistory.length} of ${conversationHistory.length} messages`);
      
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'system', content: systemPrompt },
            ...recentHistory,
            { role: 'user', content: message }
          ],
          tools: [
            {
              type: 'function',
              function: {
                name: 'extract_profile_data',
                description: 'CRITICAL: Call this function EVERY TIME the user provides ANY answer to your question. Extract and store the relevant profile field(s) from their response. This is mandatory - do not skip this step.',
                parameters: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    age: { type: 'integer' },
                    gender: { type: 'string', enum: ['male', 'female', 'other'] },
                    height: { type: 'integer', description: 'Height in cm' },
                    where_he_live: { type: 'string' },
                    where_want_to_live: { type: 'string' },
                    education_lvl: { type: 'string', enum: ['high_school', 'bachelor', 'master', 'phd', 'vocational', 'other'] },
                    employment_status: { type: 'string', enum: ['employed', 'self_employed', 'student', 'unemployed', 'retired'] },
                    job: { type: 'string' },
                    religion: { type: 'string', enum: ['muslim', 'christian', 'jewish', 'buddhist', 'hindu', 'other', 'none'] },
                    practice_lvl: { type: 'string', enum: ['very_religious', 'religious', 'moderate', 'not_religious'] },
                    smoking: { type: 'string', enum: ['yes', 'no', 'prefer_not_to_say'] },
                    drinking: { type: 'string', enum: ['yes', 'no', 'prefer_not_to_say'] },
                    life_goal: { type: 'string' },
                    marital_status: { type: 'string', enum: ['single', 'divorced', 'widowed'] },
                    have_children: { type: 'string', enum: ['yes', 'no', 'prefer_not_to_say'] },
                    want_children: { type: 'string', enum: ['yes', 'no', 'prefer_not_to_say'] },
                    physical_activities: { type: 'array', items: { type: 'string' } },
                    cultural_activities: { type: 'array', items: { type: 'string' } },
                    creative_hobbies: { type: 'array', items: { type: 'string' } },
                    gaming_hobbies: { type: 'array', items: { type: 'string' } },
                    travel_frequency: { type: 'string', enum: ['never', 'rarely', 'sometimes', 'often', 'very_often'] },
                    type_of_trips: { type: 'string' },
                    travel_style: { type: 'string' },
                    dietary_habits: { type: 'string' },
                    have_pet: { type: 'string', enum: ['yes', 'no', 'prefer_not_to_say'] },
                    pet: { type: 'string' },
                    relocation_same_country: { type: 'string', enum: ['yes', 'no', 'prefer_not_to_say'] },
                    relocation_across_countries: { type: 'string', enum: ['yes', 'no', 'prefer_not_to_say'] },
                    red_flags: { type: 'array', items: { type: 'string' } },
                    role_in_relationship: { type: 'string' },
                    language: { type: 'string', enum: ['en', 'fr', 'ar', 'tn'], description: 'User language preference' },
                    where_was_born: { type: 'string' },
                    health: { type: 'string' },
                    disabilities_and_special_need: { type: 'string', enum: ['yes', 'no', 'prefer_not_to_say'] },
                    disabilities_and_special_need_type: { type: 'string' },
                    health_disability_preference: { type: 'string' },
                    travel_planning: { type: 'string' },
                    volunteer_community_work: { type: 'string', enum: ['yes', 'no', 'prefer_not_to_say'] },
                    work_life_balance: { type: 'string' },
                    sleep_habits: { type: 'string' },
                    age_range_preference: { type: 'string', description: 'Age range like "25-35"' },
                    height_preference: { type: 'string' },
                  },
                }
              }
            }
          ],
          tool_choice: 'auto' // Let AI decide when to extract data while maintaining conversation
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('AI Gateway error:', aiResponse.status, errorText);
        throw new Error(`AI Gateway error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      console.log('AI Response:', JSON.stringify(aiData, null, 2));
      const assistantMessage = aiData.choices[0].message;
      
      // Extract profile data if tool was called
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        const toolCall = assistantMessage.tool_calls[0];
        if (toolCall.function.name === 'extract_profile_data') {
          profileUpdates = JSON.parse(toolCall.function.arguments);
          console.log('✅ Profile updates extracted:', profileUpdates);
          console.log('📝 Updating profile for user:', userId);
          
          // Update profile in database
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              ...profileUpdates,
              is_profile_complete: calculateProfileCompletion({ ...profile, ...profileUpdates }),
            })
            .eq('id', userId);

          if (updateError) {
            console.error('❌ Error updating profile:', updateError);
          } else {
            console.log('✅ Profile updated successfully with:', profileUpdates);
          }
        }
      }

      const modelText = (assistantMessage?.content || '').trim();
      
      // Check if content is actual conversational text (not code/debug output)
      const isGarbageContent = !modelText || 
                               modelText.includes('print(') || 
                               modelText.includes('default_api') ||
                               modelText.includes('run_code') ||
                               modelText.length < 3;
      
      // Use the AI's natural response only if it's meaningful text
      if (!isGarbageContent) {
        replyText = modelText;
      }
      
      // If AI didn't provide a good response or it's garbage, generate next question
      if (!replyText || isGarbageContent) {
        const newProfileState = { ...profile, ...profileUpdates };
        replyText = getNextQuestion(newProfileState, askedTopics, userLanguage);
      }

      // Store in cache for future use (only for user messages, not initial greeting)
      if (message && message.trim().length > 0 && replyText) {
        const normalizedMessage = message.toLowerCase().trim();
        const msgHash = await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(normalizedMessage)
        );
        const questionHash = Array.from(new Uint8Array(msgHash))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        await supabase
          .from('ai_response_cache')
          .insert({
            question_hash: questionHash,
            question: message,
            response: replyText
          })
          .then(result => {
            if (result.error) {
              console.log('Cache storage error (might be duplicate):', result.error.message);
            } else {
              console.log('💾 Response cached for future use');
            }
          });
      }
    }
    
    // Only use fallback if AI didn't provide a response
    if (!replyText) {
      const newProfileState = { ...profile, ...profileUpdates };
      replyText = getNextQuestion(newProfileState, askedTopics, userLanguage);
    }

    // Fetch all Diana's previous messages from database to check for duplicates
    const { data: dianaMessages } = await supabase
      .from('messages')
      .select('content')
      .eq('receiver_id', userId)
      .eq('is_from_diana', true)
      .order('created_at', { ascending: false })
      .limit(50); // Check last 50 messages

    // Deduplicate: never repeat a question already asked
    const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    const normalizedReply = normalize(replyText);
    
    const wasAlreadyAsked = dianaMessages?.some(
      (msg: any) => {
        const similarity = normalize(msg.content);
        // Check for exact match or very similar messages (first 50 chars)
        return similarity === normalizedReply || 
               (similarity.length > 50 && normalizedReply.length > 50 && 
                similarity.substring(0, 50) === normalizedReply.substring(0, 50));
      }
    );
    
    if (wasAlreadyAsked) {
      console.log('♻️ Question already asked before. Using unique follow-up.');
      
      // Get a truly unique follow-up by checking against all previous messages
      let attempts = 0;
      let uniqueFollowUp = getNonRepeatingFollowUp(conversationHistory, userLanguage);
      
      while (attempts < 10 && dianaMessages?.some((msg: any) => 
        normalize(msg.content).includes(normalize(uniqueFollowUp).substring(0, 30))
      )) {
        uniqueFollowUp = getNonRepeatingFollowUp(conversationHistory, userLanguage);
        attempts++;
      }
      
      replyText = uniqueFollowUp;
      console.log(`✅ Using unique follow-up after ${attempts} attempts`);
    }

    // Store message in database
    await supabase.from('messages').insert({
      sender_id: userId,
      receiver_id: null,
      content: message,
      is_from_diana: false,
    });

    await supabase.from('messages').insert({
      sender_id: null,
      receiver_id: userId,
      content: replyText,
      is_from_diana: true,
    });

    // Calculate new completion percentage
    const newProfile = { ...profile, ...profileUpdates };
    const completionPercentage = calculateProfileCompletion(newProfile);
    
    // Determine current category and completed categories
    const categoryStatus = determineCurrentCategory(newProfile);

    return new Response(
      JSON.stringify({
        reply: replyText,
        profileUpdates,
        completionPercentage,
        currentCategory: categoryStatus.current,
        completedCategories: categoryStatus.completed,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in chat-with-diana:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function getNextQuestion(p: any, askedTopics: Set<string> = new Set(), lang: string = 'en'): string {
  const q: Record<string, Record<string, string>> = {
    en: {
      name: "What's your name?",
      age: "How old are you?",
      gender: "What's your gender?",
      where_was_born: "Where were you born?",
      where_he_live: "Where do you currently live?",
      where_want_to_live: "Where would you like to live in the future?",
      marital_status: "What's your marital status?",
      have_children: "Do you have children?",
      want_children: "Do you want children in the future?",
      education_lvl: "What's your education level?",
      employment_status: "What's your employment status?",
      job: "What do you do for work?",
      height: "What's your height in centimeters?",
      fallback: "Is there anything else you'd like to share about yourself or what you're looking for?"
    },
    fr: {
      name: "Comment puis-je vous appeler ?",
      age: "Quel âge avez-vous ?",
      gender: "Quel est votre genre ?",
      where_was_born: "Où êtes-vous né(e) ?",
      where_he_live: "Où habitez-vous actuellement ?",
      where_want_to_live: "Où aimeriez-vous vivre à l’avenir ?",
      marital_status: "Quel est votre statut marital ?",
      have_children: "Avez-vous des enfants ?",
      want_children: "Souhaitez-vous avoir des enfants à l’avenir ?",
      education_lvl: "Quel est votre niveau d’études ?",
      employment_status: "Quel est votre statut professionnel ?",
      job: "Quel travail faites-vous ?",
      height: "Quelle est votre taille en centimètres ?",
      fallback: "Y a-t-il autre chose que vous aimeriez partager sur vous ou ce que vous recherchez ?"
    },
    ar: {
      name: "بماذا أناديك؟",
      age: "كم عمرك؟",
      gender: "ما هو جنسك؟",
      where_was_born: "أين وُلدت؟",
      where_he_live: "أين تعيش حالياً؟",
      where_want_to_live: "أين تود أن تعيش مستقبلاً؟",
      marital_status: "ما هي حالتك الاجتماعية؟",
      have_children: "هل لديك أطفال؟",
      want_children: "هل ترغب بإنجاب أطفال مستقبلاً؟",
      education_lvl: "ما هو مستواك الدراسي؟",
      employment_status: "ما هو وضعك المهني؟",
      job: "ما طبيعة عملك؟",
      height: "ما طولك بالسنتيمتر؟",
      fallback: "هل هناك أي شيء آخر تود مشاركته عن نفسك أو عمّا تبحث عنه؟"
    },
    tn: {
      name: "شنوّا نجم نناديك؟",
      age: "قدّاش في عمرك؟",
      gender: "شنوّا جنسك؟",
      where_was_born: "وين تولدت؟",
      where_he_live: "وين ساكن توّا؟",
      where_want_to_live: "وين تحب تسكن في المستقبل؟",
      marital_status: "شنوّا حالتك العائلية؟",
      have_children: "عندك صغار؟",
      want_children: "تحبّ يكون عندك صغار قدّام؟",
      education_lvl: "شنوّا مستواك القرايي؟",
      employment_status: "شنوّا وضعك المهني؟",
      job: "شنوّا تخدم؟",
      height: "قدّاش طولك بالسّنتيمتر؟",
      fallback: "فمّا شي آخر تحب تحكيه علي روحك ولا على اللي قاعد تدوّر عليه؟"
    }
  };

  const t = (key: keyof typeof q['en']) => (q[lang]?.[key] || q.en[key]);

  // Basic info
  if (!p || (!p.name && !askedTopics.has('name'))) return t('name');
  if (!p.age && !askedTopics.has('age')) return t('age');
  if (!p.gender && !askedTopics.has('gender')) return t('gender');
  if (!p.where_was_born && !askedTopics.has('where_was_born')) return t('where_was_born');
  if (!p.where_he_live && !askedTopics.has('where_he_live')) return t('where_he_live');
  if (!p.where_want_to_live && !askedTopics.has('where_want_to_live')) return t('where_want_to_live');
  
  // Health & Disabilities (fallback to EN if not translated)
  if (!p.health && !askedTopics.has('health')) return q[lang]?.health || "How would you describe your overall health?";
  if (!p.disabilities_and_special_need && !askedTopics.has('disabilities_and_special_need')) return q[lang]?.disabilities_and_special_need || "Do you have any disabilities or special needs?";
  if (p.disabilities_and_special_need === 'yes' && !p.disabilities_and_special_need_type && !askedTopics.has('disabilities_and_special_need_type')) {
    return q[lang]?.disabilities_and_special_need_type || "Could you share more about your disability or special need?";
  }
  if (!p.health_disability_preference && !askedTopics.has('health_disability_preference')) {
    return q[lang]?.health_disability_preference || "Do you have any preferences regarding health or disabilities in a partner?";
  }
  
  // Family & Relationships
  if (!p.marital_status && !askedTopics.has('marital_status')) return t('marital_status');
  if (!p.have_children && !askedTopics.has('have_children')) return t('have_children');
  if (!p.want_children && !askedTopics.has('want_children')) return t('want_children');
  
  // Education & Work
  if (!p.education_lvl && !askedTopics.has('education_lvl')) return t('education_lvl');
  if (!p.employment_status && !askedTopics.has('employment_status')) return t('employment_status');
  if (!p.job && !askedTopics.has('job') && p.employment_status && ['employed', 'self_employed', 'student'].includes(p.employment_status)) {
    return t('job');
  }
  if (!p.work_life_balance && !askedTopics.has('work_life_balance')) return q[lang]?.work_life_balance || "How would you describe your work-life balance?";
  
  // Religion & Lifestyle
  if (!p.religion && !askedTopics.has('religion')) return q[lang]?.religion || "What's your religion?";
  if (!p.practice_lvl && !askedTopics.has('practice_lvl')) return q[lang]?.practice_lvl || "How would you describe your religious practice level?";
  if (!p.smoking && !askedTopics.has('smoking')) return q[lang]?.smoking || "Do you smoke?";
  if (!p.drinking && !askedTopics.has('drinking')) return q[lang]?.drinking || "Do you drink alcohol?";
  if (!p.dietary_habits && !askedTopics.has('dietary_habits')) return q[lang]?.dietary_habits || "What are your dietary habits?";
  if (!p.sleep_habits && !askedTopics.has('sleep_habits')) return q[lang]?.sleep_habits || "What are your sleep habits?";
  
  // Hobbies & Interests
  if (!p.life_goal && !askedTopics.has('life_goal')) return q[lang]?.life_goal || "What's your main life goal or aspiration?";
  if ((!p.physical_activities || p.physical_activities.length === 0) && !askedTopics.has('physical_activities')) return q[lang]?.physical_activities || "What physical activities do you enjoy?";
  if ((!p.cultural_activities || p.cultural_activities.length === 0) && !askedTopics.has('cultural_activities')) return q[lang]?.cultural_activities || "What cultural activities interest you?";
  if ((!p.creative_hobbies || p.creative_hobbies.length === 0) && !askedTopics.has('creative_hobbies')) return q[lang]?.creative_hobbies || "Do you have any creative hobbies?";
  if ((!p.gaming_hobbies || p.gaming_hobbies.length === 0) && !askedTopics.has('gaming_hobbies')) return q[lang]?.gaming_hobbies || "What gaming hobbies do you have, if any?";
  
  // Travel
  if (!p.travel_frequency && !askedTopics.has('travel_frequency')) return q[lang]?.travel_frequency || "How often do you travel?";
  if (!p.type_of_trips && !askedTopics.has('type_of_trips')) return q[lang]?.type_of_trips || "What type of trips do you prefer?";
  if (!p.travel_style && !askedTopics.has('travel_style')) return q[lang]?.travel_style || "How would you describe your travel style?";
  if (!p.travel_planning && !askedTopics.has('travel_planning')) return q[lang]?.travel_planning || "How do you prefer to plan trips?";
  
  // Pets & Community
  if (!p.have_pet && !askedTopics.has('have_pet')) return t('have_children');
  if (p.have_pet === 'yes' && !p.pet && !askedTopics.has('pet')) return q[lang]?.pet || "What kind of pet(s) do you have?";
  if (!p.volunteer_community_work && !askedTopics.has('volunteer_community_work')) return q[lang]?.volunteer_community_work || "Do you participate in volunteer or community work?";
  
  // Location & Relocation
  if (!p.relocation_same_country && !askedTopics.has('relocation_same_country')) return q[lang]?.relocation_same_country || "Would you be open to relocating within the same country?";
  if (!p.relocation_across_countries && !askedTopics.has('relocation_across_countries')) return q[lang]?.relocation_across_countries || "Would you be open to relocating to another country?";
  
  // Physical Attributes
  if (!p.height && !askedTopics.has('height')) return t('height');
  
  // Relationship Preferences
  if (!p.age_range_preference && !askedTopics.has('age_range_preference')) return q[lang]?.age_range_preference || "What age range are you looking for in a partner?";
  if (!p.height_preference && !askedTopics.has('height_preference')) return q[lang]?.height_preference || "Do you have any height preferences for a partner?";
  if ((!p.red_flags || p.red_flags.length === 0) && !askedTopics.has('red_flags')) return q[lang]?.red_flags || "What are your relationship red flags or deal-breakers?";
  if (!p.role_in_relationship && !askedTopics.has('role_in_relationship')) return q[lang]?.role_in_relationship || "What role do you see yourself playing in a relationship?";
  
  // Fallback - All major fields covered
  return t('fallback');
}

function getNonRepeatingFollowUp(conversationHistory: any[], lang: string = 'en'): string {
  const optionsByLang: Record<string, string[]> = {
    en: [
      "Thanks! Tell me anything else that's important to you—values, hobbies, or what makes you happy.",
      "Got it. Share more about yourself—interests, routines, or what a perfect weekend looks like.",
      "Noted. Ask me anything about how I match people, or share more about what you value in relationships.",
      "I'm all ears! What else would you like to share? Could be about your daily life, dreams, or anything that defines you.",
      "Perfect! Feel free to tell me more about what matters to you, or ask me anything about finding your match.",
      "Interesting! What else should I know about you? Your passions, lifestyle, or what you're looking for in a partner?"
    ],
    fr: [
      "Merci ! N'hésitez pas à me parler de ce qui compte pour vous—vos valeurs, vos loisirs, ou ce qui vous rend heureux.",
      "Compris. Parlez-moi de vous—vos intérêts, vos habitudes, ou comment se passe un week-end parfait pour vous.",
      "Noté. Posez-moi vos questions sur le matching, ou parlez-moi de ce qui est important pour vous dans une relation.",
      "Je vous écoute ! Que souhaitez-vous partager d'autre ? Votre quotidien, vos rêves, ou tout ce qui vous définit.",
      "Parfait ! N'hésitez pas à me parler de ce qui compte pour vous, ou posez-moi vos questions sur la recherche de votre match.",
      "Intéressant ! Que devrais-je savoir d'autre sur vous ? Vos passions, votre style de vie, ou ce que vous recherchez chez un partenaire ?"
    ],
    ar: [
      "شكراً! أخبرني بأي شيء آخر مهم بالنسبة لك—القيم، الهوايات، أو ما يجعلك سعيداً.",
      "فهمت. شاركني المزيد عن نفسك—اهتماماتك، روتينك، أو كيف يبدو عطلة نهاية أسبوع مثالية.",
      "حسناً. اسألني أي شيء عن كيفية المطابقة، أو شاركني ما تقدره في العلاقات.",
      "أنا أستمع! ماذا تود أن تشارك أيضاً؟ حياتك اليومية، أحلامك، أو أي شيء يعرّفك.",
      "ممتاز! لا تتردد في إخباري بما يهمك، أو اسألني أي شيء عن إيجاد شريكك.",
      "مثير للاهتمام! ماذا يجب أن أعرف عنك أيضاً؟ شغفك، نمط حياتك، أو ما تبحث عنه في الشريك؟"
    ],
    tn: [
      "ياسر! حكيلي على أي حاجة أخرى مهمّة ليك—قيمك، هواياتك، ولا شنوّا يفرحك.",
      "فهمت. حكيلي على روحك أكثر—اهتماماتك، روتينك، ولا كيفاش يكون weekend مثالي ليك.",
      "ماشي. استفسر منّي على كيفاش نلقى matches، ولا حكيلي على شنوّا مهم ليك في العلاقة.",
      "أنا نسمع! شنوّا تحب تحكيلي كمان؟ حياتك اليومية، أحلامك، ولا أي حاجة تعرّفك.",
      "مليح برشا! ما تتردّدش باش تحكيلي على شنوّا يهمّك، ولا استفسر منّي على كيفاش نلقاو match ليك.",
      "Intéressant! شنوّا لازم نعرف عليك كمان؟ شغفك، نمط حياتك، ولا شنوّا قاعد تدوّر عليه؟"
    ]
  };
  
  const options = optionsByLang[lang] || optionsByLang.en;
  
  // Filter out options that were already used in recent conversation
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const recentMessages = conversationHistory.slice(-10);
  const usedOptions = new Set(
    recentMessages
      .filter((m: any) => m.role === 'assistant')
      .map((m: any) => normalize(m.content))
  );
  
  const availableOptions = options.filter(opt => !usedOptions.has(normalize(opt)));
  
  // If all options were used, return a completely different dynamic response
  if (availableOptions.length === 0) {
    const dynamicOptionsByLang: Record<string, string[]> = {
      en: [
        "What's on your mind? Feel free to share anything you'd like me to know.",
        "I'm here to listen! What would you like to talk about?",
        "Tell me more about what makes you, you!",
        "What else is important for me to know about your story?"
      ],
      fr: [
        "À quoi pensez-vous ? N'hésitez pas à partager ce que vous voulez que je sache.",
        "Je suis là pour écouter ! De quoi aimeriez-vous parler ?",
        "Parlez-moi plus de ce qui fait de vous ce que vous êtes !",
        "Qu'est-ce qui est important que je sache sur votre histoire ?"
      ],
      ar: [
        "ما الذي يدور في ذهنك؟ لا تتردد في مشاركة أي شيء تريد أن أعرفه.",
        "أنا هنا للاستماع! عن ماذا تود أن تتحدث؟",
        "أخبرني المزيد عما يجعلك أنت!",
        "ما الذي من المهم أن أعرفه عن قصتك؟"
      ],
      tn: [
        "شنوّا في بالك? ما تتردّدش تحكيلي على أي حاجة تحب نعرفها.",
        "أنا هوني باش نسمع! على شنوّا تحب تحكي?",
        "حكيلي أكثر على شنوّا يخلّيك أنت!",
        "شنوّا المهم نعرفو على قصّتك?"
      ]
    };
    const dynamicOptions = dynamicOptionsByLang[lang] || dynamicOptionsByLang.en;
    return dynamicOptions[Math.floor(Math.random() * dynamicOptions.length)];
  }
  
  return availableOptions[Math.floor(Math.random() * availableOptions.length)];
}

function looksLikeAppQuestion(msg: string): boolean {
  return /how\s+(does|do)?\s*(this\s+)?(app|application|soulmate)\s+(work|works)\??/i.test(msg) || /(what|how).*app.*work/i.test(msg);
}

function looksLikeClarifyQuestion(msg: string): boolean {
  return /(what.*(mean|meaning)|explain|clarify|what do you mean|why.*ask)/i.test(msg);
}

function getExplanationForQuestion(q: string): string {
  const s = (q || '').toLowerCase();
  if (s.includes('gender')) return "I'm asking your gender to personalize matches. Options: Male, Female, Other.";
  if (s.includes('marital status')) return "Marital status helps understand your current situation. Options: Single, Divorced, Widowed.";
  if (s.includes('religion')) return "Religion helps respect your beliefs and preferences. Options: Muslim, Christian, Jewish, Buddhist, Hindu, Other, None.";
  if (s.includes('religious practice') || s.includes('practice')) return "Religious practice shows how observant you are. Options: Very Religious, Religious, Moderate, Not Religious.";
  if (s.includes('education level')) return "Education level helps match lifestyles and goals. Options: High School, Bachelor, Master, PhD, Vocational, Other.";
  if (s.includes('employment status')) return "Employment status gives a snapshot of your work life. Options: Employed, Self-Employed, Student, Unemployed, Retired.";
  if (s.includes('children')) return "This tells us about your family situation. Options: Yes, No, Prefer not to say.";
  if (s.includes('smoke') || s.includes('drink')) return "These lifestyle choices help gauge compatibility. Options: Yes, No, Prefer not to say.";
  if (s.includes('travel')) return "Travel frequency shows lifestyle and interests. Options: Never, Rarely, Sometimes, Often, Very Often.";
  return "I'm asking this to complete your profile so I can find the best compatible matches for you.";
}

function calculateProfileCompletion(profile: any): number {
  if (!profile) return 0;
  
  const requiredFields = [
    'name', 'age', 'gender', 'height', 'where_he_live', 'where_want_to_live', 'where_was_born',
    'health', 'disabilities_and_special_need', 'health_disability_preference',
    'education_lvl', 'employment_status', 'religion', 'practice_lvl',
    'smoking', 'drinking', 'life_goal', 'marital_status',
    'have_children', 'want_children', 'physical_activities', 'cultural_activities',
    'creative_hobbies', 'gaming_hobbies', 'travel_frequency', 'type_of_trips',
    'travel_style', 'travel_planning', 'dietary_habits', 'sleep_habits', 'have_pet',
    'relocation_same_country', 'relocation_across_countries', 'work_life_balance',
    'volunteer_community_work', 'red_flags', 'role_in_relationship',
    'age_range_preference', 'height_preference'
  ];
  
  // Conditional fields (only count if applicable)
  const conditionalFields = [];
  
  // Job only required if employed/self-employed/student
  if (profile.employment_status && ['employed', 'self_employed', 'student'].includes(profile.employment_status)) {
    conditionalFields.push('job');
  }
  
  // Pet type only required if has pets
  if (profile.have_pet === 'yes') {
    conditionalFields.push('pet');
  }
  
  // Disability type only required if has disability
  if (profile.disabilities_and_special_need === 'yes') {
    conditionalFields.push('disabilities_and_special_need_type');
  }
  
  const allRequiredFields = [...requiredFields, ...conditionalFields];
  
  const filledFields = allRequiredFields.filter(field => {
    const value = profile[field];
    if (value === null || value === undefined || value === '') return false;
    // Arrays should have at least one item
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }).length;
  
  return Math.round((filledFields / allRequiredFields.length) * 100);
}

function determineCurrentCategory(profile: any): { current: string; completed: string[] } {
  const categories = {
    basics: ['name', 'age', 'gender', 'where_he_live'],
    relationship: ['marital_status', 'have_children', 'want_children'],
    career: ['education_lvl', 'employment_status', 'job'],
    beliefs: ['religion', 'practice_lvl', 'smoking', 'drinking'],
    goals: ['life_goal'],
    activities: ['height', 'physical_activities', 'cultural_activities', 'creative_hobbies', 'gaming_hobbies'],
    travel: ['travel_frequency', 'type_of_trips', 'travel_style', 'dietary_habits'],
    living: ['have_pet', 'relocation_same_country', 'relocation_across_countries', 'work_life_balance'],
    values: ['red_flags', 'role_in_relationship']
  };

  const completed: string[] = [];
  let current = 'basics';

  for (const [categoryId, fields] of Object.entries(categories)) {
    const allFilled = fields.every(field => {
      const value = profile?.[field];
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    });

    if (allFilled) {
      completed.push(categoryId);
    } else {
      // First incomplete category is the current one
      if (current === 'basics' || completed.includes(current)) {
        current = categoryId;
      }
    }
  }

  // If all categories are complete, current should be the last one
  if (completed.length === Object.keys(categories).length) {
    current = 'values';
  }

  return { current, completed };
}

function extractNameFromMessage(msg: string): string | null {
  if (!msg) return null;
  const text = msg.trim();

  const patterns = [
    /my\s+name\s+is\s+([A-Za-zÀ-ÖØ-öø-ÿ' -]{2,40})/i,
    /\bi['’]m\s+([A-Za-zÀ-ÖØ-öø-ÿ' -]{2,40})/i,
    /\bi\s+am\s+([A-Za-zÀ-ÖØ-öø-ÿ' -]{2,40})/i,
    /\bit['’]?s\s+([A-Za-zÀ-ÖØ-öø-ÿ' -]{2,40})/i,
    /name\s*[:\-]\s*([A-Za-zÀ-ÖØ-öø-ÿ' -]{2,40})/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) return sanitizeName(m[1]);
  }

  if (/^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,40}$/.test(text) && !/\d/.test(text)) {
    return sanitizeName(text);
  }
  return null;

  function sanitizeName(n: string) {
    return n
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/^([a-zà-öø-ÿ])/g, (c) => c.toUpperCase())
      .replace(/([ -][a-zà-öø-ÿ])/g, (c) => c.toUpperCase());
  }
}

