import { Check } from "lucide-react";

interface CategoryTrackerProps {
  currentCategory: string;
  completedCategories: string[];
}

const categories = [
  { id: "basics", label: "Basics" },
  { id: "relationship", label: "Relationship" },
  { id: "career", label: "Career" },
  { id: "beliefs", label: "Beliefs" },
  { id: "goals", label: "Goals" },
  { id: "activities", label: "Activities" },
  { id: "travel", label: "Travel" },
  { id: "living", label: "Living" },
  { id: "values", label: "Values" },
];

export const CategoryTracker = ({ currentCategory, completedCategories }: CategoryTrackerProps) => {
  return (
    <div className="bg-background/95 backdrop-blur-sm px-4 py-3 border-b">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 min-w-max">
          {categories.map((category) => {
            const isCompleted = completedCategories.includes(category.id);
            const isCurrent = currentCategory === category.id;
            
            return (
              <div
                key={category.id}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isCompleted
                    ? "bg-primary text-primary-foreground"
                    : isCurrent
                    ? "bg-accent text-accent-foreground border-2 border-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted && <Check className="h-3 w-3" />}
                <span className="whitespace-nowrap">{category.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
