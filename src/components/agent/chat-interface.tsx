"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ProductVisual } from "@/components/product-visual";
import { formatPrice } from "@/lib/format";
import { categoryLabels } from "@/types/product";
import type {
  AgentBuild,
  AgentCompatibility,
  AgentIntent,
  AgentProductView,
} from "@/lib/agent";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  intent?: AgentIntent;
  products?: AgentProductView[];
  build?: AgentBuild | null;
  compatibility?: AgentCompatibility | null;
};

type AgentResponse = {
  reply?: string;
  error?: string;
  intent?: AgentIntent;
  products?: AgentProductView[];
  build?: AgentBuild | null;
  compatibility?: AgentCompatibility | null;
};

type Props = {
  suggestedQuestions: string[];
};

function plainText(value: string): string {
  return value
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "• ")
    .trim();
}

function ProductMiniCard({ product }: { product: AgentProductView }) {
  return (
    <Link
      href={`/catalog/${product.slug}`}
      className="grid grid-cols-[72px_1fr] gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-2 transition-colors hover:border-red-600/60"
    >
      <ProductVisual
        category={product.categoryType}
        slug={product.slug}
        imageUrl={product.imageUrl}
        alt={product.name}
        size="thumbnail"
        className="h-[72px]"
      />
      <div className="min-w-0 py-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-red-400">
          {categoryLabels[product.categoryType]}
        </p>
        <p className="mt-1 line-clamp-2 text-sm font-medium text-zinc-100">
          {product.name}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-zinc-100">
            {formatPrice(product.price)}
          </span>
          <span className={product.stock > 0 ? "text-[10px] text-emerald-400" : "text-[10px] text-zinc-500"}>
            {product.stock > 0 ? "În stoc" : "Stoc epuizat"}
          </span>
        </div>
      </div>
    </Link>
  );
}

function BuildCard({ build }: { build: AgentBuild }) {
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Configurație recomandată
          </p>
          <p className="mt-1 text-lg font-bold text-zinc-100">
            {formatPrice(build.totalPrice)}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
          build.compatibility.isValid
            ? "bg-emerald-500/10 text-emerald-400"
            : "bg-red-500/10 text-red-400"
        }`}>
          {build.compatibility.isValid ? "Compatibilă CSP" : "Necesită verificare"}
        </span>
      </div>
      <div className="divide-y divide-zinc-800">
        {build.products.map((product) => (
          <Link
            key={product.id}
            href={`/catalog/${product.slug}`}
            className="grid grid-cols-[92px_1fr_auto] items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-zinc-800/60"
          >
            <span className="text-xs text-zinc-500">
              {categoryLabels[product.categoryType]}
            </span>
            <span className="min-w-0 truncate text-zinc-200">{product.name}</span>
            <span className="font-medium text-zinc-100">{formatPrice(product.price)}</span>
          </Link>
        ))}
      </div>
      {build.totalPower !== null && (
        <p className="border-t border-zinc-800 px-4 py-2 text-xs text-zinc-500">
          Consum estimat: {build.totalPower} W · produse în stoc: {build.usesOnlyInStockProducts ? "da" : "parțial"}
        </p>
      )}
    </div>
  );
}

export function ChatInterface({ suggestedQuestions }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(rawText: string) {
    const text = rawText.trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    const previousMessages = messages;
    setMessages([...previousMessages, userMessage]);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const history = previousMessages.slice(-12).map((message) => ({
        role: message.role,
        content: message.content.slice(0, 1_000),
      }));
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const data = (await response.json()) as AgentResponse;
      if (!response.ok || !data.reply) {
        throw new Error(data.error ?? "Eroare necunoscută.");
      }
      setMessages([
        ...previousMessages,
        userMessage,
        {
          role: "assistant",
          content: plainText(data.reply),
          intent: data.intent,
          products: data.products,
          build: data.build,
          compatibility: data.compatibility,
        },
      ]);
    } catch (requestError) {
      setMessages(previousMessages);
      setInput(text);
      setError(requestError instanceof Error ? requestError.message : "Eroare de rețea.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <div className="flex min-h-[680px] flex-1 overflow-hidden">
      <aside className="hidden w-72 shrink-0 border-r border-zinc-800 bg-zinc-900/50 p-5 lg:block">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Întrebări sugerate
        </h2>
        <ul className="mt-4 space-y-2">
          {suggestedQuestions.map((question) => (
            <li key={question}>
              <button
                type="button"
                onClick={() => void sendMessage(question)}
                disabled={loading}
                className="block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-left text-sm text-zinc-300 transition-colors hover:border-red-600/40 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {question}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs font-semibold text-zinc-400">Despre agent</p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            Produsele provin din catalog, iar build-urile sunt calculate prin scoring și validate de motorul CSP înainte de răspuns.
          </p>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="border-b border-zinc-800 px-4 py-4 sm:px-6">
          <h1 className="text-xl font-bold tracking-tight">
            Agent <span className="text-red-600">AI</span>
          </h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            Recomandări din catalog, cu scoring și verificare CSP.
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {messages.length === 0 && (
            <div className="mx-auto mt-10 max-w-2xl text-center text-zinc-500">
              <p className="text-lg font-medium">Asistent PC Forge</p>
              <p className="mt-1 text-sm">
                Întreabă despre produse, compatibilitate sau o configurație completă.
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:hidden">
                {suggestedQuestions.slice(0, 4).map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => void sendMessage(question)}
                    className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-left text-xs text-zinc-300 hover:border-red-600/40"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={message.role === "user" ? "max-w-[85%] rounded-2xl rounded-br-sm bg-red-600 px-4 py-3 text-sm leading-relaxed text-white sm:max-w-[75%]" : "w-full max-w-3xl"}>
                {message.role === "user" ? (
                  message.content
                ) : (
                  <>
                    <div className="rounded-2xl rounded-bl-sm bg-zinc-800 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-zinc-100">
                      {message.content}
                    </div>
                    {message.build ? (
                      <BuildCard build={message.build} />
                    ) : message.products && message.products.length > 0 ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {message.products.map((product) => (
                          <ProductMiniCard key={product.id} product={product} />
                        ))}
                      </div>
                    ) : null}
                    {message.compatibility && !message.build && (
                      <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
                        message.compatibility.isValid
                          ? "border-emerald-900 bg-emerald-950/30 text-emerald-300"
                          : "border-red-900 bg-red-950/30 text-red-300"
                      }`}>
                        Rezultat CSP: {message.compatibility.isValid ? "componente compatibile" : "incompatibilitate detectată"}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-zinc-800 px-4 py-3">
                <span className="flex gap-1">
                  {[0, 150, 300].map((delay) => (
                    <span key={delay} className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: `${delay}ms` }} />
                  ))}
                </span>
              </div>
            </div>
          )}
          {error && <div className="text-center text-sm text-red-400">{error}</div>}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSubmit} className="flex gap-3 border-t border-zinc-800 p-4">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            maxLength={800}
            placeholder="Scrie o întrebare despre componente..."
            disabled={loading}
            className="min-w-0 flex-1 rounded-xl bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-red-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Trimite
          </button>
        </form>
      </main>
    </div>
  );
}
