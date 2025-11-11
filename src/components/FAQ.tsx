import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle, Heart, Shield, Sparkles, CheckCircle, AlertTriangle, Trash2, Globe } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface FAQProps {
  showHeader?: boolean;
  variant?: "default" | "compact";
}

export const FAQ = ({ showHeader = true, variant = "default" }: FAQProps) => {
  const { t } = useLanguage();

  const faqItems = [
    {
      id: "matching",
      icon: Heart,
      question: t.faq.matching.title,
      answer: t.faq.matching.answer,
    },
    {
      id: "privacy",
      icon: Shield,
      question: t.faq.privacy.title,
      answer: t.faq.privacy.answer,
    },
    {
      id: "ai",
      icon: Sparkles,
      question: t.faq.ai.title,
      answer: t.faq.ai.answer,
    },
    {
      id: "profile",
      icon: CheckCircle,
      question: t.faq.profile.title,
      answer: t.faq.profile.answer,
    },
    {
      id: "unlock",
      icon: Heart,
      question: t.faq.unlock.title,
      answer: t.faq.unlock.answer,
    },
    {
      id: "safety",
      icon: AlertTriangle,
      question: t.faq.safety.title,
      answer: t.faq.safety.answer,
    },
    {
      id: "delete",
      icon: Trash2,
      question: t.faq.delete.title,
      answer: t.faq.delete.answer,
    },
    {
      id: "language",
      icon: Globe,
      question: t.faq.language.title,
      answer: t.faq.language.answer,
    },
  ];

  if (variant === "compact") {
    return (
      <div className="space-y-3">
        {showHeader && (
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              {t.faq.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{t.faq.subtitle}</p>
          </div>
        )}
        <Accordion type="single" collapsible className="w-full">
          {faqItems.map((item) => {
            const Icon = item.icon;
            return (
              <AccordionItem key={item.id} value={item.id}>
                <AccordionTrigger className="text-left hover:no-underline">
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm">{item.question}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pl-6">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    );
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            {t.faq.title}
          </CardTitle>
          <CardDescription>{t.faq.subtitle}</CardDescription>
        </CardHeader>
      )}
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {faqItems.map((item) => {
            const Icon = item.icon;
            return (
              <AccordionItem key={item.id} value={item.id}>
                <AccordionTrigger className="text-left">
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                    {item.question}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
};
