import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Send, ArrowLeft, Sparkles, ChevronDown } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { ImageViewer } from "@/components/ImageViewer";
import { QuestionProgressTracker } from "@/components/QuestionProgressTracker";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { retryWithBackoff } from "@/lib/retryWithBackoff";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const Chat = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [currentCategory, setCurrentCategory] = useState("basics");
  const [completedCategories, setCompletedCategories] = useState<string[]>([]);
  const [categoryProgress, setCategoryProgress] = useState<Record<string, { completed: number; total: number; percentage: number }>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const hasShown50Toast = useRef(false);
  const hasShown100Toast = useRef(false);
  const lastMessageTime = useRef<number>(0);
  const [isThrottled, setIsThrottled] = useState(false);
  const [showProgressTracker, setShowProgressTracker] = useState(false);

  useEffect(() => {
    checkAuth();
    initializeChat();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const updateVisibility = () => {
      const viewport = viewportRef.current;
      let isAtBottom = true;
      if (viewport) {
        isAtBottom = viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 100;
      } else {
        isAtBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 100;
      }
      setShowScrollButton(!isAtBottom && messages.length > 1);
    };

    // Attach listeners
    const viewport = viewportRef.current;
    viewport?.addEventListener('scroll', updateVisibility);
    window.addEventListener('scroll', updateVisibility);

    // Initial computation
    updateVisibility();

    return () => {
      viewport?.removeEventListener('scroll', updateVisibility);
      window.removeEventListener('scroll', updateVisibility);
    };
  }, [messages.length]);

  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        toast.error("Authentication error. Please log in again.");
        navigate("/auth");
        return;
      }
      if (!session) {
        navigate("/auth");
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      toast.error("Connection error. Please check your internet and try again.");
      navigate("/auth");
    }
  };

  const initializeChat = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        toast.error("Failed to verify session. Please log in again.");
        navigate("/auth");
        return;
      }
      if (!session) return; // checkAuth will redirect

      // Sync language from localStorage to profile and load avatar
      const savedLanguage = localStorage.getItem('preferredLanguage') || localStorage.getItem('language');
      if (savedLanguage && ['en', 'fr', 'ar', 'tn'].includes(savedLanguage)) {
        const { data: currentProfile, error: profileError } = await supabase
          .from('profiles')
          .select('language, avatar_url')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          toast.error("Failed to load profile. Some features may not work.");
        }

        if (currentProfile) {
          if (currentProfile.language !== savedLanguage) {
            await supabase
              .from('profiles')
              .update({ language: savedLanguage as 'en' | 'fr' | 'ar' | 'tn' })
              .eq('id', session.user.id);
          }
          if (currentProfile.avatar_url) {
            setAvatarUrl(currentProfile.avatar_url);
          }
        }
      }

      // Load previous messages
      const { data: prevMessages, error: messagesError } = await supabase
        .from('messages')
        .select('content, is_from_diana, created_at')
        .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Messages fetch error:', messagesError);
        toast.error("Failed to load previous messages.");
      }

      if (prevMessages && prevMessages.length > 0) {
        const loadedMessages: Message[] = prevMessages.map(msg => ({
          role: msg.is_from_diana ? 'assistant' : 'user',
          content: msg.content,
          timestamp: new Date(msg.created_at || Date.now()),
        }));
        setMessages(loadedMessages);
      } else {
        // Initial greeting
        setMessages([{
          role: 'assistant',
          content: "Hello! I'm Diana, your personal matchmaking assistant. Let's build your profile together! 💕",
          timestamp: new Date(),
        }]);
      }

      // Get profile completion
      const { data, error: completionError } = await supabase.functions.invoke('chat-with-diana', {
        body: {
          message: '',
          conversationHistory: [],
          userId: session.user.id
        }
      });

      if (completionError) {
        console.error('Profile completion fetch error:', completionError);
        toast.error("Failed to load profile completion status.");
      } else if (data) {
        if (data.profileCompletion !== undefined) {
          setProfileCompletion(data.profileCompletion);
        }
        if (data.currentCategory) {
          setCurrentCategory(data.currentCategory);
        }
        if (data.completedCategories) {
          setCompletedCategories(data.completedCategories);
        }
        if (data.categoryProgress) {
          setCategoryProgress(data.categoryProgress);
        }
      }
    } catch (e: any) {
      console.error('Init error:', e);
      
      // Check for specific error types
      if (e.message?.includes('Failed to fetch') || e.message?.includes('NetworkError')) {
        toast.error("Network error. Please check your connection and refresh the page.");
      } else if (e.message?.includes('timeout')) {
        toast.error("Connection timeout. Please try again.");
      } else {
        toast.error("Failed to initialize chat. Please refresh the page.");
      }
      
      // Fallback greeting
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
      setShowScrollButton(false);
    }
  };

  const extractOptions = (text: string): string[] => {
    const optionMatch = text.match(/\(([^)]+)\)/);
    if (!optionMatch) return [];
    
    const content = optionMatch[1];
    
    // Only extract as options if there are slashes (multiple choices)
    if (!content.includes('/')) return [];
    
    return content
      .split('/')
      .map(opt => opt.trim())
      .filter(opt => opt.length > 0 && opt.length < 50); // Reasonable option length
  };

  const handleQuickReply = (option: string) => {
    setInput(option);
    // Defer submit to ensure state updates and avoid race conditions
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    }, 0);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    // Throttle: enforce 2 second delay between messages
    const now = Date.now();
    const timeSinceLastMessage = now - lastMessageTime.current;
    const THROTTLE_MS = 2000;

    if (timeSinceLastMessage < THROTTLE_MS) {
      const remainingTime = Math.ceil((THROTTLE_MS - timeSinceLastMessage) / 1000);
      toast.error(`Please wait ${remainingTime} second${remainingTime > 1 ? 's' : ''} before sending another message.`);
      setIsThrottled(true);
      setTimeout(() => setIsThrottled(false), THROTTLE_MS - timeSinceLastMessage);
      return;
    }

    lastMessageTime.current = now;

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
      // Check authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        toast.error("Session expired. Please log in again.");
        navigate("/auth");
        return;
      }
      
      if (!session) {
        toast.error("Please log in to continue");
        navigate("/auth");
        return;
      }

      // Retry logic for sending message to edge function
      await retryWithBackoff(async () => {
        // Call edge function with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        try {
          const { data, error } = await supabase.functions.invoke('chat-with-diana', {
            body: {
              message: messageToSend,
              conversationHistory: [...messages, userMessage].map(m => ({
                role: m.role,
                content: m.content
              })),
              userId: session.user.id
            },
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (error) {
            console.error('Error calling chat function:', error);
            
            // Handle specific error types
            if (error.message?.includes('FunctionsRelayError') || error.message?.includes('Failed to fetch')) {
              throw new Error("Network error. Please check your connection.");
            } else if (error.message?.includes('FunctionsHttpError')) {
              throw new Error("Server error occurred. Please try again.");
            } else if (error.message?.includes('timeout') || error.message?.includes('aborted')) {
              throw new Error("Request timeout. Please try again.");
            } else if (error.message?.includes('429')) {
              throw new Error("Too many requests. Please wait a moment.");
            } else {
              throw new Error("Failed to send message.");
            }
          }

          // Validate response
          if (!data || !data.response) {
            console.error('Invalid response from chat function:', data);
            throw new Error("Received invalid response.");
          }

          const aiResponse: Message = {
            role: "assistant",
            content: data.response,
            timestamp: new Date(),
          };
          
          setMessages((prev) => [...prev, aiResponse]);
          
          // Update profile completion with validation
          if (typeof data.profileCompletion === 'number') {
            setProfileCompletion(data.profileCompletion);
          }
          
          if (data.currentCategory) {
            setCurrentCategory(data.currentCategory);
          }
          
          if (data.completedCategories) {
            setCompletedCategories(data.completedCategories);
          }
          
          if (data.categoryProgress) {
            setCategoryProgress(data.categoryProgress);
          }
        } catch (innerError) {
          clearTimeout(timeoutId);
          throw innerError;
        }
      }, { maxRetries: 2, initialDelay: 2000, maxDelay: 8000 });

      // Show progress toasts
      if (profileCompletion >= 50 && profileCompletion < 100 && !hasShown50Toast.current) {
        toast.success(t.chat.greatProgress);
        hasShown50Toast.current = true;
      } else if (profileCompletion === 100 && !hasShown100Toast.current) {
        toast.success("Profile complete! You'll get the best possible matches now.");
        hasShown100Toast.current = true;
      }
    } catch (error: any) {
      console.error('Error after retries:', error);
      
      // Show user-friendly error message
      toast.error(error.message || "Failed to send message after multiple attempts. Please try again.");
      
      // Remove the user message if it failed
      setMessages((prev) => prev.filter(m => m !== userMessage));
      setInput(messageToSend); // Restore the input
    } finally {
      setLoading(false);
    }
  };

  const goToDashboard = () => {
    if (profileCompletion >= 50) {
      navigate("/dashboard");
    } else {
      toast.error(t.chat.dashboardError);
    }
  };

  return (
    <div className="min-h-screen bg-[#e5ddd5] flex flex-col max-w-full">
      {/* WhatsApp-style Header */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-[hsl(var(--primary))] text-white px-4 py-3 shadow-md flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard", { state: { tab: "chats" } })}
          className="text-white hover:bg-white/10 -ml-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-10 w-10">
          <div className="bg-gradient-to-br from-pink-400 to-purple-500 w-full h-full flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
        </Avatar>
        <div className="flex-1">
          <h1 className="font-semibold">Diana</h1>
          <div className="flex items-center gap-2">
            <div className="flex-1 max-w-[140px]">
              <Progress 
                value={profileCompletion} 
                className="h-2 bg-white/20 rounded-full overflow-hidden shadow-inner" 
              />
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/20">
              <Sparkles className="h-3 w-3 text-white/90 animate-pulse" />
              <span className="text-xs font-semibold text-white">{profileCompletion}%</span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowProgressTracker(true)}
          className="hover:bg-white/20 text-white text-xs h-8 px-3 whitespace-nowrap"
        >
          Progress
        </Button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-hidden">
        <div 
          ref={viewportRef}
          className="h-full overflow-y-auto px-3 pt-4 mt-[57px]"
        >
          <div className="space-y-3 max-w-full">
          {messages.map((message, index) => {
            const options = message.role === 'assistant' && index === messages.length - 1 
              ? extractOptions(message.content) 
              : [];

            return (
              <div key={index} className="space-y-2 animate-fade-in">
                <div
                  className={`flex gap-2 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xs">
                        D
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`rounded-lg px-3 py-2 max-w-[75%] shadow-sm ${
                      message.role === "user"
                        ? "bg-[#dcf8c6] text-gray-900"
                        : "bg-white text-gray-900"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <span className="text-[10px] text-gray-500 float-right mt-1">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Quick reply buttons */}
                {options.length > 0 && !loading && (
                  <div className="flex flex-wrap gap-2 ml-10">
                    {options.map((option, optIndex) => (
                      <Button
                        key={optIndex}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickReply(option)}
                        className="rounded-full text-xs bg-white hover:bg-primary/10 border-primary/30"
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
            <div className="flex gap-2">
              <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xs">
                  D
                </AvatarFallback>
              </Avatar>
              <div className="rounded-lg px-3 py-2 bg-white shadow-sm">
                <div className="flex gap-1">
                  <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" />
                  <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          )}
            <div ref={scrollRef} />
          </div>
        </div>
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <Button
          onClick={scrollToBottom}
          size="icon"
          className="fixed bottom-20 right-6 rounded-full shadow-lg z-20 animate-scale-in"
        >
          <ChevronDown className="h-5 w-5" />
        </Button>
      )}

      {/* Input */}
      <div className="bg-[#f0f0f0] px-3 py-2 border-t">
        <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.chat.typePlaceholder}
            disabled={loading}
            className="flex-1 bg-white border-0 rounded-full shadow-sm"
          />
          <Button
            type="submit"
            disabled={loading || !input.trim() || isThrottled}
            size="icon"
            className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 rounded-full h-10 w-10 flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {viewingImage && (
        <ImageViewer 
          imageUrl={viewingImage} 
          onClose={() => setViewingImage(null)} 
        />
      )}

      <Sheet open={showProgressTracker} onOpenChange={setShowProgressTracker}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 overflow-hidden">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle>Question Progress Tracker</SheetTitle>
          </SheetHeader>
          <div className="p-6 overflow-y-auto h-[calc(100vh-80px)]">
            <QuestionProgressTracker />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Chat;
