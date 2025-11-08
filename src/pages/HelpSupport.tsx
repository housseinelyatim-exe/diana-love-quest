import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, HelpCircle, MessageSquare, Mail, Shield, Heart } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, { message: "Name is required" }).max(100),
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  message: z.string().trim().min(10, { message: "Message must be at least 10 characters" }).max(1000),
});

const HelpSupport = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate input
      const validatedData = contactSchema.parse({ name, email, message });
      
      // Here you would typically send to your support system
      toast.success("Message sent! We'll get back to you soon.");
      setName("");
      setEmail("");
      setMessage("");
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
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
        <h1 className="text-xl font-semibold">Help & Support</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => toast.info("Chat support coming soon")}>
            <CardContent className="pt-6 text-center">
              <MessageSquare className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="font-medium text-sm">Chat Support</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}>
            <CardContent className="pt-6 text-center">
              <Mail className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="font-medium text-sm">Email Us</p>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              Frequently Asked Questions
            </CardTitle>
            <CardDescription>Find answers to common questions</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-left">
                  <span className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-primary" />
                    How does the matching algorithm work?
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Our AI-powered matching algorithm analyzes your profile, preferences, and values to find compatible matches. Diana learns from your interactions to suggest better matches over time.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger className="text-left">
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Is my data safe and secure?
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Yes! We use industry-standard encryption and security measures to protect your data. Your profile is only visible to matches, and you have full control over your privacy settings.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="text-left">
                  How do I complete my profile?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Chat with Diana on the Chats tab! She'll guide you through completing your profile by asking relevant questions about your preferences, lifestyle, and what you're looking for in a partner.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger className="text-left">
                  What should I do if I encounter a problem?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  You can report issues through the contact form below, use the chat support, or email us directly. We typically respond within 24 hours.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger className="text-left">
                  Can I pause or delete my account?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Yes! You can hide your profile in Privacy Settings to temporarily pause your account. To permanently delete your account, contact our support team through the form below.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger className="text-left">
                  How do I report inappropriate behavior?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  If you encounter inappropriate behavior, please use the contact form below to report it immediately. Include as many details as possible, and we'll investigate promptly.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Contact Form */}
        <Card id="contact-form">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Contact Us
            </CardTitle>
            <CardDescription>Send us a message and we'll get back to you</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="How can we help you?"
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className={errors.message ? "border-destructive" : ""}
                />
                {errors.message && (
                  <p className="text-sm text-destructive">{errors.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {message.length}/1000 characters
                </p>
              </div>

              <Button type="submit" className="w-full">
                Send Message
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Additional Resources */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Additional Resources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => toast.info("Documentation coming soon")}
            >
              📖 User Guide
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => toast.info("Community coming soon")}
            >
              👥 Community Forum
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => toast.info("Blog coming soon")}
            >
              ✍️ Dating Tips Blog
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HelpSupport;
