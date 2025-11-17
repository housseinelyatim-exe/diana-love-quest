import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Target, Sparkles, ChevronRight } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

const Intro = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [currentFeature, setCurrentFeature] = useState(0);
  const [showButton, setShowButton] = useState(false);

  const features = [
    {
      icon: Heart,
      titleKey: "intro.feature1.title",
      descKey: "intro.feature1.desc",
      title: "Find Your Perfect Match",
      description: "AI-powered matchmaking based on your values, interests, and lifestyle"
    },
    {
      icon: MessageCircle,
      titleKey: "intro.feature2.title",
      descKey: "intro.feature2.desc",
      title: "Guided Conversations",
      description: "Diana guides you through building a complete profile with thoughtful questions"
    },
    {
      icon: Target,
      titleKey: "intro.feature3.title",
      descKey: "intro.feature3.desc",
      title: "Smart Matching",
      description: "Get matched with compatible partners based on comprehensive compatibility analysis"
    },
    {
      icon: Sparkles,
      titleKey: "intro.feature4.title",
      descKey: "intro.feature4.desc",
      title: "Meaningful Connections",
      description: "Build real relationships based on shared values and genuine compatibility"
    }
  ];

  useEffect(() => {
    checkAuth();
    
    // If user has already seen intro, redirect to dashboard chats
    const hasSeenIntro = localStorage.getItem('hasSeenIntro');
    if (hasSeenIntro === 'true') {
      navigate("/dashboard", { state: { tab: "chats" } });
    }
  }, [navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentFeature((prev) => {
        if (prev < features.length - 1) {
          return prev + 1;
        } else {
          clearInterval(timer);
          setShowButton(true);
          return prev;
        }
      });
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const handleGetStarted = () => {
    localStorage.setItem('hasSeenIntro', 'true');
    navigate("/dashboard", { state: { tab: "chats" } });
  };

  const handleSkip = () => {
    localStorage.setItem('hasSeenIntro', 'true');
    navigate("/dashboard", { state: { tab: "chats" } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" 
             style={{ animationDuration: "4s" }} />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse" 
             style={{ animationDuration: "5s", animationDelay: "1s" }} />
      </div>

      {/* Skip button */}
      <Button
        variant="ghost"
        onClick={handleSkip}
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground z-10"
      >
        Skip
      </Button>

      {/* Main content */}
      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Logo/Brand */}
        <div className="text-center space-y-2 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary shadow-lg mb-4">
            <Heart className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Diana
          </h1>
          <p className="text-lg text-muted-foreground">
            Your AI Matchmaking Assistant
          </p>
        </div>

        {/* Features showcase */}
        <div className="space-y-6 min-h-[300px] flex flex-col items-center justify-center">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const isVisible = index <= currentFeature;
            const isActive = index === currentFeature;

            return (
              <div
                key={index}
                className={`
                  transition-all duration-700 ease-out w-full
                  ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
                  ${isActive ? 'scale-100' : 'scale-95'}
                  ${index < currentFeature ? 'blur-sm' : ''}
                `}
                style={{
                  transitionDelay: `${index * 100}ms`
                }}
              >
                <div className={`
                  bg-card border rounded-2xl p-6 shadow-lg
                  ${isActive ? 'ring-2 ring-primary/50' : ''}
                  hover:shadow-xl transition-shadow
                `}>
                  <div className="flex items-start gap-4">
                    <div className={`
                      flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center
                      bg-gradient-to-br from-primary/20 to-secondary/20
                      ${isActive ? 'animate-pulse' : ''}
                    `}>
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h3 className="font-semibold text-lg text-foreground">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress indicators */}
        <div className="flex justify-center gap-2">
          {features.map((_, index) => (
            <div
              key={index}
              className={`
                h-2 rounded-full transition-all duration-500
                ${index <= currentFeature ? 'bg-primary w-8' : 'bg-muted w-2'}
              `}
            />
          ))}
        </div>

        {/* Get started button */}
        {showButton && (
          <div className="animate-fade-in flex justify-center">
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity shadow-lg group px-8"
            >
              Get Started
              <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Intro;
