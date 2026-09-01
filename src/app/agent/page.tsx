import { ChatInterface } from "@/components/agent/chat-interface";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Agent AI — PC Forge",
  description:
    "Asistent AI pentru recomandări de componente PC bazate pe catalogul PC Forge.",
};

const suggestedQuestions = [
  "Ce procesoare AMD aveți în stoc?",
  "Recomandă o configurație gaming sub 3.000 RON",
  "Care este diferența dintre DDR4 și DDR5?",
  "Ce sursă de alimentare îmi trebuie pentru RTX 4060?",
  "Care sunt cele mai bune plăci video pentru 4K?",
  "Recomandă un procesor Intel pentru workstation",
];

export default function AgentPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <SiteHeader />
      <ChatInterface suggestedQuestions={suggestedQuestions} />
      <SiteFooter />
    </div>
  );
}
