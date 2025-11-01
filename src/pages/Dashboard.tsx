import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Heart, MessageCircle, Sparkles, LogOut, User, RefreshCw, X, Newspaper } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface Match {
  id: string;
  name: string;
  age: number;
  compatibility: number;
  location: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [userName, setUserName] = useState("");
  const [dailyQuote, setDailyQuote] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuote, setShowQuote] = useState(true);

  useEffect(() => {
    checkAuth();
    loadDashboardData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const calculateProfileCompletion = (profile: any) => {
    const fields = [
      'name', 'age', 'gender', 'where_he_live', 'where_was_born',
      'religion', 'practice_lvl', 'education_lvl', 'employment_status',
      'marital_status', 'have_children', 'want_children', 'height',
      'smoking', 'drinking', 'health', 'life_goal', 'job'
    ];
    
    const filledFields = fields.filter(field => profile[field] !== null && profile[field] !== '');
    return Math.round((filledFields.length / fields.length) * 100);
  };

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserName(profile.name || 'User');
        setProfileCompletion(calculateProfileCompletion(profile));
      }

      // Fetch real matches
      const { data: matchesData } = await supabase
        .from('matches')
        .select('*')
        .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`)
        .order('compatibility_score', { ascending: false });

      if (matchesData && matchesData.length > 0) {
        // Fetch profiles for matched users
        const matchedUserIds = matchesData.map(match => 
          match.user_id_1 === user.id ? match.user_id_2 : match.user_id_1
        );

        const { data: matchedProfiles } = await supabase
          .from('profiles')
          .select('id, name, age, where_he_live')
          .in('id', matchedUserIds);

        if (matchedProfiles) {
          const formattedMatches: Match[] = matchesData.map(match => {
            const otherUserId = match.user_id_1 === user.id ? match.user_id_2 : match.user_id_1;
            const profile = matchedProfiles.find(p => p.id === otherUserId);
            
            return {
              id: match.id,
              name: profile?.name || 'Anonymous',
              age: profile?.age || 0,
              compatibility: match.compatibility_score || 0,
              location: profile?.where_he_live || 'Unknown'
            };
          });
          setMatches(formattedMatches);
        }
      }

      // Fetch random quote
      await loadRandomQuote();
      
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRandomQuote = async () => {
    try {
      const { data: quotes } = await supabase
        .from('quotes')
        .select('content');
      
      if (quotes && quotes.length > 0) {
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        setDailyQuote(randomQuote.content);
      }
    } catch (error) {
      console.error('Error loading quote:', error);
    }
  };

  const handleRefreshQuote = async () => {
    await loadRandomQuote();
    toast.success('Quote refreshed');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleDismissQuote = () => {
    setShowQuote(false);
    toast.info('Quote hidden');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Heart className="h-6 w-6 text-white" fill="currentColor" />
                </div>
                <div>
                  <CardTitle className="text-2xl">
                    {t.dashboard.title}, {userName}!
                  </CardTitle>
                  <CardDescription>Find your perfect match</CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate("/chat")}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {t.chat.title}
                </Button>
                <Button variant="outline" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Daily Quote */}
        {showQuote && dailyQuote && (
          <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Sparkles className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-muted-foreground">Daily Inspiration</p>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRefreshQuote}
                        className="h-7 w-7 p-0"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDismissQuote}
                        className="h-7 w-7 p-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="italic text-foreground">{dailyQuote}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* News & Updates Section */}
        <Card className="border-accent/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-accent" />
              News & Updates
            </CardTitle>
            <CardDescription>Stay informed about the latest</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start justify-between p-3 rounded-lg bg-accent/5">
                <div className="flex-1">
                  <p className="font-medium text-sm mb-1">Enhanced Matching Algorithm</p>
                  <p className="text-xs text-muted-foreground">
                    We've improved our compatibility scoring to better match your preferences
                  </p>
                </div>
              </div>
              <div className="flex items-start justify-between p-3 rounded-lg bg-accent/5">
                <div className="flex-1">
                  <p className="font-medium text-sm mb-1">Safety Tips for Online Dating</p>
                  <p className="text-xs text-muted-foreground">
                    Learn how to stay safe while meeting new people online
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Profile Completion */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completion</span>
                  <span className="font-semibold">{profileCompletion}%</span>
                </div>
                <Progress value={profileCompletion} className="h-2" />
              </div>
              {profileCompletion < 100 && (
                <div className="rounded-lg bg-muted p-3 space-y-2">
                  <p className="text-sm font-medium">Complete your profile</p>
                  <p className="text-xs text-muted-foreground">
                    A complete profile increases your match opportunities by 3x!
                  </p>
                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-primary to-secondary"
                    onClick={() => navigate("/chat")}
                  >
                    Continue Chat
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Matches */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                {t.dashboard.matches}
              </CardTitle>
              <CardDescription>Based on compatibility score</CardDescription>
            </CardHeader>
            <CardContent>
              {matches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Heart className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No matches yet</p>
                  <p className="text-xs mt-1">Complete your profile to start matching!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {matches.map((match) => (
                    <div
                      key={match.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border-2 border-primary/20">
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20">
                            {match.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{match.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {match.age} years • {match.location}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="secondary"
                          className="bg-gradient-to-r from-primary/20 to-secondary/20"
                        >
                          {match.compatibility}% Match
                        </Badge>
                        <Button size="sm" variant="outline">
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
