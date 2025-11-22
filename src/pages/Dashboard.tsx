import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { MessageSquare, Heart, User, Newspaper, LogOut, Camera, RefreshCw, X, Sparkles, Users, UserCircle, BookOpen, Headphones, TrendingUp, Lightbulb, Video, Award, BarChart3, Target, Share2, Copy, Check } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { ImageViewer } from "@/components/ImageViewer";
import { formatDistanceToNow } from "date-fns";
import { BlurredMatchCard } from "@/components/BlurredMatchCard";
import { AnimatedCounter } from "@/components/AnimatedCounter";

interface Match {
  id: string;
  name: string;
  age: number;
  compatibility: number;
  location: string;
  avatar_url?: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);
  const [userName, setUserName] = useState("");
  const [dailyQuote, setDailyQuote] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuote, setShowQuote] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("matches");
  const [lastMessageTime, setLastMessageTime] = useState<Date | null>(null);
  const [platformStats, setPlatformStats] = useState({
    totalUsers: 0,
    activeMatches: 0,
    successRate: 0
  });
  const [userBio, setUserBio] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set tab based on navigation state, otherwise default to matches
  useEffect(() => {
    const tab = (location.state as any)?.tab;
    if (tab) {
      setActiveTab(tab);
    } else {
      setActiveTab("matches");
    }
  }, [location.pathname, location.state]);

  useEffect(() => {
    checkAuth();
    loadDashboardData();
    loadPlatformStats();
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
        setUserBio(profile.bio || '');
      }

      // Fetch last message from Diana
      const { data: lastMessage } = await supabase
        .from('messages')
        .select('created_at')
        .eq('is_from_diana', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastMessage) {
        setLastMessageTime(new Date(lastMessage.created_at));
      }

      // Fetch real matches
      const { data: matchesData } = await supabase
        .from('matches')
        .select('*')
        .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`)
        .order('compatibility_score', { ascending: false });

      let formattedMatches: Match[] = [];

      if (matchesData && matchesData.length > 0) {
        // Fetch profiles for matched users
        const matchedUserIds = matchesData.map(match => 
          match.user_id_1 === user.id ? match.user_id_2 : match.user_id_1
        );

        const { data: matchedProfiles } = await supabase
          .from('profiles')
          .select('id, name, age, where_he_live, avatar_url')
          .in('id', matchedUserIds);

        if (matchedProfiles) {
          formattedMatches = matchesData.map(match => {
            const otherUserId = match.user_id_1 === user.id ? match.user_id_2 : match.user_id_1;
            const profile = matchedProfiles.find(p => p.id === otherUserId);
            
            return {
              id: otherUserId,
              name: profile?.name || 'Anonymous',
              age: profile?.age || 0,
              compatibility: match.compatibility_score || 0,
              location: profile?.where_he_live || 'Unknown',
              avatar_url: profile?.avatar_url || undefined
            };
          });
        }
      }

      // Add demo matches for preview
      const demoMatches: Match[] = [
        { id: 'demo-1', name: 'Sarah', age: 26, compatibility: 92, location: 'Tunis' },
        { id: 'demo-2', name: 'Amira', age: 24, compatibility: 88, location: 'Sousse' },
        { id: 'demo-3', name: 'Leila', age: 28, compatibility: 85, location: 'Sfax' },
      ];

      setMatches([...formattedMatches, ...demoMatches]);

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

    // Show loading toast
    const loadingToast = toast.loading('Uploading profile picture...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Not authenticated', { id: loadingToast });
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file', { id: loadingToast });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB', { id: loadingToast });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      console.log('Uploading to:', filePath);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      console.log('Public URL:', publicUrl);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw updateError;
      }

      setAvatarUrl(publicUrl);
      toast.success('Profile picture updated!', { id: loadingToast });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      const errorMessage = error?.message || 'Failed to upload profile picture';
      toast.error(errorMessage, { id: loadingToast });
    }
  };

  const loadPlatformStats = async () => {
    try {
      // Get total users count
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get active matches count
      const { count: matchesCount } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true });

      // Calculate success rate (matches with compatibility > 80%)
      const { data: highCompatibilityMatches } = await supabase
        .from('matches')
        .select('compatibility_score')
        .gte('compatibility_score', 80);

      const successRate = matchesCount && highCompatibilityMatches
        ? Math.round((highCompatibilityMatches.length / matchesCount) * 100)
        : 85; // Default value

      setPlatformStats({
        totalUsers: usersCount || 1250,
        activeMatches: matchesCount || 342,
        successRate: successRate || 85
      });
    } catch (error) {
      console.error('Error loading platform stats:', error);
      // Set default values on error
      setPlatformStats({
        totalUsers: 1250,
        activeMatches: 342,
        successRate: 85
      });
    }
  };

  const handleCopyBio = async () => {
    if (!userBio) return;
    
    try {
      await navigator.clipboard.writeText(userBio);
      setCopySuccess(true);
      toast.success("Bio copied to clipboard!");
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      toast.error("Failed to copy bio");
    }
  };

  const handleShareBio = async () => {
    if (!userBio) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${userName}'s Profile`,
          text: userBio,
        });
        toast.success("Bio shared successfully!");
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          toast.error("Failed to share bio");
        }
      }
    } else {
      handleCopyBio();
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
      <div className="bg-primary text-primary-foreground px-4 py-3 shadow-md">
        <h1 className="text-2xl font-bold">
          {activeTab === "chats" && "Chats"}
          {activeTab === "matches" && "Matches"}
          {activeTab === "profile" && "Profile"}
          {activeTab === "discover" && "Discover"}
        </h1>
      </div>

      {/* Tabs Container */}
      <Tabs key="dashboard-tabs" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col" defaultValue="matches">
        {/* Chats Tab */}
        <TabsContent value="chats" className="flex-1 m-0 pb-20">
          <div className="p-4 space-y-3">
            <div
              onClick={() => navigate("/chat")}
              className="bg-card hover:bg-muted/50 p-4 rounded-lg cursor-pointer transition-colors border border-border"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14 border-2 border-primary">
                  <div className="bg-gradient-to-br from-pink-400 to-purple-500 w-full h-full flex items-center justify-center">
                    <Sparkles className="h-7 w-7 text-white" />
                  </div>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-card-foreground">Diana (AI Matchmaker)</h3>
                    {lastMessageTime && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(lastMessageTime, { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {profileCompletion < 100
                      ? "Let's complete your profile together 💕"
                      : "Ready to find your perfect match! ✨"}
                  </p>
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
                    {matches.map((match) => {
                      const isHighCompatibility = match.compatibility >= 85;
                      return (
                        <div
                          key={match.id}
                          onClick={() => navigate(`/match/${match.id}`)}
                          className={`group relative flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-all duration-300 cursor-pointer ${
                            isHighCompatibility 
                              ? 'bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-2 border-transparent hover:border-primary/30 animate-fade-in' 
                              : 'bg-muted/30'
                          }`}
                        >
                          {isHighCompatibility && (
                            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          )}
                          <div className="relative">
                            <Avatar className={`h-14 w-14 border-2 transition-transform duration-300 group-hover:scale-110 ${
                              isHighCompatibility ? 'border-primary shadow-lg shadow-primary/20' : 'border-border'
                            }`}>
                              {match.avatar_url && <AvatarImage src={match.avatar_url} alt={match.name} />}
                              <AvatarFallback className={`text-xl font-bold ${
                                isHighCompatibility ? 'bg-gradient-to-br from-primary/20 to-accent/20 text-primary' : 'bg-primary/10 text-primary'
                              }`}>
                                {match.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            {isHighCompatibility && (
                              <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-scale-in">
                                <Heart className="h-3 w-3 text-primary-foreground fill-current" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 relative z-10">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-semibold text-card-foreground">
                                {match.name}, {match.age}
                              </h4>
                              <Badge 
                                variant={isHighCompatibility ? "default" : "secondary"} 
                                className={`text-xs font-bold transition-all duration-300 ${
                                  isHighCompatibility 
                                    ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md group-hover:shadow-lg' 
                                    : ''
                                }`}
                              >
                                {match.compatibility}%
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{match.location}</p>
                          </div>
                          <MessageSquare className={`h-5 w-5 transition-colors duration-300 ${
                            isHighCompatibility ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
                          }`} />
                        </div>
                      );
                    })}
                    {profileCompletion < 100 && (
                      <div className="mt-4">
                        <BlurredMatchCard count={8} />
                      </div>
                    )}
                  </div>
                ) : (
                  <BlurredMatchCard count={12} />
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

            {userBio && profileCompletion === 100 && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Your Bio
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyBio}
                        className="gap-2"
                      >
                        {copySuccess ? (
                          <>
                            <Check className="h-4 w-4 text-green-500" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy
                          </>
                        )}
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleShareBio}
                        className="gap-2"
                      >
                        <Share2 className="h-4 w-4" />
                        Share
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {userBio}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">Settings</CardTitle>
                <CardDescription>Manage your account preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div 
                  onClick={() => navigate("/settings/account")}
                  className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between"
                >
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

                <div 
                  onClick={() => navigate("/settings/preferences")}
                  className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between"
                >
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

                <div 
                  onClick={() => navigate("/settings/notifications")}
                  className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between"
                >
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

                <div 
                  onClick={() => navigate("/language-selection")}
                  className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between"
                >
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

                <div 
                  onClick={() => navigate("/settings/help")}
                  className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between"
                >
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
            {profileCompletion < 50 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-12">
                  <div className="relative">
                    <div className="absolute inset-0 backdrop-blur-md bg-background/30 rounded-lg flex items-center justify-center z-10">
                      <div className="text-center space-y-3 p-6">
                        <div className="text-4xl mb-2">🔒</div>
                        <h3 className="text-lg font-semibold text-card-foreground">Complete Your Profile</h3>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                          Unlock the Discover section by completing at least 50% of your profile
                        </p>
                        <div className="pt-2">
                          <Progress value={profileCompletion} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-2">{profileCompletion}% Complete</p>
                        </div>
                        <Button
                          onClick={() => navigate("/chat")}
                          className="mt-4"
                        >
                          Complete Profile
                        </Button>
                      </div>
                    </div>
                    <div className="blur-sm pointer-events-none select-none opacity-40">
                      <div className="space-y-2">
                        <div className="h-16 bg-muted rounded-lg animate-pulse" />
                        <div className="h-16 bg-muted rounded-lg animate-pulse" />
                        <div className="h-16 bg-muted rounded-lg animate-pulse" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Daily Quote */}
                {showQuote && dailyQuote && (
                  <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <h4 className="font-medium text-sm">Daily Inspiration</h4>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleDismissQuote}
                        className="h-6 w-6 -mt-1 -mr-2"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground italic leading-relaxed">{dailyQuote}</p>
                  </div>
                )}

                {/* Platform Stats */}
                <div 
                  className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <BarChart3 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Platform Insights</h4>
                      <p className="text-xs text-muted-foreground">{platformStats.totalUsers} users · {platformStats.activeMatches} matches · {platformStats.successRate}% success</p>
                    </div>
                  </div>
                  <span className="text-muted-foreground">›</span>
                </div>

                {/* Dating Safety */}
                <div 
                  className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-rose-500/10 p-2 rounded-lg">
                      <Award className="h-4 w-4 text-rose-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Dating Safety Tips</h4>
                      <p className="text-xs text-muted-foreground">Stay safe while dating</p>
                    </div>
                  </div>
                  <span className="text-muted-foreground">›</span>
                </div>

                {/* Success Stories */}
                <div 
                  onClick={() => window.open('https://www.theknot.com/content/love-stories', '_blank')}
                  className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-pink-500/10 p-2 rounded-lg">
                      <Heart className="h-4 w-4 text-pink-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Success Stories</h4>
                      <p className="text-xs text-muted-foreground">Real couples' journeys</p>
                    </div>
                  </div>
                  <span className="text-muted-foreground">›</span>
                </div>

                {/* Dating Tips */}
                <div 
                  onClick={() => window.open('https://www.gottman.com/blog/', '_blank')}
                  className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-500/10 p-2 rounded-lg">
                      <Lightbulb className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Dating Tips & Advice</h4>
                      <p className="text-xs text-muted-foreground">Expert guidance</p>
                    </div>
                  </div>
                  <span className="text-muted-foreground">›</span>
                </div>

                {/* Reading List */}
                <div 
                  onClick={() => window.open('https://www.goodreads.com/shelf/show/relationship', '_blank')}
                  className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-500/10 p-2 rounded-lg">
                      <BookOpen className="h-4 w-4 text-orange-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Reading List</h4>
                      <p className="text-xs text-muted-foreground">Must-read books</p>
                    </div>
                  </div>
                  <span className="text-muted-foreground">›</span>
                </div>

                {/* Podcasts */}
                <div 
                  onClick={() => window.open('https://open.spotify.com/search/relationship%20podcast', '_blank')}
                  className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-500/10 p-2 rounded-lg">
                      <Headphones className="h-4 w-4 text-purple-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Podcasts</h4>
                      <p className="text-xs text-muted-foreground">Expert discussions</p>
                    </div>
                  </div>
                  <span className="text-muted-foreground">›</span>
                </div>

                {/* Video Guides */}
                <div 
                  onClick={() => window.open('https://www.youtube.com/results?search_query=relationship+advice', '_blank')}
                  className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-red-500/10 p-2 rounded-lg">
                      <Video className="h-4 w-4 text-red-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Video Guides</h4>
                      <p className="text-xs text-muted-foreground">Visual learning</p>
                    </div>
                  </div>
                  <span className="text-muted-foreground">›</span>
                </div>

                {/* Trends */}
                <div 
                  onClick={() => window.open('https://www.psychologytoday.com/us/blog/the-attraction-doctor', '_blank')}
                  className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-green-500/10 p-2 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Dating Trends</h4>
                      <p className="text-xs text-muted-foreground">Latest insights</p>
                    </div>
                  </div>
                  <span className="text-muted-foreground">›</span>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* Bottom Navigation (WhatsApp-style) */}
        <TabsList className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border rounded-none grid grid-cols-4 p-0 z-50">
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
