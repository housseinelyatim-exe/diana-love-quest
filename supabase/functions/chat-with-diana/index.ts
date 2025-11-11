import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
- Be helpful when they ask questions about the app or process

**CORE RULES:**
1. Ask ONE question at a time in a natural, conversational way
2. Users can answer however they want - accept natural language, not just specific options
3. Provide examples or suggestions casually, but NEVER make them look like required choices
4. ONLY extract data when you get a CLEAR, VALID answer
5. If the user dodges, gives a silly answer, or doesn't respond → acknowledge casually and move on naturally to chat about something else
6. DON'T repeat the same question multiple times - if they didn't answer the first time, let it go
7. Answer any questions they have about the app or process warmly

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

**PRIORITY QUESTIONS** (ask missing fields in this order, but be chill about it):
1. name
2. age
3. gender
4. where_he_live
5. marital_status
6. have_children
7. education_lvl
8. employment_status
9. job (⚠️ SKIP IF employment_status is "unemployed" or "retired" - they don't have a job!)
10. religion
11. practice_lvl
12. smoking
13. drinking
14. want_children
15. life_goal
16. height
17. physical_activities
18. cultural_activities
19. creative_hobbies
20. gaming_hobbies
21. travel_frequency
22. type_of_trips
23. travel_style
24. dietary_habits
25. have_pet (+ pet if yes)
26. relocation_same_country
27. relocation_across_countries
28. work_life_balance
29. red_flags
30. role_in_relationship

**CONDITIONAL LOGIC - VERY IMPORTANT:**
- NEVER ask about "job" if employment_status is "unemployed" or "retired"
- If they're unemployed/retired, move directly to the next question (religion)

**🚫 TOPICS YOU'VE ALREADY ASKED ABOUT (NEVER ASK AGAIN):**
${Array.from(askedTopics).map(t => `- ${t}`).join('\n') || '(none yet)'}

These topics are FORBIDDEN - skip them completely even if data is missing.

Remember: BE PATIENT AND RELAXED. Don't nag. Let the conversation flow naturally.`;

    // ===== RESPONSE CACHING LOGIC =====
    let replyText = '';
    let profileUpdates: Record<string, any> = {};
    
    // Only cache if user sent a message (not initial greeting)
    if (message && message.trim().length > 0) {
      // Normalize and hash the message for cache lookup
      const normalizedMessage = message.toLowerCase().trim();
      const msgHash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(normalizedMessage)
      );
      const questionHash = Array.from(new Uint8Array(msgHash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      console.log('🔍 Checking cache for message hash:', questionHash);

      // Check cache
      const { data: cached } = await supabase
        .from('ai_response_cache')
        .select('*')
        .eq('question_hash', questionHash)
        .single();

      if (cached) {
        console.log('✅ Cache hit! Using cached response');
        replyText = cached.response;
        
        // Update cache hit count and last used timestamp
        await supabase
          .from('ai_response_cache')
          .update({ 
            hit_count: cached.hit_count + 1,
            last_used_at: new Date().toISOString()
          })
          .eq('id', cached.id);
      }
    }

    // Call Lovable AI only if not cached
    if (!replyText) {
      console.log('❌ Cache miss or initial greeting. Calling AI...');
      
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
            ...conversationHistory,
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
      
      // Use the AI's natural response - it knows how to handle conversation flow
      replyText = modelText;
      
      // Only use fallback if AI didn't provide a response
      if (!replyText) {
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

