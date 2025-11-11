import { Check, User, Heart, Briefcase, Sparkles, Target, Palette, Plane, Home, Shield } from "lucide-react";

interface CategoryTrackerProps {
  currentCategory: string;
  completedCategories: string[];
}

const categories = [
  { id: "basics", label: "Basics", icon: User },
  { id: "relationship", label: "Relationship", icon: Heart },
  { id: "career", label: "Career", icon: Briefcase },
  { id: "beliefs", label: "Beliefs", icon: Sparkles },
  { id: "goals", label: "Goals", icon: Target },
  { id: "activities", label: "Activities", icon: Palette },
  { id: "travel", label: "Travel", icon: Plane },
  { id: "living", label: "Living", icon: Home },
  { id: "values", label: "Values", icon: Shield },
];

export const CategoryTracker = ({ currentCategory, completedCategories }: CategoryTrackerProps) => {
  return (
    <div className="bg-gradient-to-r from-background via-background/98 to-background backdrop-blur-sm px-4 py-3 border-b shadow-sm">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-2.5 min-w-max">
          {categories.map((category, index) => {
            const isCompleted = completedCategories.includes(category.id);
            const isCurrent = currentCategory === category.id;
            const Icon = category.icon;
            
            return (
              <div
                key={category.id}
                className={`
                  relative flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold 
                  transition-all duration-300 ease-out transform
                  ${
                    isCompleted
                      ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-md scale-100"
                      : isCurrent
                      ? "bg-gradient-to-r from-accent to-accent/90 text-accent-foreground border-2 border-primary shadow-lg scale-105 animate-pulse"
                      : "bg-muted/50 text-muted-foreground scale-95 opacity-70"
                  }
                  hover:scale-105 hover:shadow-md
                `}
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                {/* Icon */}
                <div className={`
                  flex items-center justify-center w-5 h-5 rounded-full transition-all
                  ${isCompleted ? "bg-white/20" : isCurrent ? "bg-primary/20" : ""}
                `}>
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5 animate-scale-in" />
                  ) : (
                    <Icon className={`h-3.5 w-3.5 ${isCurrent ? "animate-bounce" : ""}`} />
                  )}
                </div>
                
                {/* Label */}
                <span className="whitespace-nowrap tracking-wide">{category.label}</span>
                
                {/* Glow effect for current category */}
                {isCurrent && (
                  <div className="absolute inset-0 rounded-full bg-primary/20 blur-md -z-10 animate-pulse" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
