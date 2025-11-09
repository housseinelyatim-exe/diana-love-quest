import { Users, Heart } from "lucide-react";

interface BlurredMatchCardProps {
  count: number;
}

export const BlurredMatchCard = ({ count }: BlurredMatchCardProps) => {
  return (
    <div className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg border border-primary/20 text-center">
      <div className="flex justify-center mb-3">
        <div className="relative">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
            <Heart className="h-3 w-3 text-primary-foreground fill-current" />
          </div>
        </div>
      </div>
      <h3 className="font-semibold text-lg text-card-foreground mb-1">
        {count} Potential Matches
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Waiting nearby to connect with you
      </p>
      <div className="text-xs text-primary font-medium">
        Complete your profile to see them
      </div>
    </div>
  );
};
