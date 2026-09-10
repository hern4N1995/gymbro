import React, { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { Dumbbell } from "lucide-react";
import supabase from "../../supabaseClient";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  React.useEffect(() => {
    if (!open) {
      setIsVisible(false);
      return;
    }

    const frame = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const functionsHost = supabaseUrl ? supabaseUrl.replace(".supabase.co", ".functions.supabase.co") : null;
  const aiChatUrl = import.meta.env.DEV ? "/ai-chat" : (functionsHost ? `${functionsHost}/ai-chat` : "/ai-chat");

  async function sendMessage(text) {
    if (!text) return;
    setError(null);
    setLoading(true);

    const userMsg = { role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");

    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) throw new Error("No session token — inicia sesión primero.");

      const res = await fetch(aiChatUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text }),
      });

      if (res.status === 429) {
        const quotaMessage = "Se agotó tu cuota diaria de consultas. Volvé mañana para seguir preguntando.";
        setError(quotaMessage);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const aiErrorMessage = body?.error || "La IA no pudo responder en este momento. Intentá nuevamente más tarde.";
        throw new Error(aiErrorMessage);
      }

      const { reply } = await res.json();
      const assistantMsg = { role: "assistant", text: reply };
      setMessages((m) => [...m, assistantMsg]);
    } catch (err) {
      console.error("chat error", err);
      const message = err?.message || "La IA no pudo responder en este momento. Intentá nuevamente más tarde.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input.trim());
  }

  return (
    <>
      {!open && (
        <button
          aria-label="Abrir chat"
          onClick={() => setOpen(true)}
          className="fixed right-4 bottom-10 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/70 bg-[#111214]/95 text-amber-400 shadow-[0_1px_15px_rgba(245,158,11,0.28),0_0_22px_rgba(245,158,11,0.18)] backdrop-blur-sm transition duration-200 hover:border-amber-400 hover:bg-[#171A1D] hover:text-amber-300"
        >
          <Dumbbell size={22} strokeWidth={2.2} className="-rotate-[0deg]" />
        </button>
      )}

      {open && (
        <div
          className={`fixed inset-0 z-40 flex items-end justify-center transition-opacity duration-200 ease-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-200 ease-out" onClick={() => setOpen(false)} />

          <div
            className={`relative w-full max-w-xl rounded-t-[1.75rem] border border-neutral-800 bg-[#111214] p-4 shadow-[0_-20px_50px_rgba(0,0,0,0.6)] transition-all duration-200 ease-out ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}`}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-500/50 bg-amber-500/10 text-amber-300">
                  <Dumbbell size={18} strokeWidth={2.2} className="-rotate-[0deg]" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300">GymBro</p>
                  <h3 className="text-base font-bold text-white">Asistente IA</h3>
                </div>
              </div>
              <button className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-neutral-300 transition hover:bg-neutral-800 hover:text-white" onClick={() => setOpen(false)}>
                Cerrar
              </button>
            </div>

            <div className="mt-3 h-72 overflow-y-auto rounded-2xl border border-neutral-800 bg-[#171A1D] p-3">
              {messages.length === 0 && <p className="text-sm text-neutral-400">Escribe algo para comenzar.</p>}
              {messages.map((m, i) => (
                <div key={i} className={`my-2 max-w-[92%] ${m.role === "user" ? "ml-auto text-right" : "mr-auto text-left"}`}>
                  <div className={`${m.role === "user" ? "bg-amber-500 text-black" : "border border-neutral-700 bg-[#1B1D21] text-neutral-100"} inline-block max-w-full rounded-2xl px-3 py-2 text-sm leading-6 shadow-sm`}>
                    {m.role === "assistant" ? (
                      <div className="chat-markdown max-w-none break-words text-left text-sm text-neutral-100">
                        <ReactMarkdown
                          remarkPlugins={[remarkBreaks]}
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0 leading-6 text-neutral-100">{children}</p>,
                            strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                            h1: ({ children }) => <h1 className="mb-2 mt-0 text-base font-bold text-white">{children}</h1>,
                            h2: ({ children }) => <h2 className="mb-2 mt-0 text-sm font-bold text-white">{children}</h2>,
                            h3: ({ children }) => <h3 className="mb-2 mt-0 text-sm font-semibold text-white">{children}</h3>,
                            ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 text-neutral-100">{children}</ul>,
                            ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 text-neutral-100">{children}</ol>,
                            li: ({ children }) => <li className="pl-1 leading-6">{children}</li>,
                            a: ({ href, children }) => (
                              <a href={href} target="_blank" rel="noreferrer" className="text-amber-300 underline underline-offset-2">{children}</a>
                            ),
                            code: ({ children }) => <code className="rounded bg-neutral-800 px-1 py-0.5 text-amber-200">{children}</code>,
                            pre: ({ children }) => <pre className="mb-2 overflow-x-auto rounded-md bg-neutral-900 p-2 text-xs text-amber-100">{children}</pre>,
                          }}
                        >
                          {m.text}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <span className="block whitespace-pre-wrap break-words">{m.text}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {error && <div className="mt-2 text-sm text-red-400">{error}</div>}

            <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu pregunta sobre gym o nutrición..."
                className="flex-1 min-h-[44px] rounded-xl border border-neutral-700 bg-[#1A1C1F] px-3 py-2 text-sm text-white placeholder:text-neutral-500"
                disabled={loading}
              />
              <button type="submit" className="min-h-[44px] rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-70" disabled={loading}>
                {loading ? "..." : "Enviar"}
              </button>
            </form>

            <div className="mt-2 text-[11px] text-neutral-500">Respuestas orientadas a gym y nutrición. No es consejo médico.</div>
          </div>
        </div>
      )}
    </>
  );
}
