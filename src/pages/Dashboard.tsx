import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Heart, MessageCircle, Sparkles, LogOut, User, RefreshCw, X, Newspaper, Camera } from "lucide-react";
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
    <div className="min-h-screen bg-[hsl(var(--muted))] flex flex-col">
      {/* WhatsApp-style Header */}
      <div className="bg-[hsl(var(--primary))] text-white px-4 py-3 shadow-md">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Diana Love Quest</h1>
          <div className="flex gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleSignOut}
              className="text-white hover:bg-white/10"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 bg-white">
        {/* Diana Chat Item */}
        <div 
          onClick={() => navigate("/chat")}
          className="flex items-center gap-3 p-4 border-b hover:bg-muted/30 active:bg-muted/50 cursor-pointer transition-colors"
        >
          <div className="relative">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-lg font-semibold">
                D
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-base">Diana</h2>
              <span className="text-xs text-muted-foreground">now</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground truncate">
                {profileCompletion < 100 
                  ? "Let's complete your profile together 💕" 
                  : "Your profile is complete! Ready to find matches? ✨"}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Status Card */}
        <div className="p-4 bg-[hsl(var(--accent))]/5 border-b">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar 
                  className="h-16 w-16 cursor-pointer"
                  onClick={() => avatarUrl && setViewingImage(avatarUrl)}
                >
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                  <AvatarFallback className="bg-muted">
                    {userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="secondary"
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
              <div>
                <div className="font-medium">{userName}</div>
                <div className="text-sm text-muted-foreground">Profile: {profileCompletion}%</div>
              </div>
            </div>
          </div>
          <Progress value={profileCompletion} className="h-2 mb-2" />
          {profileCompletion < 100 && (
            <p className="text-xs text-muted-foreground">
              Tap on Diana's chat to continue building your profile
            </p>
          )}
        </div>

        {/* Matches Section */}
        {matches.length > 0 && (
          <div className="mt-4">
            <div className="px-4 py-2 bg-muted/30">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                Your Matches ({matches.length})
              </h3>
            </div>
            {matches.map((match) => (
              <div
                key={match.id}
                className="flex items-center gap-3 p-4 border-b hover:bg-muted/30 active:bg-muted/50 cursor-pointer transition-colors"
              >
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-primary text-lg font-semibold">
                    {match.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="font-semibold text-base">{match.name}</h2>
                    <Badge variant="secondary" className="text-xs">
                      {match.compatibility}%
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {match.age} years • {match.location}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Daily Quote */}
        {showQuote && dailyQuote && (
          <div className="m-4 p-4 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg border border-primary/20">
            <div className="flex gap-3">
              <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Daily Inspiration</p>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRefreshQuote}
                      className="h-6 w-6 p-0"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDismissQuote}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm italic">{dailyQuote}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {viewingImage && (
        <ImageViewer 
          imageUrl={viewingImage} 
          onClose={() => setViewingImage(null)} 
        />
      )}
    </div>
  );
};

export default Dashboard;
