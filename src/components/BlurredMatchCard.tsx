import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Heart, Lock } from "lucide-react";

interface BlurredMatchCardProps {
  index: number;
}

export const BlurredMatchCard = ({ index }: BlurredMatchCardProps) => {
  return (
    <div className="relative overflow-hidden p-3 bg-muted/30 rounded-lg">
      {/* Blur overlay */}
      <div className="absolute inset-0 backdrop-blur-sm bg-background/40 z-10 flex items-center justify-center">
        <div className="text-center">
          <Lock className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
          <p className="text-xs text-muted-foreground font-medium">Complete Profile to Unlock</p>
        </div>
      </div>
      
      {/* Blurred content */}
      <div className="flex items-center gap-3 opacity-50">
        <Avatar className="h-12 w-12 border border-border">
          <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
            ?
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-medium text-card-foreground">
              ████████, {20 + (index % 15)}
            </h4>
            <Badge variant="secondary" className="text-xs">
              {75 + (index % 20)}%
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">██████████</p>
        </div>
        <Heart className="h-5 w-5 text-primary" />
      </div>
    </div>
  );
};
