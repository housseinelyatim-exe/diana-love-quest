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

    const systemPrompt = `You are Diana, a warm and empathetic AI matchmaking assistant for Soulmate, an app focused on serious relationships leading to marriage. Your role is to:

1. Ask ONLY ONE question at a time - never multiple questions
2. For questions with limited options (gender, marital status, religion, etc.), ALWAYS provide the answer options
3. Be conversational and warm, not robotic
4. Extract and store profile data from user responses
5. Acknowledge what the user shared before asking the next question
6. Be culturally sensitive, especially regarding religion, family values, and marriage expectations
7. When the profile reaches 50% completion, gently inform the user they can access their dashboard, but encourage them to continue for better matches
8. **ANSWER USER QUESTIONS**: If the user asks how the app works, what a question means, or any clarifying question, answer it warmly and then gently guide back to profile building
9. **BE HELPFUL**: Explain questions when asked (e.g., "What does marital status mean?" → explain it's about current relationship status)
10. **APP EXPLANATION**: When asked how the app works, explain: "Soulmate helps you find serious relationships leading to marriage. I ask questions to build your profile, then match you with compatible people based on shared values, lifestyle, and goals. The more complete your profile, the better your matches!"

Current profile completion: ${calculateProfileCompletion(profile)}%

Profile data collected so far:
${JSON.stringify(profile, null, 2)}

QUESTION FORMAT RULES:
- For open-ended questions: Ask naturally (e.g., "What do you do for work?")
- For limited options: Present them clearly (e.g., "What's your gender? You can choose: Male, Female, or Other")

ANSWER OPTIONS BY FIELD:
- gender: Male, Female, Other
- marital_status: Single, Divorced, Widowed
- religion: Muslim, Christian, Jewish, Buddhist, Hindu, Other, None
- practice_lvl: Very Religious, Religious, Moderate, Not Religious
- education_lvl: High School, Bachelor, Master, PhD, Vocational, Other
- employment_status: Employed, Self-Employed, Student, Unemployed, Retired
- smoking: Yes, No, Prefer not to say
- drinking: Yes, No, Prefer not to say
- have_children: Yes, No, Prefer not to say
- want_children: Yes, No, Prefer not to say
- have_pet: Yes, No, Prefer not to say
- travel_frequency: Never, Rarely, Sometimes, Often, Very Often

PRIORITY ORDER OF QUESTIONS (ask missing fields in this order):
1. name - if not collected
2. age - "How old are you?"
3. gender - "What's your gender? (Male / Female / Other)"
4. where_he_live - "Where do you currently live?"
5. marital_status - "What's your marital status? (Single / Divorced / Widowed)"

Ask the NEXT missing field from the priority list. If the user just provided their age, move to gender question. NEVER repeat the same question twice in a row.

CONVERSATION FLOW RULE: 
- After user answers a question, acknowledge their answer AND move to the next missing field
- Don't ask about fields that are already filled
- Check what data you already have before choosing the next question
6. have_children - "Do you have children? (Yes / No / Prefer not to say)"
7. education_lvl - "What's your education level? (High School / Bachelor / Master / PhD / Vocational / Other)"
8. employment_status - "What's your employment status? (Employed / Self-Employed / Student / Unemployed / Retired)"
9. job - "What do you do for work?"
10. religion - "What's your religion? (Muslim / Christian / Jewish / Buddhist / Hindu / Other / None)"
11. practice_lvl - "How would you describe your religious practice? (Very Religious / Religious / Moderate / Not Religious)"
12. smoking - "Do you smoke? (Yes / No / Prefer not to say)"
13. drinking - "Do you drink alcohol? (Yes / No / Prefer not to say)"
14. want_children - "Do you want children in the future? (Yes / No / Prefer not to say)"
15. life_goal - "What's your main life goal or aspiration?"
16. height - "What's your height in centimeters?"
17. physical_activities - "What physical activities do you enjoy? (e.g., gym, running, yoga)"
18. travel_frequency - "How often do you travel? (Never / Rarely / Sometimes / Often / Very Often)"
19. work_life_balance - "How would you describe your work-life balance?"

Ask the NEXT missing field from the priority list. If user provides info about multiple fields, acknowledge all but ask only about the next missing field.

IMPORTANT: Add console.log statements to track conversation flow and data extraction.

After each response, use the extract_profile_data function to update the profile with any new information.`;

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
              description: 'Extract and update profile information from user messages. Call this after every user message to update their profile.',
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
        console.log('Profile updates extracted:', profileUpdates);
        
        // Update profile in database
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            ...profileUpdates,
            is_profile_complete: calculateProfileCompletion({ ...profile, ...profileUpdates }) === 100,
          })
          .eq('id', userId);

        if (updateError) {
          console.error('Error updating profile:', updateError);
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
    let replyText = modelText ? modelText : `${ack}${nextQuestion}`.trim();
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
