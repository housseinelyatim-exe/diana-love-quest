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

    const systemPrompt = `You are Diana, a warm and empathetic AI matchmaking assistant for Soulmate. You help users build their profile in a relaxed, conversational way.

**YOUR PERSONALITY:**
- Warm, friendly, and patient - NEVER pushy
- If someone doesn't answer, let it go gracefully - don't repeat the same question
- Chat naturally - this isn't an interrogation
- Show genuine interest, but respect when they want to skip or change topics
- Be helpful when they ask questions about the app or process

**CORE RULES:**
1. Ask ONE question at a time
2. Always provide answer options for multiple-choice questions
3. ONLY extract data when you get a CLEAR, VALID answer
4. If the user dodges, gives a silly answer, or doesn't respond → acknowledge casually and move on naturally to chat about something else
5. DON'T repeat the same question multiple times - if they didn't answer the first time, let it go
6. Answer any questions they have about the app or process warmly

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

**ANSWER OPTIONS BY FIELD:**
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

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
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
    let profileUpdates: Record<string, any> = {};
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
    let replyText = modelText;
    
    // Only use fallback if AI didn't provide a response
    if (!replyText) {
      const newProfileState = { ...profile, ...profileUpdates };
      replyText = getNextQuestion(newProfileState, askedTopics);
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

    return new Response(
      JSON.stringify({
        reply: replyText,
        profileUpdates,
        completionPercentage,
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

function getNextQuestion(p: any, askedTopics: Set<string> = new Set()): string {
  if (!p || (!p.name && !askedTopics.has('name'))) return "What's your name?";
  if (!p.age && !askedTopics.has('age')) return "How old are you?";
  if (!p.gender && !askedTopics.has('gender')) return "What's your gender? (Male / Female / Other)";
  if (!p.where_he_live && !askedTopics.has('where_he_live')) return "Where do you currently live?";
  if (!p.marital_status && !askedTopics.has('marital_status')) return "What's your marital status? (Single / Divorced / Widowed)";
  if (!p.have_children && !askedTopics.has('have_children')) return "Do you have children? (Yes / No / Prefer not to say)";
  if (!p.education_lvl && !askedTopics.has('education_lvl')) return "What's your education level? (High School / Bachelor / Master / PhD / Vocational / Other)";
  if (!p.employment_status && !askedTopics.has('employment_status')) return "What's your employment status? (Employed / Self-Employed / Student / Unemployed / Retired)";
  
  // Only ask about job if they're employed, self-employed, or student AND haven't been asked
  if (!p.job && !askedTopics.has('job') && p.employment_status && ['employed', 'self_employed', 'student'].includes(p.employment_status)) {
    return "What do you do for work?";
  }
  
  if (!p.religion && !askedTopics.has('religion')) return "What's your religion? (Muslim / Christian / Jewish / Buddhist / Hindu / Other / None)";
  if (!p.practice_lvl && !askedTopics.has('practice_lvl')) return "How would you describe your religious practice? (Very Religious / Religious / Moderate / Not Religious)";
  if (!p.smoking && !askedTopics.has('smoking')) return "Do you smoke? (Yes / No / Prefer not to say)";
  if (!p.drinking && !askedTopics.has('drinking')) return "Do you drink alcohol? (Yes / No / Prefer not to say)";
  if (!p.want_children && !askedTopics.has('want_children')) return "Do you want children in the future? (Yes / No / Prefer not to say)";
  if (!p.life_goal && !askedTopics.has('life_goal')) return "What's your main life goal or aspiration?";
  if (!p.height && !askedTopics.has('height')) return "What's your height in centimeters?";
  if ((!p.physical_activities || p.physical_activities.length === 0) && !askedTopics.has('physical_activities')) return "What physical activities do you enjoy? (e.g., gym, running, yoga)";
  if ((!p.cultural_activities || p.cultural_activities.length === 0) && !askedTopics.has('cultural_activities')) return "What cultural activities do you enjoy? (e.g., museums, theater, concerts)";
  if ((!p.creative_hobbies || p.creative_hobbies.length === 0) && !askedTopics.has('creative_hobbies')) return "Do you have any creative hobbies? (e.g., painting, writing, music)";
  if ((!p.gaming_hobbies || p.gaming_hobbies.length === 0) && !askedTopics.has('gaming_hobbies')) return "What gaming hobbies do you have, if any? (e.g., video games, board games)";
  if (!p.travel_frequency && !askedTopics.has('travel_frequency')) return "How often do you travel? (Never / Rarely / Sometimes / Often / Very Often)";
  if (!p.type_of_trips && !askedTopics.has('type_of_trips')) return "What type of trips do you prefer? (e.g., adventure, relaxation, cultural)";
  if (!p.travel_style && !askedTopics.has('travel_style')) return "How would you describe your travel style? (e.g., budget, luxury, backpacking)";
  if (!p.dietary_habits && !askedTopics.has('dietary_habits')) return "What are your dietary habits? (e.g., vegetarian, vegan, no restrictions)";
  if (!p.have_pet && !askedTopics.has('have_pet')) return "Do you have any pets? (Yes / No / Prefer not to say)";
  if (p.have_pet === 'yes' && !p.pet && !askedTopics.has('pet')) return "What kind of pet(s) do you have?";
  if (!p.relocation_same_country && !askedTopics.has('relocation_same_country')) return "Would you be open to relocating within the same country? (Yes / No / Prefer not to say)";
  if (!p.relocation_across_countries && !askedTopics.has('relocation_across_countries')) return "Would you be open to relocating to another country? (Yes / No / Prefer not to say)";
  if (!p.work_life_balance && !askedTopics.has('work_life_balance')) return "How would you describe your work-life balance?";
  if ((!p.red_flags || p.red_flags.length === 0) && !askedTopics.has('red_flags')) return "What are your relationship red flags or deal-breakers?";
  if (!p.role_in_relationship && !askedTopics.has('role_in_relationship')) return "What role do you see yourself playing in a relationship?";
  return "What are you looking for in a life partner?";
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
    'name', 'age', 'gender', 'height', 'where_he_live',
    'education_lvl', 'employment_status', 'job', 'religion', 'practice_lvl',
    'smoking', 'drinking', 'life_goal', 'marital_status',
    'have_children', 'want_children', 'physical_activities', 'cultural_activities',
    'creative_hobbies', 'gaming_hobbies', 'travel_frequency', 'type_of_trips',
    'travel_style', 'dietary_habits', 'have_pet', 'relocation_same_country',
    'relocation_across_countries', 'work_life_balance', 'red_flags', 'role_in_relationship'
  ];
  
  const filledFields = requiredFields.filter(field => 
    profile[field] !== null && profile[field] !== undefined && profile[field] !== ''
  ).length;
  
  return Math.round((filledFields / requiredFields.length) * 100);
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

