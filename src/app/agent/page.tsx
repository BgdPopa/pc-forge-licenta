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

      <div className="flex flex-1 overflow-hidden">
        {/* Panel stânga — întrebări sugerate */}
        <aside className="hidden w-72 shrink-0 border-r border-zinc-800 bg-zinc-900/50 p-5 lg:block">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Întrebări sugerate
          </h2>
          <ul className="mt-4 space-y-2">
            {suggestedQuestions.map((q) => (
              <li key={q}>
                <span className="block cursor-default rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-300 transition-colors hover:border-red-600/40 hover:bg-zinc-800">
                  {q}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs font-semibold text-zinc-400">Despre agent</p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              Agentul folosește catalogul PC Forge ca bază de cunoștințe și este alimentat de Gemini AI. Răspunsurile sunt ancorate în produsele și stocul actual.
            </p>
          </div>
        </aside>

        {/* Chat principal */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b border-zinc-800 px-6 py-4">
            <h1 className="text-xl font-bold tracking-tight">
              Agent <span className="text-red-600">AI</span>
            </h1>
            <p className="mt-0.5 text-sm text-zinc-400">
              Recomandări personalizate din catalogul PC Forge, alimentate de Gemini AI.
            </p>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatInterface />
          </div>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
