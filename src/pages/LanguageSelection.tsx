import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import heroImage from "@/assets/hero-romantic.jpg";
import { useLanguage } from "@/i18n/LanguageContext";
import { Globe, Check, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { FAQ } from "@/components/FAQ";

const languages = [
  { 
    code: "en", 
    name: "English", 
    nativeName: "English",
    flag: "🇬🇧",
    description: "International language"
  },
  { 
    code: "fr", 
    name: "French", 
    nativeName: "Français",
    flag: "🇫🇷",
    description: "Langue française"
  },
  { 
    code: "ar", 
    name: "Arabic", 
    nativeName: "العربية",
    flag: "🇸🇦",
    description: "اللغة العربية"
  },
  { 
    code: "tn", 
    name: "Tunisian Arabic", 
    nativeName: "تونسي",
    flag: "🇹🇳",
    description: "الدارجة التونسية"
  },
];

const LanguageSelection = () => {
  const navigate = useNavigate();
  const { setLanguage, t, language } = useLanguage();
  const [hoveredLang, setHoveredLang] = useState<string | null>(null);
  const [showFAQ, setShowFAQ] = useState(false);

  const handleLanguageSelect = (code: string) => {
    setLanguage(code as 'en' | 'fr' | 'ar' | 'tn');
    setTimeout(() => {
      navigate("/auth");
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="relative overflow-hidden rounded-3xl shadow-lg border border-border/50">
          <div className="absolute inset-0 opacity-10">
            <img
              src={heroImage}
              alt="Romantic couple"
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 p-8 md:p-12 bg-gradient-to-b from-background/95 to-background/90 backdrop-blur-md">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl">
                  <Globe className="h-12 w-12 text-primary animate-pulse" />
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-3 animate-fade-in">
                {t.languageSelection.title}
              </h1>
              <p className="text-lg text-muted-foreground animate-fade-in">
                {t.languageSelection.subtitle}
              </p>
            </div>

            <Card className="p-6 md:p-8 bg-card/90 backdrop-blur-sm border-border/50 shadow-lg">
              <div className="flex items-center justify-center gap-2 mb-6">
                <Globe className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-center">
                  {t.languageSelection.chooseLanguage}
                </h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {languages.map((lang, index) => {
                  const isSelected = language === lang.code;
                  const isHovered = hoveredLang === lang.code;
                  
                  return (
                    <div
                      key={lang.code}
                      className="animate-scale-in"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <Button
                        onClick={() => handleLanguageSelect(lang.code)}
                        onMouseEnter={() => setHoveredLang(lang.code)}
                        onMouseLeave={() => setHoveredLang(null)}
                        variant={isSelected ? "default" : "outline"}
                        className={`relative w-full h-auto py-4 px-5 transition-all duration-300 ${
                          isSelected 
                            ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground border-0 shadow-lg' 
                            : 'hover:shadow-md hover:scale-[1.02] hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <span className="text-3xl">{lang.flag}</span>
                          <div className="flex-1 text-left">
                            <div className="font-semibold text-lg flex items-center gap-2">
                              {lang.nativeName}
                              {isSelected && (
                                <Check className="h-4 w-4 animate-scale-in" />
                              )}
                            </div>
                            <div className={`text-xs ${
                              isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                            }`}>
                              {lang.description}
                            </div>
                          </div>
                        </div>
                        
                        {isHovered && !isSelected && (
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 rounded-md transition-opacity" />
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-6 pt-6 border-t border-border/50">
                <p className="text-sm text-center text-muted-foreground">
                  {language === 'en' && "You can change your language preference later in settings"}
                  {language === 'fr' && "Vous pouvez changer votre préférence de langue plus tard dans les paramètres"}
                  {language === 'ar' && "يمكنك تغيير تفضيلات اللغة لاحقًا في الإعدادات"}
                  {language === 'tn' && "تنجم تبدل اللغة وقتلي تحب من الإعدادات"}
                </p>
              </div>
            </Card>

            {/* FAQ Section */}
            <Card className="mt-6 p-6 bg-card/90 backdrop-blur-sm border-border/50 shadow-lg">
              <Button
                variant="ghost"
                onClick={() => setShowFAQ(!showFAQ)}
                className="w-full flex items-center justify-between hover:bg-muted/50 p-4"
              >
                <span className="text-lg font-semibold">{t.faq.title}</span>
                {showFAQ ? (
                  <ChevronUp className="h-5 w-5 text-primary" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-primary" />
                )}
              </Button>
              
              {showFAQ && (
                <div className="mt-4 animate-fade-in">
                  <FAQ showHeader={false} variant="compact" />
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LanguageSelection;
