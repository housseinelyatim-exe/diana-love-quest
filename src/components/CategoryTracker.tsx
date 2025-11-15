import { Check, User, Heart, Briefcase, Sparkles, Target, Palette, Plane, Home, MapPin, Shield } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";

interface CategoryTrackerProps {
  currentCategory: string;
  completedCategories: string[];
  profileCompletion: number;
  completionLabel: string;
  categoryProgress?: Record<string, { completed: number; total: number; percentage: number }>;
}

const categories = [
  { id: "basic", label: "Basics", icon: User },
  { id: "location", label: "Location", icon: MapPin },
  { id: "physical", label: "Physical", icon: Target },
  { id: "family", label: "Family", icon: Heart },
  { id: "career", label: "Career", icon: Briefcase },
  { id: "values", label: "Values", icon: Sparkles },
  { id: "health", label: "Health", icon: Shield },
  { id: "lifestyle", label: "Lifestyle", icon: Palette },
  { id: "pets", label: "Pets", icon: Heart },
  { id: "hobbies", label: "Hobbies", icon: Palette },
  { id: "travel", label: "Travel", icon: Plane },
  { id: "relocation", label: "Relocation", icon: Home },
  { id: "relationship", label: "Relationship", icon: Heart },
];

export const CategoryTracker = ({ 
  currentCategory, 
  completedCategories, 
  profileCompletion,
  completionLabel,
  categoryProgress = {}
}: CategoryTrackerProps) => {
  return (
    <div className="bg-gradient-to-r from-background via-background/98 to-background backdrop-blur-sm border-b shadow-sm">
      {/* Overall Progress Bar Section */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-muted-foreground font-medium">{completionLabel}</span>
          <span className="font-bold text-primary text-sm">{profileCompletion}%</span>
        </div>
        <Progress value={profileCompletion} className="h-2 shadow-sm" />
      </div>
      
      {/* Category Pills Section with Progress */}
      <div className="px-4 pb-3 pt-2">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-2.5 min-w-max">
            {categories.map((category, index) => {
              const isCompleted = completedCategories.includes(category.id);
              const isCurrent = currentCategory === category.id;
              const Icon = category.icon;
              const progress = categoryProgress[category.id];
              
              return (
                <Card
                  key={category.id}
                  className={`
                    relative flex flex-col gap-1 px-3 py-2 rounded-xl text-xs font-semibold 
                    transition-all duration-300 ease-out transform
                    animate-slide-in min-w-[100px]
                    ${
                      isCompleted
                        ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-md scale-100 border-primary"
                        : isCurrent
                        ? "bg-gradient-to-br from-accent to-accent/90 text-accent-foreground border-2 border-primary shadow-lg scale-105"
                        : "bg-muted/50 text-muted-foreground scale-95 opacity-70 border-muted"
                    }
                    hover:scale-105 hover:shadow-md cursor-pointer
                  `}
                  style={{
                    animationDelay: `${index * 80}ms`,
                  }}
                >
                  {/* Header with Icon and Label */}
                  <div className="flex items-center gap-2">
                    <div className={`
                      flex items-center justify-center w-5 h-5 rounded-full transition-all
                      ${isCompleted ? "bg-white/20" : isCurrent ? "bg-primary/20" : "bg-background/10"}
                    `}>
                      {isCompleted ? (
                        <Check className="h-3.5 w-3.5 animate-scale-in" />
                      ) : (
                        <Icon className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <span className="whitespace-nowrap tracking-wide">{category.label}</span>
                  </div>
                  
                  {/* Progress Information */}
                  {progress && (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="opacity-80">
                          {progress.completed}/{progress.total}
                        </span>
                        <span className={`font-bold ${isCompleted ? 'text-white' : isCurrent ? 'text-primary' : ''}`}>
                          {progress.percentage}%
                        </span>
                      </div>
                      <div className="w-full h-1 rounded-full bg-white/20 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            isCompleted 
                              ? 'bg-white' 
                              : isCurrent 
                              ? 'bg-primary' 
                              : 'bg-primary/50'
                          }`}
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
