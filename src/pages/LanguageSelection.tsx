import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import heroImage from "@/assets/hero-romantic.jpg";

const languages = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "tn", name: "Tunisian Arabic", nativeName: "تونسي" },
];

const LanguageSelection = () => {
  const navigate = useNavigate();

  const handleLanguageSelect = (code: string) => {
    localStorage.setItem("preferredLanguage", code);
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="relative overflow-hidden rounded-3xl shadow-[var(--shadow-soft)]">
          <div className="absolute inset-0 opacity-20">
            <img
              src={heroImage}
              alt="Romantic couple"
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="relative z-10 p-8 md:p-12 bg-gradient-to-b from-background/95 to-background/85 backdrop-blur-sm">
            <div className="text-center mb-12">
              <h1 className="text-5xl md:text-6xl font-bold bg-[var(--gradient-romantic)] bg-clip-text text-transparent mb-4">
                Soulmate
              </h1>
              <p className="text-xl text-muted-foreground">
                Your journey to meaningful connection begins here
              </p>
            </div>

            <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50">
              <h2 className="text-2xl font-semibold text-center mb-6">
                Choose Your Language
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {languages.map((lang) => (
                  <Button
                    key={lang.code}
                    onClick={() => handleLanguageSelect(lang.code)}
                    variant="outline"
                    className="h-16 text-lg transition-all hover:shadow-[var(--shadow-soft)] hover:scale-105 hover:border-primary/50"
                  >
                    <span className="font-semibold">{lang.nativeName}</span>
                  </Button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LanguageSelection;
