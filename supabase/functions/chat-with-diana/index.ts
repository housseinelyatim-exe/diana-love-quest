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

**WHEN TO EXTRACT DATA:**
✅ Extract when you get clear answers like "Houssein", "22", "Male", "Paris"
❌ DON'T extract silly/vague answers like "guess", "you tell me", "hh", "idk"

**IF USER DOESN'T ANSWER:**
- Don't push or repeat the question
- Say something like "No worries! So what brings you to Soulmate?" or "That's cool - so what are you looking for?"
- Move on naturally and chat about other things

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
9. job
10. religion
11. practice_lvl
12. smoking
13. drinking
14. want_children
15. life_goal
16. height
17. physical_activities
18. travel_frequency
19. work_life_balance

Remember: BE PATIENT AND RELAXED. Don't nag. Let the conversation flow naturally.`;

    // Call Lovable AI
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
                  travel_frequency: { type: 'string', enum: ['never', 'rarely', 'sometimes', 'often', 'very_often'] },
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
            is_profile_complete: calculateProfileCompletion({ ...profile, ...profileUpdates }) === 100,
          })
          .eq('id', userId);

        if (updateError) {
          console.error('❌ Error updating profile:', updateError);
        } else {
          console.log('✅ Profile updated successfully with:', profileUpdates);
        }
      }
    }

    // Compose deterministic next question to avoid repetition
    const newProfileState = { ...profile, ...profileUpdates };
    const nextQuestion = getNextQuestion(newProfileState);

    let ack = '';
    if (profileUpdates && Object.keys(profileUpdates).length > 0) {
      if (profileUpdates.name) ack += `Nice to meet you, ${profileUpdates.name}. `;
      if (profileUpdates.age) ack += `Got it, you're ${profileUpdates.age}. `;
      if (profileUpdates.gender) ack += `Thanks for sharing your gender. `;
      if (profileUpdates.where_he_live) ack += `Thanks, noted your location. `;
    }

    const modelText = (assistantMessage?.content || '').trim();
    const userMsg = (message || '');
    const appExplain = "Soulmate helps you find serious, compatible partners leading to marriage. I ask a few simple questions to build your profile, then suggest matches based on shared values, lifestyle, and goals. The more complete your profile, the better your matches.";

    let replyText = '';
    if (modelText) {
      replyText = modelText;
    } else if (looksLikeAppQuestion(userMsg)) {
      replyText = `${appExplain}\n\n${nextQuestion}`;
    } else if (looksLikeClarifyQuestion(userMsg)) {
      replyText = `${getExplanationForQuestion(nextQuestion)} ${nextQuestion}`;
    } else {
      replyText = `${ack}${nextQuestion}`.trim();
    }

    if (!replyText) {
      replyText = nextQuestion;
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

function getNextQuestion(p: any): string {
  if (!p || !p.name) return "What's your name?";
  if (!p.age) return "How old are you?";
  if (!p.gender) return "What's your gender? (Male / Female / Other)";
  if (!p.where_he_live) return "Where do you currently live?";
  if (!p.marital_status) return "What's your marital status? (Single / Divorced / Widowed)";
  if (!p.have_children) return "Do you have children? (Yes / No / Prefer not to say)";
  if (!p.education_lvl) return "What's your education level? (High School / Bachelor / Master / PhD / Vocational / Other)";
  if (!p.employment_status) return "What's your employment status? (Employed / Self-Employed / Student / Unemployed / Retired)";
  if (!p.job) return "What do you do for work?";
  if (!p.religion) return "What's your religion? (Muslim / Christian / Jewish / Buddhist / Hindu / Other / None)";
  if (!p.practice_lvl) return "How would you describe your religious practice? (Very Religious / Religious / Moderate / Not Religious)";
  if (!p.smoking) return "Do you smoke? (Yes / No / Prefer not to say)";
  if (!p.drinking) return "Do you drink alcohol? (Yes / No / Prefer not to say)";
  if (!p.want_children) return "Do you want children in the future? (Yes / No / Prefer not to say)";
  if (!p.life_goal) return "What's your main life goal or aspiration?";
  if (!p.height) return "What's your height in centimeters?";
  if (!p.physical_activities || p.physical_activities.length === 0) return "What physical activities do you enjoy? (e.g., gym, running, yoga)";
  if (!p.travel_frequency) return "How often do you travel? (Never / Rarely / Sometimes / Often / Very Often)";
  if (!p.work_life_balance) return "How would you describe your work-life balance?";
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
    'education_lvl', 'employment_status', 'religion', 'practice_lvl',
    'smoking', 'drinking', 'life_goal', 'marital_status',
    'have_children', 'want_children', 'travel_frequency'
  ];
  
  const filledFields = requiredFields.filter(field => 
    profile[field] !== null && profile[field] !== undefined && profile[field] !== ''
  ).length;
  
  return Math.round((filledFields / requiredFields.length) * 100);
}

