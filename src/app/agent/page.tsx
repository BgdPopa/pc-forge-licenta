import { ChatInterface } from "@/components/agent/chat-interface";

export const metadata = {
  title: "Agent AI — PC Forge",
  description:
    "Asistent AI pentru recomandări de componente PC bazate pe catalogul PC Forge.",
};

export default function AgentPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col" style={{ height: "calc(100vh - 73px)" }}>
      <div className="border-b border-zinc-800 px-6 py-4">
        <h1 className="text-xl font-bold tracking-tight">
          Agent <span className="text-red-600">AI</span>
        </h1>
        <p className="mt-0.5 text-sm text-zinc-400">
          Recomandări personalizate din catalogul PC Forge, alimentate de Claude AI.
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <ChatInterface />
      </div>
    </main>
  );
}
