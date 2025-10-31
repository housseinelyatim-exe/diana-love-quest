import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Send, LogOut, LayoutDashboard, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const Chat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAuth();
    initializeChat();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const initializeChat = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return; // checkAuth will redirect

      const { data, error } = await supabase.functions.invoke('chat-with-diana', {
        body: {
          message: "", // trigger deterministic next question based on profile
          conversationHistory: [],
          userId: session.user.id,
        },
      });

      if (error) {
        console.error('Error initializing chat:', error);
        // Fallback welcome if function call fails
        setMessages([{
          role: 'assistant',
          content: "Hello! I'm Diana. Let's continue where we left off — what's your next update?",
          timestamp: new Date(),
        }]);
        return;
      }

      setMessages([{
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
      }]);
      if (typeof data.completionPercentage === 'number') {
        setProfileCompletion(data.completionPercentage);
      }
    } catch (e) {
      console.error('Init error:', e);
      setMessages([{
        role: 'assistant',
        content: "Hello! I'm Diana, your personal matchmaking assistant.",
        timestamp: new Date(),
      }]);
    }
  };
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const extractOptions = (text: string): string[] => {
    const optionMatch = text.match(/\(([^)]+)\)/);
    if (!optionMatch) return [];
    
    return optionMatch[1]
      .split('/')
      .map(opt => opt.trim())
      .filter(opt => opt.length > 0);
  };

  const handleQuickReply = (option: string) => {
    setInput(option);
    // Trigger form submission programmatically
    const form = document.querySelector('form');
    if (form) {
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageToSend = input;
    setInput("");
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to continue");
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke('chat-with-diana', {
        body: {
          message: messageToSend,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          userId: session.user.id
        }
      });

      if (error) {
        console.error('Error calling chat function:', error);
        toast.error("Failed to send message. Please try again.");
        setLoading(false);
        return;
      }

      const aiResponse: Message = {
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, aiResponse]);
      setProfileCompletion(data.completionPercentage);

      if (data.completionPercentage >= 50 && data.completionPercentage < 100) {
        toast.success("You can now access your dashboard! Continue chatting for better matches.");
      } else if (data.completionPercentage === 100) {
        toast.success("Profile complete! You'll get the best possible matches now.");
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const goToDashboard = () => {
    if (profileCompletion >= 50) {
      navigate("/dashboard");
    } else {
      toast.error("Please complete at least 50% of your profile first");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Card className="mb-4 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Chat with Diana</h1>
                <p className="text-sm text-muted-foreground">Your AI matchmaking assistant</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToDashboard}
                disabled={profileCompletion < 50}
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Profile Completion</span>
              <span className="font-semibold">{profileCompletion}%</span>
            </div>
            <Progress value={profileCompletion} className="h-2" />
            {profileCompletion >= 50 && profileCompletion < 100 && (
              <p className="text-xs text-muted-foreground">
                Great progress! You can now access your dashboard, but completing 100% gives you better matches.
              </p>
            )}
          </div>
        </Card>

        {/* Chat Messages */}
        <Card className="h-[calc(100vh-280px)] flex flex-col">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message, index) => {
                const options = message.role === 'assistant' && index === messages.length - 1 
                  ? extractOptions(message.content) 
                  : [];

                return (
                  <div key={index} className="space-y-2">
                    <div
                      className={`flex gap-3 ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <Avatar className="h-8 w-8 border-2 border-primary/20">
                          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xs">
                            D
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                          message.role === "user"
                            ? "bg-gradient-to-br from-primary to-secondary text-white"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>

                    {/* Quick reply buttons */}
                    {options.length > 0 && !loading && (
                      <div className="flex flex-wrap gap-2 pl-11">
                        {options.map((option, optIndex) => (
                          <Button
                            key={optIndex}
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickReply(option)}
                            className="rounded-full hover:bg-primary hover:text-white transition-colors"
                          >
                            {option}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {loading && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 border-2 border-primary/20">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xs">
                      D
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-2xl px-4 py-3 bg-muted">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" />
                      <div className="h-2 w-2 rounded-full bg-primary/60 animate-bounce delay-100" />
                      <div className="h-2 w-2 rounded-full bg-primary/60 animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={loading}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Chat;
