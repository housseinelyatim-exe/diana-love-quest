import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to generate hash for caching
async function generateHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Helper function to check and retrieve cached response
async function getCachedResponse(supabase: any, questionHash: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("ai_response_cache")
    .select("response, id, hit_count")
    .eq("question_hash", questionHash)
    .single();

  if (error || !data) {
    return null;
  }

  // Update hit count and last_used_at
  await supabase
    .from("ai_response_cache")
    .update({
      hit_count: (data.hit_count || 0) + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", data.id);

  console.log("💾 Cache hit! Using cached response");
  return data.response;
}

// Helper function to cache new response
async function cacheResponse(supabase: any, question: string, questionHash: string, response: string): Promise<void> {
  await supabase.from("ai_response_cache").insert({
    question,
    question_hash: questionHash,
    response,
    hit_count: 0,
  });

  console.log("💾 Cached new response");
}

// Mandatory questions that cannot be skipped
const MANDATORY_QUESTIONS = ["name", "age", "gender", "health", "age_range_preference"];

// Predefined question list - comprehensive coverage of all profile fields
const QUESTION_LIST = [
  // Basic Info (3 questions)
  { field: "name", category: "basic" },
  { field: "age", category: "basic" },
  { field: "gender", category: "basic" },

  // Location (3 questions)
  { field: "where_was_born", category: "location" },
  { field: "where_he_live", category: "location" },
  { field: "where_want_to_live", category: "location" },

  // Physical (2 questions)
  { field: "height", category: "physical" },
  { field: "height_preference", category: "physical" },

  // Family (3 questions)
  { field: "marital_status", category: "family" },
  { field: "have_children", category: "family" },
  { field: "want_children", category: "family" },

  // Career (4 questions)
  { field: "education_lvl", category: "career" },
  { field: "employment_status", category: "career" },
  { field: "job", category: "career" },
  { field: "work_life_balance", category: "career" },

  // Values & Religion (3 questions)
  { field: "religion", category: "values" },
  { field: "practice_lvl", category: "values" },
  { field: "life_goal", category: "values" },

  // Health & Wellness (4 questions)
  { field: "health", category: "health" },
  { field: "disabilities_and_special_need", category: "health" },
  { field: "disabilities_and_special_need_type", category: "health" },
  { field: "health_disability_preference", category: "health" },

  // Lifestyle Habits (5 questions)
  { field: "smoking", category: "lifestyle" },
  { field: "drinking", category: "lifestyle" },
  { field: "dietary_habits", category: "lifestyle" },
  { field: "sleep_habits", category: "lifestyle" },
  { field: "volunteer_community_work", category: "lifestyle" },

  // Pets (2 questions)
  { field: "have_pet", category: "pets" },
  { field: "pet", category: "pets" },

  // Hobbies & Activities (4 questions)
  { field: "physical_activities", category: "hobbies" },
  { field: "cultural_activities", category: "hobbies" },
  { field: "creative_hobbies", category: "hobbies" },
  { field: "gaming_hobbies", category: "hobbies" },

  // Travel (4 questions)
  { field: "travel_frequency", category: "travel" },
  { field: "type_of_trips", category: "travel" },
  { field: "travel_style", category: "travel" },
  { field: "travel_planning", category: "travel" },

  // Relocation (2 questions)
  { field: "relocation_same_country", category: "relocation" },
  { field: "relocation_across_countries", category: "relocation" },

  // Relationship Preferences (3 questions)
  { field: "role_in_relationship", category: "relationship" },
  { field: "age_range_preference", category: "relationship" },
  { field: "red_flags", category: "relationship" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory, userId } = await req.json();
    console.log("💬 Chat request:", { userId, messageLength: message?.length || 0 });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch profile
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();

    console.log("👤 Profile data:", profile);

    // Initial greeting
    if (!message || message.trim() === "") {
      const lang = profile?.language || "en";
      const greetingMessages: Record<string, string[]> = {
        en: [
          "Hi! I'm Diana, your personal matchmaking assistant 💝",
          "Welcome to a new way of finding meaningful connections. Let me explain how this works.",
          "I'll have a natural conversation with you to build your profile. I'll ask thoughtful questions about your life - background, values, lifestyle, career, hobbies, travel, family goals, and what you're looking for in a partner.",
          "The questions are organized into categories like basics, location, family, career, beliefs, hobbies, and travel. You can track your progress as we go.",
          "Here's something important - while some basic questions are required (like your name, age, and gender), MOST questions are completely optional. You can skip any question by saying 'skip' or 'pass'.",
          "However, here's the key: The more you answer, the better your matches will be! Each answer helps our algorithm paint a more complete picture of who you are.",
          "Once your profile is at least 50% complete, you'll unlock the Discover section with potential matches. Our algorithm analyzes compatibility across shared values, lifestyle, goals, and preferences.",
          "Your information is private and secure. You control what you share. Conversations only happen when there's mutual interest.",
          "Ready to start? This is more than filling out a form - it's a conversation. Feel free to ask me questions anytime!",
          "Let's begin with the basics. What's your name?"
        ],
        fr: [
          "Bonjour ! Je suis Diana, votre assistante personnelle de matchmaking 💝",
          "Bienvenue dans une nouvelle façon de trouver des connexions significatives. Laissez-moi vous expliquer.",
          "Je vais avoir une conversation naturelle avec vous pour construire votre profil. Je poserai des questions sur votre vie - parcours, valeurs, style de vie, carrière, loisirs, voyages, objectifs familiaux et ce que vous recherchez.",
          "Les questions sont organisées en catégories comme les bases, la localisation, la famille, la carrière, les croyances, les loisirs et les voyages. Vous pouvez suivre votre progression.",
          "Important - bien que certaines questions de base soient requises (nom, âge et sexe), la PLUPART des questions sont complètement optionnelles. Vous pouvez passer n'importe quelle question en disant 'passer'.",
          "Cependant, voici la clé : Plus vous répondez, meilleurs seront vos matchs ! Chaque réponse aide notre algorithme à mieux vous comprendre.",
          "Une fois que votre profil est complété à 50%, vous débloquerez la section Découverte avec les matchs potentiels. Notre algorithme analyse la compatibilité sur les valeurs, le style de vie, les objectifs et les préférences.",
          "Vos informations sont privées et sécurisées. Vous contrôlez ce que vous partagez. Les conversations ne se produisent que s'il y a un intérêt mutuel.",
          "Prêt à commencer ? C'est plus qu'un formulaire - c'est une conversation. N'hésitez pas à poser des questions !",
          "Commençons par les bases. Quel est votre nom ?"
        ],
        ar: [
          "مرحباً! أنا ديانا، مساعدتك الشخصية في إيجاد شريك الحياة 💝",
          "مرحباً بك في طريقة جديدة للعثور على علاقات ذات معنى. دعني أشرح لك.",
          "سأجري معك محادثة طبيعية لبناء ملفك الشخصي. سأطرح أسئلة عن حياتك - خلفيتك، قيمك، أسلوب حياتك، مهنتك، هواياتك، السفر، أهدافك العائلية وما تبحث عنه.",
          "الأسئلة منظمة في فئات مثل الأساسيات، الموقع، العائلة، المهنة، المعتقدات، الهوايات والسفر. يمكنك متابعة تقدمك.",
          "مهم - بينما بعض الأسئلة الأساسية مطلوبة (الاسم والعمر والجنس)، معظم الأسئلة اختيارية تماماً. يمكنك تخطي أي سؤال بقول 'تخطي'.",
          "ومع ذلك، النقطة الأساسية: كلما أجبت أكثر، كانت مطابقاتك أفضل! كل إجابة تساعد خوارزميتنا على فهمك بشكل أفضل.",
          "بمجرد أن يصل ملفك إلى 50%، ستفتح قسم الاكتشاف مع المطابقات المحتملة. تحلل خوارزميتنا التوافق في القيم وأسلوب الحياة والأهداف والتفضيلات.",
          "معلوماتك خاصة وآمنة. أنت تتحكم فيما تشاركه. المحادثات تحدث فقط عند وجود اهتمام متبادل.",
          "جاهز للبدء؟ هذا أكثر من ملء نموذج - إنها محادثة. لا تتردد في طرح الأسئلة!",
          "لنبدأ بالأساسيات. ما اسمك؟"
        ],
        tn: [
          "مرحبا! أنا ديانا، مساعدتك الشخصية باش تلقى شريك حياتك 💝",
          "مرحبا بيك في طريقة جديدة باش تلقى علاقات معناها. خليني نشرحلك.",
          "باش نعمل معاك حديث طبيعي باش نبنيو البروفايل متاعك. باش نسألك على حياتك - الخلفية، القيم، ستايل الحياة، الخدمة، الهوايات، السفر، الأهداف العائلية، وشنوا تحب تلقى.",
          "الأسئلة منظمين في كاتيغوريات كيما الأساسيات، الموقع، العائلة، الخدمة، المعتقدات، الهوايات والسفر. تنجم تتبع التقدم متاعك.",
          "مهم - رغم إلي بعض الأسئلة الأساسية مطلوبة (اسمك وعمرك وجنسك)، معظم الأسئلة اختيارية. تنجم تعدي أي سؤال كان تقول 'تعدّى'.",
          "أما هوني المفتاح: كل ما تجاوب أكثر، كل ما الماتشات يكونو أحسن! كل جواب يساعد الخوارزمية باش تفهمك أحسن.",
          "كي البروفايل يوصل 50%، باش تفتحلك سيكسيون الديسكوفر مع الماتشات المحتملة. الخوارزمية تحلل التوافق في القيم، ستايل الحياة، الأهداف والتفضيلات.",
          "المعلومات متاعك خاصة وآمنة. إنت لي تتحكم في شنوا تشارك. المحادثات يصيرو برك كان فما اهتمام مشترك.",
          "واجد باش نبداو؟ هذا أكثر من تعبية فورميلار - هي محادثة. لا تتردد تسألني أسئلة!",
          "خلينا نبداو بالأساسيات. شنوّا اسمك؟"
        ],
      };

      const categoryStatus = getCategoryProgress(profile);
      const messages = greetingMessages[lang] || greetingMessages.en;

      return new Response(
        JSON.stringify({
          messages: messages,
          profileCompletion: calculateProfileCompletion(profile),
          currentCategory: determineCurrentCategory(profile).current,
          completedCategories: determineCurrentCategory(profile).completed,
          categoryProgress: categoryStatus,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const lang = profile?.language || "en";

    const askedQuestions = profile?.asked_questions || [];
    
    // Build system prompt
    const systemPrompt = `You are Diana, a warm and engaging matchmaking assistant who has genuine conversations.

⚠️ CRITICAL - DO NOT ASK THESE QUESTIONS AGAIN ⚠️
Already asked questions: ${askedQuestions.join(", ")}

PROFILE STATUS:
${JSON.stringify(profile, null, 2)}

Completion: ${calculateProfileCompletion(profile)}%

YOUR PERSONALITY:
- Warm, friendly, and genuinely curious about the user
- React naturally to what they say (show excitement, empathy, interest)
- Make comments and observations about their answers
- Build on previous topics they mentioned
- Use natural conversation flow, not interrogation mode

CONVERSATION STYLE:
1. ALWAYS react to what the user just said before moving on
   - "That's interesting!" "I love that!" "Tell me more about that!"
   - Share brief relatable comments or light observations
   - Show you're listening and care about their answers
   
2. Let conversations flow naturally
   - If they mention something interesting, comment on it or ask a follow-up
   - Don't rush to the next scripted question
   - Build rapport through genuine dialogue
   
3. When they ask questions, answer enthusiastically
   - If they ask "why so many questions", explain warmly that you want to really know them to find great matches
   - Be transparent and encouraging about the process
   
4. Mix profile building with conversation
   - After a good exchange, naturally transition: "By the way..." or "Oh, I'm curious..."
   - Make questions feel like natural conversation, not an interview

MANDATORY QUESTIONS (CANNOT BE SKIPPED):
- name, age, gender, health, age_range_preference are MANDATORY
- If user tries to skip a mandatory question, politely explain: "I understand this might feel personal, but this information is essential for finding you the right match. Could you please share it?"
- Stay warm and encouraging, but be clear these questions are required
- Don't move to the next question until they answer a mandatory one

OPTIONAL QUESTIONS (CAN BE SKIPPED):
- All other questions can be skipped by saying "skip", "pass", "next", "prefer not to say", or similar
- When they skip, ALWAYS gently remind them: "I understand, but just so you know, answering this helps us find you the most compatible match possible" or "That's okay! Though the more I know, the better I can match you with someone perfect"
- Keep the reminder brief, warm, and non-judgmental
- NEVER pressure them after the reminder - immediately move to the next question
- Remember they skipped it - don't ask that question again
- Some topics are sensitive - respect their boundaries completely while still mentioning the value

DATA EXTRACTION:
- Always use the tool to extract profile information
- Accept typos and variations (e.g., "diabities" -> "diabetes")
- When user says "no", "none", "I don't have any" to a question, that IS a valid answer - extract it (e.g., disabilities_and_special_need="no")
- When user says no job/unemployed/student: set employment_status="unemployed", work_life_balance="not_applicable"
- **ABSOLUTELY NEVER** repeat questions already in the "Already asked questions" list - this is NON-NEGOTIABLE
- Check the "Already asked questions" list BEFORE asking any question
- If a question or "skipped:question" appears in "Already asked questions", DO NOT ask it again under ANY circumstances
- When user skips optional questions, DO NOT extract data for that field
- For MANDATORY questions (name, age, gender, health, age_range_preference), keep asking until you get a valid answer
- The user can answer a question before it's asked - extract the answer to the right field and don't ask about it later

RESPONSE STYLE:
- Keep under 100 words but be conversational
- ONE question at a time maximum
- Show personality and warmth
- Don't ask for confirmation on clear answers do it only if the answer is perturbing 

Language: ${lang === "en" ? "English" : lang === "fr" ? "French" : lang === "ar" ? "Arabic" : "Tunisian Arabic"}.`;

    // Generate cache key based on normalized message, current context, and language
    const currentIndex = profile?.current_question_index || 0;
    const currentField = QUESTION_LIST[currentIndex]?.field || "general";
    const normalizedMessage = message.toLowerCase().trim();
    const cacheKey = `${currentField}:${normalizedMessage}:${lang}`;
    const questionHash = await generateHash(cacheKey);

    // Try to get cached response first
    const cachedResponse = await getCachedResponse(supabase, questionHash);

    let aiMessage;
    if (cachedResponse) {
      // Use cached response
      aiMessage = { content: cachedResponse };
    } else {
      // Call AI
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
            ...(conversationHistory || []).slice(-10),
            { role: "user", content: message },
          ],
          tool_choice: "auto",
          tools: [
            {
              type: "function",
              function: {
                name: "extract_profile_data",
                description: "Extract profile information",
                parameters: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    age: { type: "number" },
                    gender: { type: "string", enum: ["male", "female", "other"] },
                    where_was_born: { type: "string" },
                    where_he_live: { type: "string" },
                    where_want_to_live: { type: "string" },
                    marital_status: { type: "string", enum: ["single", "divorced", "widowed"] },
                    have_children: { type: "string", enum: ["yes", "no", "prefer_not_to_say"] },
                    want_children: { type: "string", enum: ["yes", "no", "prefer_not_to_say"] },
                    education_lvl: {
                      type: "string",
                      enum: ["high_school", "bachelor", "master", "phd", "vocational", "other"],
                    },
                    employment_status: {
                      type: "string",
                      enum: ["employed", "self_employed", "student", "unemployed", "retired"],
                    },
                    job: { type: "string" },
                    height: { type: "number" },
                    height_preference: { type: "string" },
                    religion: {
                      type: "string",
                      enum: ["muslim", "christian", "jewish", "buddhist", "hindu", "other", "none"],
                    },
                    practice_lvl: {
                      type: "string",
                      enum: ["very_religious", "religious", "moderate", "not_religious"],
                    },
                    smoking: { type: "string", enum: ["yes", "no", "prefer_not_to_say"] },
                    drinking: { type: "string", enum: ["yes", "no", "prefer_not_to_say"] },
                    health: { type: "string" },
                    disabilities_and_special_need: { type: "string", enum: ["yes", "no", "prefer_not_to_say"] },
                    disabilities_and_special_need_type: { type: "string" },
                    have_pet: { type: "string", enum: ["yes", "no", "prefer_not_to_say"] },
                    pet: {
                      type: "string",
                      description: 'Type and details of pet(s), e.g., "2 dogs", "cat", "3 puppies"',
                    },
                    dietary_habits: { type: "string" },
                    sleep_habits: { type: "string" },
                    work_life_balance: { type: "string" },
                    volunteer_community_work: { type: "string", enum: ["yes", "no", "prefer_not_to_say"] },
                    life_goal: { type: "string" },
                    physical_activities: { type: "array", items: { type: "string" } },
                    cultural_activities: { type: "array", items: { type: "string" } },
                    creative_hobbies: { type: "array", items: { type: "string" } },
                    gaming_hobbies: { type: "array", items: { type: "string" } },
                    travel_frequency: { type: "string", enum: ["never", "rarely", "sometimes", "often", "very_often"] },
                    type_of_trips: { type: "string" },
                    travel_style: { type: "string" },
                    travel_planning: { type: "string" },
                    relocation_same_country: { type: "string", enum: ["yes", "no", "prefer_not_to_say"] },
                    relocation_across_countries: { type: "string", enum: ["yes", "no", "prefer_not_to_say"] },
                    role_in_relationship: { type: "string" },
                    age_range_preference: { type: "string" },
                    health_disability_preference: { type: "string" },
                    red_flags: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          ],
        }),
      });

      if (!aiResponse.ok) {
        throw new Error("AI API failed");
      }

      const aiData = await aiResponse.json();
      aiMessage = aiData.choices?.[0]?.message;

      // Cache the response if it's a simple conversational response (not using tools)
      if (aiMessage?.content && !aiMessage?.tool_calls?.length) {
        await cacheResponse(supabase, cacheKey, questionHash, aiMessage.content);
      }
    }

    // Extract and update profile
    let extractedData: any = null;
    if (aiMessage?.tool_calls?.length > 0) {
      for (const toolCall of aiMessage.tool_calls) {
        if (toolCall.function?.name === "extract_profile_data") {
          try {
            extractedData = JSON.parse(toolCall.function.arguments);
            console.log("📝 Extracted:", extractedData);
          } catch (e) {
            console.error("Parse error:", e);
          }
        }
      }
    }

    // Normalize extracted data for typos and synonyms
    // Track the current question being asked to prevent repetition
    // (currentIndex already declared earlier for caching)
    const currentQuestionField = QUESTION_LIST[currentIndex]?.field;
    extractedData = normalizeExtractedData(extractedData, message, currentQuestionField);
    const profileAskedQuestions = profile?.asked_questions || [];

    // Check if user wants to skip the current question
    const lowerMessage = message.toLowerCase().trim();
    const skipKeywords = [
      "skip",
      "pass",
      "next",
      "skip this",
      "skip it",
      "move on",
      "prefer not to say",
      "don't want to answer",
      "rather not say",
    ];
    const isSkipping =
      skipKeywords.some((keyword) => lowerMessage.includes(keyword)) && lowerMessage.length < 100 && !extractedData;

    // Update with progress tracking
    if (extractedData && Object.keys(extractedData).length > 0) {
      const answeredFields = Object.keys(extractedData);
      const updatedAsked = [...new Set([...profileAskedQuestions, ...answeredFields])];
      
      console.log(`📌 Marking questions as answered: ${answeredFields.join(", ")}`);
      console.log(`📋 Updated asked_questions list: ${updatedAsked.join(", ")}`);

      const nextIdx = QUESTION_LIST.findIndex(
        (q, idx) =>
          idx > currentIndex &&
          !profile?.[q.field] &&
          !updatedAsked.includes(q.field) &&
          !updatedAsked.includes(`skipped:${q.field}`),
      );

      // Calculate profile completion before updating
      const tempProfile = { ...profile, ...extractedData };
      const completion = calculateProfileCompletion(tempProfile);

      // Store actual user response for each extracted field
      const currentResponses = profile?.question_responses || {};
      const newResponses = { ...currentResponses };
      answeredFields.forEach(field => {
        newResponses[field] = message; // Save the user's actual message
      });

      await supabase
        .from("profiles")
        .update({
          ...extractedData,
          asked_questions: updatedAsked,
          current_question_index: nextIdx >= 0 ? nextIdx : QUESTION_LIST.length,
          is_profile_complete: completion,
          question_responses: newResponses,
        })
        .eq("id", userId);

      console.log("✅ Profile updated with progress");
    } else if (
      isSkipping &&
      currentQuestionField &&
      !profileAskedQuestions.includes(currentQuestionField) &&
      !profileAskedQuestions.includes(`skipped:${currentQuestionField}`)
    ) {
      // Check if this is a mandatory question
      if (MANDATORY_QUESTIONS.includes(currentQuestionField)) {
        // Cannot skip mandatory questions - AI should handle this in the response
        console.log(`⚠️ User tried to skip mandatory question: ${currentQuestionField}`);
        // Don't mark as skipped, don't move to next question
        // The AI's response will explain why this question is mandatory
      } else {
        // User wants to skip this optional question
        const updatedAsked = [...new Set([...profileAskedQuestions, `skipped:${currentQuestionField}`])];

        const nextIdx = QUESTION_LIST.findIndex(
          (q, idx) =>
            idx > currentIndex &&
            !profile?.[q.field] &&
            !updatedAsked.includes(q.field) &&
            !updatedAsked.includes(`skipped:${q.field}`),
        );

        await supabase
          .from("profiles")
          .update({
            asked_questions: updatedAsked,
            current_question_index: nextIdx >= 0 ? nextIdx : currentIndex + 1,
          })
          .eq("id", userId);

        console.log("⏭️ Question skipped by user, moving to next");
      }
    }
    // If no data was extracted and user didn't skip, don't mark question as asked
    // This allows Diana to re-ask or clarify the current question

    // Get updated profile for next question
    const { data: updatedProfile } = await supabase.from("profiles").select("*").eq("id", userId).single();

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
          tn: "برشا مليح! ما تترددش تقولي أكثر على شنوا يهمك، ولا اسألني على أي حاجة على لقاء الماتش متاعك.",
        };
        responseText = completionMessages[lang] || completionMessages.en;
      }
    }

    // Final fallback
    if (!responseText) {
      responseText = "Could you rephrase that?";
    }

    // Store messages
    await supabase.from("messages").insert([
      { sender_id: userId, content: message, is_from_diana: false },
      { receiver_id: userId, content: responseText, is_from_diana: true },
    ]);

    const categoryStatus = getCategoryProgress(updatedProfile);
    const profileCompletion = calculateProfileCompletion(updatedProfile);

    // Generate bio if profile is complete and bio doesn't exist
    if (profileCompletion === 100 && !updatedProfile.bio) {
      console.log("📝 Generating bio for completed profile");
      const bioPrompt = generateBioPrompt(updatedProfile, lang);

      const bioResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "You are a professional bio writer for a dating platform. Create an engaging, authentic, and comprehensive bio that includes EVERY piece of information provided. YOU MUST include: their exact age, exact height in cm, location, occupation, all hobbies, lifestyle habits, values, goals, and personality traits. Use ALL the data - do not skip or summarize any details. Make it warm and conversational while being thorough and complete.",
            },
            { role: "user", content: bioPrompt },
          ],
        }),
      });

      if (bioResponse.ok) {
        const bioData = await bioResponse.json();
        const generatedBio = bioData.choices?.[0]?.message?.content;

        if (generatedBio) {
          await supabase.from("profiles").update({ bio: generatedBio }).eq("id", userId);

          console.log("✅ Bio generated and saved");
        }
      }
    }

    return new Response(
      JSON.stringify({
        response: responseText,
        profileCompletion,
        currentCategory: determineCurrentCategory(updatedProfile).current,
        completedCategories: determineCurrentCategory(updatedProfile).completed,
        categoryProgress: categoryStatus,
        bio: updatedProfile.bio,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        response: "Sorry, something went wrong. Please try again.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
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
      fallback: "Anything else to share?",
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
      fallback: "Autre chose à partager ?",
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
      fallback: "شيء آخر؟",
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
      fallback: "حاجة أخرى؟",
    },
  };

  const t = (key: string) => questions[lang]?.[key] || questions.en[key] || questions.en.fallback;

  const currentIndex = p?.current_question_index || 0;
  const askedQuestions = p?.asked_questions || [];

  // Find next unanswered from predefined list
  const shouldAsk = (field: string) => {
    if (field === "work_life_balance") {
      const status = p?.employment_status as string | undefined;
      // Skip if not working
      if (!status || ["unemployed", "student", "retired"].includes(status)) return false;
    }
    return true;
  };

  for (let i = currentIndex; i < QUESTION_LIST.length; i++) {
    const { field } = QUESTION_LIST[i];
    if (
      !p?.[field] &&
      !askedQuestions.includes(field) &&
      !askedQuestions.includes(`skipped:${field}`) &&
      shouldAsk(field)
    ) {
      return t(field);
    }
  }

  // Check for any missed
  for (const { field } of QUESTION_LIST) {
    if (
      !p?.[field] &&
      !askedQuestions.includes(field) &&
      !askedQuestions.includes(`skipped:${field}`) &&
      shouldAsk(field)
    ) {
      return t(field);
    }
  }

  return t("fallback");
}

function normalizeExtractedData(data: any, message: string, currentField: string): any {
  if (!data) return data;
  const norm: any = { ...data };
  const msg = (message || "").toLowerCase();

  const normalizeHealth = (val?: string) => {
    const v = (val || "").toLowerCase().trim();
    if (v.includes("diab")) return "diabetes";
    if (v.includes("asthm")) return "asthma";
    if (v.includes("hypert") || v.includes("high blood pressure") || v.includes("blood pressure") || v === "bp")
      return "hypertension";
    if (v.includes("cancer")) return "cancer";
    return val;
  };

  if (norm.health) norm.health = normalizeHealth(norm.health);
  else if (msg.includes("diab")) norm.health = "diabetes";
  else if (msg.includes("cancer")) norm.health = "cancer";

  // Handle "no" responses for yes_no_type fields
  const noPatterns = ["no", "noo", "nope", "never", "not at all", "don't have", "dont have", "i do not", "i don't"];
  const isNoResponse = noPatterns.some((p) => msg === p || msg.startsWith(p + " ") || msg.endsWith(" " + p));

  if (isNoResponse) {
    // Check which question is being answered based on current field context
    if (!norm.disabilities_and_special_need && currentField === "disabilities_and_special_need") {
      norm.disabilities_and_special_need = "no";
    }
    if (!norm.smoking && currentField === "smoking") {
      norm.smoking = "no";
    }
    if (!norm.drinking && currentField === "drinking") {
      norm.drinking = "no";
    }
    if (!norm.have_children && currentField === "have_children") {
      norm.have_children = "no";
    }
    if (!norm.want_children && currentField === "want_children") {
      norm.want_children = "no";
    }
    if (!norm.have_pet && currentField === "have_pet") {
      norm.have_pet = "no";
    }
    if (!norm.volunteer_community_work && currentField === "volunteer_community_work") {
      norm.volunteer_community_work = "no";
    }
  }

  // Detect pet types and set both have_pet and pet
  const petPatterns = [
    { match: ["dog", "puppy", "puppies", "pup", "canine"], value: "dog" },
    { match: ["cat", "kitten", "kitty", "feline"], value: "cat" },
    { match: ["bird", "parrot", "budgie"], value: "bird" },
    { match: ["fish", "goldfish", "aquarium"], value: "fish" },
    { match: ["rabbit", "bunny"], value: "rabbit" },
    { match: ["hamster", "guinea pig"], value: "hamster" },
  ];

  for (const pattern of petPatterns) {
    if (pattern.match.some((m) => msg.includes(m))) {
      norm.have_pet = "yes";

      // Extract count if mentioned
      const countMatch = msg.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten)/i);
      let count = "";
      if (countMatch) {
        const numMap: Record<string, string> = {
          one: "1",
          two: "2",
          three: "3",
          four: "4",
          five: "5",
          six: "6",
          seven: "7",
          eight: "8",
          nine: "9",
          ten: "10",
        };
        count = numMap[countMatch[1].toLowerCase()] || countMatch[1];
      }

      // Build pet description
      if (count && parseInt(count) > 1) {
        norm.pet = `${count} ${pattern.value}s`;
      } else if (count === "1") {
        norm.pet = `1 ${pattern.value}`;
      } else {
        norm.pet = pattern.value;
      }
      break;
    }
  }

  // If user clearly states not working, normalize employment and mark work/life balance
  if (!norm.employment_status) {
    const notWorkingPhrases = [
      "no job",
      "don't have a job",
      "dont have a job",
      "unemployed",
      "jobless",
      "not working",
      "i don't work",
      "i do not work",
      "without job",
    ];
    if (notWorkingPhrases.some((p) => msg.includes(p))) {
      norm.employment_status = "unemployed";
      norm.work_life_balance = norm.work_life_balance || "not_applicable";
    }
  }

  return norm;
}

function calculateProfileCompletion(profile: any): number {
  if (!profile) return 0;
  const fields = QUESTION_LIST.map((q) => q.field);
  const filled = fields.filter((f) => profile?.[f] != null && profile?.[f] !== "").length;
  return Math.round((filled / fields.length) * 100);
}

function generateBioPrompt(profile: any, lang: string): string {
  const bioIntros: Record<string, string> = {
    en: `Create a compelling 3-4 sentence bio for this person based on their complete profile:\n\n`,
    fr: `Créez une bio convaincante de 3-4 phrases pour cette personne basée sur son profil complet:\n\n`,
    ar: `أنشئ سيرة ذاتية مقنعة من 3-4 جمل لهذا الشخص بناءً على ملفه الشخصي الكامل:\n\n`,
    tn: `اعمل بيو مقنع من 3-4 جمل لهذا الشخص بناء على بروفايلو الكامل:\n\n`,
  };

  let prompt = bioIntros[lang] || bioIntros.en;

  // BASIC INFORMATION
  if (profile.name) prompt += `Name: ${profile.name}\n`;
  if (profile.age) prompt += `Age: ${profile.age}\n`;
  if (profile.gender) prompt += `Gender: ${profile.gender}\n`;
  if (profile.height) prompt += `Height: ${profile.height} cm\n`;

  // LOCATION
  if (profile.where_was_born) prompt += `Born in: ${profile.where_was_born}\n`;
  if (profile.where_he_live) prompt += `Lives in: ${profile.where_he_live}\n`;
  if (profile.where_want_to_live) prompt += `Wants to live in: ${profile.where_want_to_live}\n`;

  // FAMILY & CHILDREN
  if (profile.marital_status) prompt += `Marital Status: ${profile.marital_status}\n`;
  if (profile.have_children) prompt += `Has Children: ${profile.have_children}\n`;
  if (profile.want_children) prompt += `Wants Children: ${profile.want_children}\n`;

  // CAREER & EDUCATION
  if (profile.job) prompt += `Occupation: ${profile.job}\n`;
  if (profile.education_lvl) prompt += `Education: ${profile.education_lvl}\n`;
  if (profile.employment_status) prompt += `Employment Status: ${profile.employment_status}\n`;
  if (profile.work_life_balance) prompt += `Work-Life Balance: ${profile.work_life_balance}\n`;

  // VALUES & BELIEFS
  if (profile.religion) prompt += `Religion: ${profile.religion}\n`;
  if (profile.practice_lvl) prompt += `Practice Level: ${profile.practice_lvl}\n`;
  if (profile.life_goal) prompt += `Life Goal: ${profile.life_goal}\n`;
  if (profile.role_in_relationship) prompt += `Role in Relationship: ${profile.role_in_relationship}\n`;

  // HEALTH & WELLNESS
  if (profile.health) prompt += `Health: ${profile.health}\n`;
  if (profile.disabilities_and_special_need === "yes" && profile.disabilities_and_special_need_type) {
    prompt += `Disabilities/Special Needs: ${profile.disabilities_and_special_need_type}\n`;
  }

  // LIFESTYLE HABITS
  if (profile.smoking) prompt += `Smoking: ${profile.smoking}\n`;
  if (profile.drinking) prompt += `Drinking: ${profile.drinking}\n`;
  if (profile.sleep_habits) prompt += `Sleep Habits: ${profile.sleep_habits}\n`;
  if (profile.dietary_habits) prompt += `Dietary Habits: ${profile.dietary_habits}\n`;
  if (profile.volunteer_community_work) prompt += `Volunteer/Community Work: ${profile.volunteer_community_work}\n`;

  // PETS
  if (profile.have_pet) prompt += `Has Pet: ${profile.have_pet}\n`;
  if (profile.have_pet === "yes" && profile.pet) prompt += `Pet Type: ${profile.pet}\n`;

  // HOBBIES & INTERESTS
  const allHobbies = [];
  if (profile.physical_activities?.length) allHobbies.push(`Physical: ${profile.physical_activities.join(", ")}`);
  if (profile.cultural_activities?.length) allHobbies.push(`Cultural: ${profile.cultural_activities.join(", ")}`);
  if (profile.creative_hobbies?.length) allHobbies.push(`Creative: ${profile.creative_hobbies.join(", ")}`);
  if (profile.gaming_hobbies?.length) allHobbies.push(`Gaming: ${profile.gaming_hobbies.join(", ")}`);
  if (allHobbies.length) prompt += `Hobbies & Interests:\n${allHobbies.join("\n")}\n`;

  // TRAVEL
  if (profile.travel_frequency) prompt += `Travel Frequency: ${profile.travel_frequency}\n`;
  if (profile.travel_style) prompt += `Travel Style: ${profile.travel_style}\n`;
  if (profile.travel_planning) prompt += `Travel Planning: ${profile.travel_planning}\n`;
  if (profile.type_of_trips) prompt += `Type of Trips: ${profile.type_of_trips}\n`;

  // RELOCATION
  if (profile.relocation_same_country) prompt += `Willing to Relocate (Same Country): ${profile.relocation_same_country}\n`;
  if (profile.relocation_across_countries) prompt += `Willing to Relocate (Across Countries): ${profile.relocation_across_countries}\n`;

  // PREFERENCES
  if (profile.age_range_preference) prompt += `Age Range Preference: ${profile.age_range_preference}\n`;
  if (profile.height_preference) prompt += `Height Preference: ${profile.height_preference}\n`;
  if (profile.health_disability_preference) prompt += `Health/Disability Preference: ${profile.health_disability_preference}\n`;

  // RED FLAGS
  if (profile.red_flags?.length) prompt += `Red Flags: ${profile.red_flags.join(", ")}\n`;

  const guidelines: Record<string, string> = {
    en: "\n\nYOU MUST USE ALL THE INFORMATION ABOVE - especially their age, height, and every detail they shared. Create a warm, authentic, and comprehensive 3-4 sentence bio that captures who this person truly is. Include specific numbers (age, height), concrete details about their lifestyle, values, goals, hobbies, and what makes them unique. Make it conversational and engaging while painting a complete picture of their life and character. DO NOT generalize or skip any information provided above.",
    fr: "\n\nVOUS DEVEZ UTILISER TOUTES LES INFORMATIONS CI-DESSUS - en particulier leur âge, taille et chaque détail partagé. Créez une bio chaleureuse, authentique et complète de 3-4 phrases qui capture qui est vraiment cette personne. Incluez des chiffres spécifiques (âge, taille), des détails concrets sur leur style de vie, valeurs, objectifs, loisirs et ce qui les rend uniques. Rendez-la conversationnelle et engageante tout en dressant un tableau complet de leur vie et caractère. NE généralisez PAS et ne sautez aucune information fournie ci-dessus.",
    ar: "\n\nيجب عليك استخدام كل المعلومات أعلاه - خاصة العمر والطول وكل التفاصيل التي شاركوها. أنشئ سيرة ذاتية دافئة وأصلية وشاملة من 3-4 جمل تلتقط من هو هذا الشخص حقًا. قم بتضمين أرقام محددة (العمر، الطول)، تفاصيل ملموسة حول أسلوب حياتهم وقيمهم وأهدافهم وهواياتهم وما يجعلهم فريدين. اجعلها محادثة وجذابة بينما ترسم صورة كاملة لحياتهم وشخصيتهم. لا تعمم أو تتخطى أي معلومات مقدمة أعلاه.",
    tn: "\n\nلازم تستعمل كل المعلومات لفوق - خاصة العمر والطول وكل التفاصيل اللي شاركوهم. اعمل بيو دافي وأصلي وكامل من 3-4 جمل يوصف هذا الشخص كيما هو بالحق. حط أرقام محددة (العمر، الطول)، تفاصيل ملموسة على الستايل متاعهم والقيم والأهداف والهوايات وشنوا يخليهم مميزين. اعملها محادثة وجذابة وورّي صورة كاملة على حياتهم وشخصيتهم. ما تعممش وما تنساش حتى معلومة من اللي لفوق.",
  };

  prompt += guidelines[lang] || guidelines.en;

  return prompt;
}

function determineCurrentCategory(profile: any): { current: string; completed: string[] } {
  const categories = [
    "basic",
    "location",
    "physical",
    "family",
    "career",
    "values",
    "health",
    "lifestyle",
    "pets",
    "hobbies",
    "travel",
    "relocation",
    "relationship",
  ];
  const completed: string[] = [];
  let current = "basic";

  for (const cat of categories) {
    const catFields = QUESTION_LIST.filter((q) => q.category === cat);
    const allFilled = catFields.every((q) => profile?.[q.field] != null);

    if (allFilled) {
      completed.push(cat);
    } else if (completed.length > 0 && current === "basic") {
      current = cat;
    }
  }

  if (completed.length === categories.length) {
    current = "complete";
  }

  return { current, completed };
}

function getCategoryProgress(profile: any): Record<string, { completed: number; total: number; percentage: number }> {
  const categories = [
    "basic",
    "location",
    "physical",
    "family",
    "career",
    "values",
    "health",
    "lifestyle",
    "pets",
    "hobbies",
    "travel",
    "relocation",
    "relationship",
  ];
  const progress: Record<string, { completed: number; total: number; percentage: number }> = {};

  for (const cat of categories) {
    const catFields = QUESTION_LIST.filter((q) => q.category === cat);
    const total = catFields.length;
    const completed = catFields.filter((q) => profile?.[q.field] != null && profile?.[q.field] !== "").length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    progress[cat] = { completed, total, percentage };
  }

  return progress;
}
