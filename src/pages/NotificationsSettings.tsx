import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Bell, MessageSquare, Heart, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";

const NotificationsSettings = () => {
  const navigate = useNavigate();
  
  // Push Notifications
  const [newMatchNotif, setNewMatchNotif] = useState(true);
  const [newMessageNotif, setNewMessageNotif] = useState(true);
  const [profileViewNotif, setProfileViewNotif] = useState(false);
  const [dianaNotif, setDianaNotif] = useState(true);
  
  // Email Notifications
  const [matchEmail, setMatchEmail] = useState(true);
  const [messageEmail, setMessageEmail] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [tipsEmail, setTipsEmail] = useState(true);

  // Sound & Vibration
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  const handleSaveSettings = () => {
    toast.success("Notification settings saved!");
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
        <h1 className="text-xl font-semibold">Notifications</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Push Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Push Notifications
            </CardTitle>
            <CardDescription>Receive notifications on your device</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="new-match" className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-primary" />
                  New Matches
                </Label>
                <p className="text-sm text-muted-foreground">When you get a new match</p>
              </div>
              <Switch
                id="new-match"
                checked={newMatchNotif}
                onCheckedChange={setNewMatchNotif}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="new-message" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  New Messages
                </Label>
                <p className="text-sm text-muted-foreground">When someone messages you</p>
              </div>
              <Switch
                id="new-message"
                checked={newMessageNotif}
                onCheckedChange={setNewMessageNotif}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="profile-view" className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  Profile Views
                </Label>
                <p className="text-sm text-muted-foreground">When someone views your profile</p>
              </div>
              <Switch
                id="profile-view"
                checked={profileViewNotif}
                onCheckedChange={setProfileViewNotif}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="diana-notif" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Diana Messages
                </Label>
                <p className="text-sm text-muted-foreground">Messages from Diana AI</p>
              </div>
              <Switch
                id="diana-notif"
                checked={dianaNotif}
                onCheckedChange={setDianaNotif}
              />
            </div>
          </CardContent>
        </Card>

        {/* Email Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Email Notifications
            </CardTitle>
            <CardDescription>Receive updates via email</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="match-email">Match Notifications</Label>
                <p className="text-sm text-muted-foreground">Email when you get new matches</p>
              </div>
              <Switch
                id="match-email"
                checked={matchEmail}
                onCheckedChange={setMatchEmail}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="message-email">Message Notifications</Label>
                <p className="text-sm text-muted-foreground">Email for new messages</p>
              </div>
              <Switch
                id="message-email"
                checked={messageEmail}
                onCheckedChange={setMessageEmail}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="weekly-digest">Weekly Digest</Label>
                <p className="text-sm text-muted-foreground">Weekly summary of your activity</p>
              </div>
              <Switch
                id="weekly-digest"
                checked={weeklyDigest}
                onCheckedChange={setWeeklyDigest}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="tips-email">Dating Tips & Advice</Label>
                <p className="text-sm text-muted-foreground">Helpful tips for better matches</p>
              </div>
              <Switch
                id="tips-email"
                checked={tipsEmail}
                onCheckedChange={setTipsEmail}
              />
            </div>
          </CardContent>
        </Card>

        {/* Sound & Vibration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Sound & Vibration
            </CardTitle>
            <CardDescription>Customize notification sounds and vibrations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sound">Notification Sound</Label>
                <p className="text-sm text-muted-foreground">Play sound for notifications</p>
              </div>
              <Switch
                id="sound"
                checked={soundEnabled}
                onCheckedChange={setSoundEnabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="vibration">Vibration</Label>
                <p className="text-sm text-muted-foreground">Vibrate for notifications</p>
              </div>
              <Switch
                id="vibration"
                checked={vibrationEnabled}
                onCheckedChange={setVibrationEnabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button onClick={handleSaveSettings} className="w-full">
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default NotificationsSettings;
