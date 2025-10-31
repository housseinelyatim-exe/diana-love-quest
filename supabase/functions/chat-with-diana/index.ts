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

    const systemPrompt = `You are Diana, a warm and empathetic AI matchmaking assistant for Soulmate, an app focused on serious relationships leading to marriage. Your role is to:

1. Collect user information naturally through conversation
2. Be conversational, not interrogative - let the conversation flow naturally
3. Extract and store profile data from user responses
4. Ask follow-up questions based on what the user shares
5. Encourage users but respect their pace
6. Be culturally sensitive, especially regarding religion, family values, and marriage expectations
7. When the profile reaches 50% completion, gently inform the user they can access their dashboard, but encourage them to continue for better matches

Current profile completion: ${calculateProfileCompletion(profile)}%

Profile data collected so far:
${JSON.stringify(profile, null, 2)}

When responding:
- Be warm and encouraging
- Ask one question at a time
- If the user provides information about multiple fields, acknowledge it all
- Use natural transitions between topics
- Remember context from previous messages
- Translate any non-English responses to English before analysis

Fields to collect (in a natural, conversational way):
- Personal: name, age, gender, height, location (where_he_live, where_want_to_live, where_was_born)
- Background: education_lvl, employment_status, job, religion, practice_lvl
- Lifestyle: smoking, drinking, physical_activities, cultural_activities, creative_hobbies
- Habits: sleep_habits, dietary_habits, work_life_balance, travel_frequency
- Goals: life_goal, marital_status, have_children, want_children, role_in_relationship
- Preferences: age_range_preference, height_preference, red_flags

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
    const assistantMessage = aiData.choices[0].message;
    
    // Extract profile data if tool was called
    let profileUpdates = {};
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolCall = assistantMessage.tool_calls[0];
      if (toolCall.function.name === 'extract_profile_data') {
        profileUpdates = JSON.parse(toolCall.function.arguments);
        
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

    // Get the reply text - handle case where AI calls tool without providing content
    let replyText = assistantMessage.content || '';
    
    // If no content but tool was called, generate a follow-up response
    if (!replyText && profileUpdates && Object.keys(profileUpdates).length > 0) {
      replyText = "Thank you for sharing! Let me get to know you better. ";
      
      // Add contextual follow-up based on what was collected
      const completionPercentage = calculateProfileCompletion({ ...profile, ...profileUpdates });
      if (completionPercentage < 20) {
        replyText += "How old are you?";
      } else if (completionPercentage < 40) {
        replyText += "Where are you currently living?";
      } else if (completionPercentage < 60) {
        replyText += "Tell me about your education and career.";
      } else {
        replyText += "What are you looking for in a life partner?";
      }
    }

    // Absolute fallback to ensure a message is always returned
    if (!replyText) {
      const completionPercentage = calculateProfileCompletion(profile);
      replyText = completionPercentage < 10
        ? "Nice to meet you! How old are you?"
        : "Thanks! Could you tell me where you currently live?";
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
