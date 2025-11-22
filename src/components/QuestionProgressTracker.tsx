import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, XCircle, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";

interface QuestionItem {
  field: string;
  category: string;
}

const QUESTION_LIST: QuestionItem[] = [
  { field: 'name', category: 'basic' },
  { field: 'age', category: 'basic' },
  { field: 'gender', category: 'basic' },
  { field: 'where_was_born', category: 'location' },
  { field: 'where_he_live', category: 'location' },
  { field: 'where_want_to_live', category: 'location' },
  { field: 'height', category: 'physical' },
  { field: 'height_preference', category: 'physical' },
  { field: 'marital_status', category: 'family' },
  { field: 'have_children', category: 'family' },
  { field: 'want_children', category: 'family' },
  { field: 'education_lvl', category: 'career' },
  { field: 'employment_status', category: 'career' },
  { field: 'job', category: 'career' },
  { field: 'work_life_balance', category: 'career' },
  { field: 'religion', category: 'values' },
  { field: 'practice_lvl', category: 'values' },
  { field: 'life_goal', category: 'values' },
  { field: 'health', category: 'health' },
  { field: 'disabilities_and_special_need', category: 'health' },
  { field: 'disabilities_and_special_need_type', category: 'health' },
  { field: 'health_disability_preference', category: 'health' },
  { field: 'smoking', category: 'lifestyle' },
  { field: 'drinking', category: 'lifestyle' },
  { field: 'dietary_habits', category: 'lifestyle' },
  { field: 'sleep_habits', category: 'lifestyle' },
  { field: 'volunteer_community_work', category: 'lifestyle' },
  { field: 'have_pet', category: 'pets' },
  { field: 'pet', category: 'pets' },
  { field: 'physical_activities', category: 'hobbies' },
  { field: 'cultural_activities', category: 'hobbies' },
  { field: 'creative_hobbies', category: 'hobbies' },
  { field: 'gaming_hobbies', category: 'hobbies' },
  { field: 'travel_frequency', category: 'travel' },
  { field: 'type_of_trips', category: 'travel' },
  { field: 'travel_style', category: 'travel' },
  { field: 'travel_planning', category: 'travel' },
  { field: 'relocation_same_country', category: 'relocation' },
  { field: 'relocation_across_countries', category: 'relocation' },
  { field: 'role_in_relationship', category: 'relationship' },
  { field: 'age_range_preference', category: 'preferences' },
  { field: 'red_flags', category: 'preferences' },
];

const CATEGORY_LABELS: Record<string, string> = {
  basic: 'Basic Info',
  location: 'Location',
  physical: 'Physical',
  family: 'Family',
  career: 'Career',
  values: 'Values & Religion',
  health: 'Health',
  lifestyle: 'Lifestyle',
  pets: 'Pets',
  hobbies: 'Hobbies',
  travel: 'Travel',
  relocation: 'Relocation',
  relationship: 'Relationship',
  preferences: 'Preferences',
};

export const QuestionProgressTracker = () => {
  const { t } = useLanguage();
  const [askedQuestions, setAskedQuestions] = useState<string[]>([]);
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();

    // Set up real-time subscription for profile updates
    const channel = supabase
      .channel('profile-progress-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          if (payload.new.asked_questions) {
            setAskedQuestions(payload.new.asked_questions as string[]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadProgress = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profile?.asked_questions) {
        setAskedQuestions(profile.asked_questions as string[]);
      }
      setProfileData(profile);
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const getFieldValue = (field: string): string => {
    if (!profileData) return '';
    const value = profileData[field];
    return formatValue(value);
  };

  const getQuestionStatus = (field: string): 'answered' | 'skipped' | 'remaining' => {
    if (askedQuestions.includes(field)) return 'answered';
    if (askedQuestions.includes(`skipped:${field}`)) return 'skipped';
    return 'remaining';
  };

  const getCategoryStats = (category: string) => {
    const questions = QUESTION_LIST.filter(q => q.category === category);
    const answered = questions.filter(q => getQuestionStatus(q.field) === 'answered').length;
    const skipped = questions.filter(q => getQuestionStatus(q.field) === 'skipped').length;
    const remaining = questions.filter(q => getQuestionStatus(q.field) === 'remaining').length;
    return { answered, skipped, remaining, total: questions.length };
  };

  const formatFieldName = (field: string): string => {
    return field
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const categories = [...new Set(QUESTION_LIST.map(q => q.category))];

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-secondary rounded w-1/3"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-4 bg-secondary rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const totalAnswered = QUESTION_LIST.filter(q => getQuestionStatus(q.field) === 'answered').length;
  const totalSkipped = QUESTION_LIST.filter(q => getQuestionStatus(q.field) === 'skipped').length;
  const totalRemaining = QUESTION_LIST.filter(q => getQuestionStatus(q.field) === 'remaining').length;

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Question Progress</h2>
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-muted-foreground">Answered: <span className="font-semibold text-foreground">{totalAnswered}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-orange-500" />
              <span className="text-muted-foreground">Skipped: <span className="font-semibold text-foreground">{totalSkipped}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Remaining: <span className="font-semibold text-foreground">{totalRemaining}</span></span>
            </div>
          </div>
        </div>

        <ScrollArea className="h-[500px]">
          <div className="space-y-6 pr-4">
            {categories.map(category => {
              const stats = getCategoryStats(category);
              const questions = QUESTION_LIST.filter(q => q.category === category);

              return (
                <div key={category} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg text-foreground">
                      {CATEGORY_LABELS[category] || category}
                    </h3>
                    <span className="text-sm text-muted-foreground">
                      {stats.answered}/{stats.total}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {questions.map(question => {
                      const status = getQuestionStatus(question.field);
                      return (
                        <div
                          key={question.field}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                        >
                          {status === 'answered' && (
                            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                          )}
                          {status === 'skipped' && (
                            <XCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                          )}
                          {status === 'remaining' && (
                            <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          )}
                          <div className={`flex flex-col gap-0.5 flex-1 min-w-0 ${
                            status === 'skipped' ? 'line-through' : ''
                          }`}>
                            <span className={`text-sm ${
                              status === 'answered' 
                                ? 'text-foreground font-medium' 
                                : status === 'skipped'
                                ? 'text-muted-foreground'
                                : 'text-muted-foreground'
                            }`}>
                              {formatFieldName(question.field)}
                            </span>
                            {(status === 'answered' || status === 'skipped') && (
                              <span className={`text-xs truncate ${
                                status === 'skipped' ? 'text-muted-foreground/70 line-through' : 'text-muted-foreground'
                              }`}>
                                {profileData?.question_responses?.[question.field] || getFieldValue(question.field)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
};
