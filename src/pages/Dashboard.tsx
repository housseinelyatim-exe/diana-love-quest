import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { MessageSquare, Heart, User, Newspaper, LogOut, Camera, RefreshCw, X, Sparkles, Users, UserCircle } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { ImageViewer } from "@/components/ImageViewer";

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
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("chats");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        .maybeSingle();

      if (profile) {
        setUserName(profile.name || 'User');
        const completion = typeof profile.is_profile_complete === 'number'
          ? profile.is_profile_complete
          : calculateProfileCompletion(profile);
        setProfileCompletion(Math.max(0, Math.min(100, completion)));
        setAvatarUrl(profile.avatar_url || '');
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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success('Profile picture updated!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload profile picture');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* WhatsApp-style Header */}
      <div className="bg-primary text-primary-foreground px-4 py-3 shadow-md flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {activeTab === "chats" && "Chats"}
          {activeTab === "matches" && "Matches"}
          {activeTab === "profile" && "Profile"}
          {activeTab === "discover" && "Discover"}
        </h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          className="text-primary-foreground hover:bg-primary-foreground/10"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      {/* Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        {/* Chats Tab */}
        <TabsContent value="chats" className="flex-1 m-0 pb-20">
          <div className="bg-muted/30 px-4 py-3 border-b border-border">
            <div className="bg-card rounded-lg px-4 py-2 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Ask Meta AI or Search"
                className="bg-transparent border-none outline-none flex-1 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div
              onClick={() => navigate("/chat")}
              className="bg-card hover:bg-muted/50 p-4 rounded-lg cursor-pointer transition-colors border border-border"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14 border-2 border-primary">
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                    D
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-card-foreground">Diana (AI Matchmaker)</h3>
                    <span className="text-xs text-muted-foreground">now</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {profileCompletion < 100
                      ? "Let's complete your profile together 💕"
                      : "Ready to find your perfect match! ✨"}
                  </p>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Profile completion</span>
                      <span className="font-semibold text-primary">{profileCompletion}%</span>
                    </div>
                    <Progress value={profileCompletion} className="h-1" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Matches Tab */}
        <TabsContent value="matches" className="flex-1 m-0 pb-20">
          <div className="p-4 space-y-3">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  Your Matches
                </CardTitle>
                <CardDescription>People who might be perfect for you</CardDescription>
              </CardHeader>
              <CardContent>
                {matches.length > 0 ? (
                  <div className="space-y-3">
                    {matches.map((match) => (
                      <div
                        key={match.id}
                        className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <Avatar className="h-12 w-12 border border-border">
                          <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                            {match.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-card-foreground">
                              {match.name}, {match.age}
                            </h4>
                            <Badge variant="secondary" className="text-xs">
                              {match.compatibility}%
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{match.location}</p>
                        </div>
                        <Heart className="h-5 w-5 text-primary" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground">No matches yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Complete your profile to find matches
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="flex-1 m-0 pb-20">
          <div className="p-4 space-y-3">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Your Profile</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/chat")}
                    className="text-primary hover:text-primary/80"
                  >
                    Edit Profile
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <Avatar
                      className="h-24 w-24 border-2 border-primary cursor-pointer"
                      onClick={() => avatarUrl && setViewingImage(avatarUrl)}
                    >
                      {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                      <AvatarFallback className="bg-muted text-2xl">
                        {userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      variant="default"
                      size="icon"
                      className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow-md"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-card-foreground text-lg">{userName}</p>
                    <p className="text-sm text-muted-foreground">
                      Profile {profileCompletion}% complete
                    </p>
                  </div>
                  <div className="w-full mt-4">
                    <Progress value={profileCompletion} className="h-2" />
                    {profileCompletion < 100 && (
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Chat with Diana to complete your profile
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">Settings</CardTitle>
                <CardDescription>Manage your account preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Account</h4>
                      <p className="text-xs text-muted-foreground">Privacy, security, email</p>
                    </div>
                  </div>
                  <span className="text-muted-foreground">›</span>
                </div>

                <div className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-accent/10 p-2 rounded-lg">
                      <Heart className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Preferences</h4>
                      <p className="text-xs text-muted-foreground">Match settings, filters</p>
                    </div>
                  </div>
                  <span className="text-muted-foreground">›</span>
                </div>

                <div className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-secondary/10 p-2 rounded-lg">
                      <MessageSquare className="h-4 w-4 text-secondary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Notifications</h4>
                      <p className="text-xs text-muted-foreground">Messages, matches, alerts</p>
                    </div>
                  </div>
                  <span className="text-muted-foreground">›</span>
                </div>

                <div className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-muted p-2 rounded-lg">
                      <Sparkles className="h-4 w-4 text-foreground" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Language</h4>
                      <p className="text-xs text-muted-foreground">App language</p>
                    </div>
                  </div>
                  <span className="text-muted-foreground">›</span>
                </div>

                <div className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-muted p-2 rounded-lg">
                      <Newspaper className="h-4 w-4 text-foreground" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Help & Support</h4>
                      <p className="text-xs text-muted-foreground">FAQ, contact us</p>
                    </div>
                  </div>
                  <span className="text-muted-foreground">›</span>
                </div>

                <div 
                  onClick={handleSignOut}
                  className="p-3 bg-destructive/10 rounded-lg hover:bg-destructive/20 transition-colors cursor-pointer flex items-center justify-between mt-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-destructive/20 p-2 rounded-lg">
                      <LogOut className="h-4 w-4 text-destructive" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-destructive">Log Out</h4>
                      <p className="text-xs text-muted-foreground">Sign out of your account</p>
                    </div>
                  </div>
                  <span className="text-destructive">›</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Discover/Info Tab */}
        <TabsContent value="discover" className="flex-1 m-0 pb-20">
          <div className="p-4 space-y-3">
            {showQuote && dailyQuote && (
              <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Daily Inspiration</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleRefreshQuote}
                        className="h-8 w-8 hover:bg-primary/10"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleDismissQuote}
                        className="h-8 w-8 hover:bg-primary/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-card-foreground italic text-sm">{dailyQuote}</p>
                </CardContent>
              </Card>
            )}

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">Recommended For You</CardTitle>
                <CardDescription>Personalized content to inspire your journey</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <h4 className="font-medium mb-1 flex items-center gap-2">
                    📚 <span>Book Recommendation</span>
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    "The Five Love Languages" - Learn how to better express and receive love
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <h4 className="font-medium mb-1 flex items-center gap-2">
                    🎙️ <span>Podcast</span>
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    "Relationship Matters" - Expert advice on building lasting connections
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <h4 className="font-medium mb-1 flex items-center gap-2">
                    📰 <span>Article</span>
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    "10 Signs You've Found Your Perfect Match" - Discover what makes a great partnership
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <h4 className="font-medium mb-1 flex items-center gap-2">
                    💡 <span>Dating Tip</span>
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    "Be authentic in your conversations - genuine connection starts with being yourself"
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Bottom Navigation (WhatsApp-style) */}
        <TabsList className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border rounded-none grid grid-cols-4 p-0">
          <TabsTrigger
            value="chats"
            className="flex-col gap-1 h-full data-[state=active]:bg-transparent data-[state=active]:text-primary"
          >
            <MessageSquare className="h-5 w-5" />
            <span className="text-xs">Chats</span>
          </TabsTrigger>
          <TabsTrigger
            value="matches"
            className="flex-col gap-1 h-full data-[state=active]:bg-transparent data-[state=active]:text-primary"
          >
            <Users className="h-5 w-5" />
            <span className="text-xs">Matches</span>
          </TabsTrigger>
          <TabsTrigger
            value="discover"
            className="flex-col gap-1 h-full data-[state=active]:bg-transparent data-[state=active]:text-primary"
          >
            <Newspaper className="h-5 w-5" />
            <span className="text-xs">Discover</span>
          </TabsTrigger>
          <TabsTrigger
            value="profile"
            className="flex-col gap-1 h-full data-[state=active]:bg-transparent data-[state=active]:text-primary"
          >
            <UserCircle className="h-5 w-5" />
            <span className="text-xs">Profile</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {viewingImage && (
        <ImageViewer imageUrl={viewingImage} onClose={() => setViewingImage(null)} />
      )}
    </div>
  );
};

export default Dashboard;
