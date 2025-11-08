import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Shield, Mail, Eye, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const AccountSettings = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [allowMessages, setAllowMessages] = useState(true);

  const handleUpdateEmail = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      toast.success("Verification email sent! Please check your inbox.");
      setEmail("");
    } catch (error: any) {
      toast.error(error.message || "Failed to update email");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = () => {
    toast.info("Password reset email will be sent");
    // You can implement password reset flow here
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
        <h1 className="text-xl font-semibold">Account Settings</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Email
            </CardTitle>
            <CardDescription>Update your email address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">New Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleUpdateEmail} 
              disabled={isLoading || !email}
              className="w-full"
            >
              Update Email
            </Button>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Security
            </CardTitle>
            <CardDescription>Manage your password and security settings</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              onClick={handleChangePassword}
              className="w-full"
            >
              Change Password
            </Button>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Privacy
            </CardTitle>
            <CardDescription>Control who can see your profile and interact with you</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="profile-visibility">Profile Visibility</Label>
                <p className="text-sm text-muted-foreground">Show your profile to other users</p>
              </div>
              <Switch
                id="profile-visibility"
                checked={profileVisibility}
                onCheckedChange={setProfileVisibility}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="online-status">Online Status</Label>
                <p className="text-sm text-muted-foreground">Show when you're active</p>
              </div>
              <Switch
                id="online-status"
                checked={showOnlineStatus}
                onCheckedChange={setShowOnlineStatus}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="allow-messages">Allow Messages</Label>
                <p className="text-sm text-muted-foreground">Let matches send you messages</p>
              </div>
              <Switch
                id="allow-messages"
                checked={allowMessages}
                onCheckedChange={setAllowMessages}
              />
            </div>
          </CardContent>
        </Card>

        {/* Visibility Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Visibility Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Your profile is visible to users who match your preferences</p>
            <p>• You can hide your profile at any time using the toggle above</p>
            <p>• Your matches will still be able to see your profile even if you're offline</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountSettings;
