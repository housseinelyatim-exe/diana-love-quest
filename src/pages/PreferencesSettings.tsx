import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Heart, MapPin, Users, Calendar } from "lucide-react";
import { toast } from "sonner";

const PreferencesSettings = () => {
  const navigate = useNavigate();
  const [ageRange, setAgeRange] = useState([25, 35]);
  const [maxDistance, setMaxDistance] = useState([50]);
  const [showAgeRange, setShowAgeRange] = useState(true);
  const [showDistance, setShowDistance] = useState(true);
  const [onlyVerified, setOnlyVerified] = useState(false);

  const handleSavePreferences = () => {
    toast.success("Preferences saved successfully!");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-3 shadow-md flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard")}
          className="text-primary-foreground hover:bg-primary-foreground/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Match Preferences</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Age Range */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Age Range
            </CardTitle>
            <CardDescription>Set your preferred age range for matches</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Age</span>
                <span className="font-medium">{ageRange[0]} - {ageRange[1]} years</span>
              </div>
              <Slider
                value={ageRange}
                onValueChange={setAgeRange}
                min={18}
                max={70}
                step={1}
                className="w-full"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <Label htmlFor="show-age">Show my age on profile</Label>
                <p className="text-sm text-muted-foreground">Let others see your age</p>
              </div>
              <Switch
                id="show-age"
                checked={showAgeRange}
                onCheckedChange={setShowAgeRange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Distance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Distance
            </CardTitle>
            <CardDescription>Set maximum distance for matches</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Maximum Distance</span>
                <span className="font-medium">
                  {maxDistance[0] === 100 ? "Any distance" : `${maxDistance[0]} km`}
                </span>
              </div>
              <Slider
                value={maxDistance}
                onValueChange={setMaxDistance}
                min={5}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <Label htmlFor="show-distance">Show distance on profile</Label>
                <p className="text-sm text-muted-foreground">Display distance to matches</p>
              </div>
              <Switch
                id="show-distance"
                checked={showDistance}
                onCheckedChange={setShowDistance}
              />
            </div>
          </CardContent>
        </Card>

        {/* Match Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Match Filters
            </CardTitle>
            <CardDescription>Additional filters for finding matches</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="verified-only">Verified Profiles Only</Label>
                <p className="text-sm text-muted-foreground">Only show verified users</p>
              </div>
              <Switch
                id="verified-only"
                checked={onlyVerified}
                onCheckedChange={setOnlyVerified}
              />
            </div>
          </CardContent>
        </Card>

        {/* Deal Breakers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              Deal Breakers
            </CardTitle>
            <CardDescription>Set your non-negotiable preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Smoking preferences</p>
              <p>• Drinking preferences</p>
              <p>• Children preferences</p>
              <p>• Religion preferences</p>
              <p className="text-xs pt-2">Chat with Diana to set detailed deal breakers</p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button onClick={handleSavePreferences} className="w-full">
          Save Preferences
        </Button>
      </div>
    </div>
  );
};

export default PreferencesSettings;
