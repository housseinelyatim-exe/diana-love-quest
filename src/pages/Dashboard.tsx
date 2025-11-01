import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Heart, MessageCircle, Sparkles, LogOut, User } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [profileCompletion] = useState(65);
  const [dailyQuote] = useState("Love is not about finding the perfect person, but learning to see an imperfect person perfectly.");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  // Mock matches data
  const matches = [
    { id: 1, name: "Sarah M.", age: 28, compatibility: 92, location: "Tunis" },
    { id: 2, name: "Amira K.", age: 26, compatibility: 88, location: "Sfax" },
    { id: 3, name: "Leila B.", age: 30, compatibility: 85, location: "Sousse" },
  ];

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
                  <CardTitle className="text-2xl">{t.dashboard.title}</CardTitle>
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
        <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Sparkles className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Daily Inspiration</p>
                <p className="italic text-foreground">{dailyQuote}</p>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
