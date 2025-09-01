import { useEffect, useRef, useState } from "react";

interface Message {
    who: "you" | "them";
    text: string;
}

export default function Chat(): JSX.Element {
    const css = `
  /* === Scoped styles inside component === */
  .baylike {
    --bg:#0f141a; --panel:#141b22; --panel-2:#0b1117; --accent:#2f81f7; --accent-2:#1e5fd6;
    --text:#e6edf3; --muted:#9aa7b4; --you:#1e2a38; --them:#1f2f1f; --border:#22303c;
    --shadow:0 10px 30px rgba(0,0,0,.35); --radius:16px;
    height:100%; width:100%; background:linear-gradient(180deg,#0b1117,#0e151c 40%,#0b1117);
    color:var(--text); font:16px/1.4 system-ui,-apple-system,Segoe UI,Roboto,Inter,"Helvetica Neue",Arial;
    display:flex; flex-direction:column;
  }
  .baylike *, .baylike *::before, .baylike *::after{ box-sizing:border-box }

  .baylike-header{ position:sticky; top:0; z-index:10; background:var(--panel); border-bottom:1px solid var(--border);
    padding:10px env(safe-area-inset-right) 10px env(safe-area-inset-left); }
  .baylike .nav{ display:flex; align-items:center; gap:12px; max-width:900px; margin:0 auto; padding:0 8px; }
  .baylike .logo-badge{ width:28px; height:28px; border-radius:8px; background:linear-gradient(135deg,var(--accent),var(--accent-2)); display:grid; place-items:center; color:#fff; font-weight:900; box-shadow:var(--shadow) }
  .baylike .brand{ font-weight:800; letter-spacing:.2px }
  .baylike .muted{ color:var(--muted) }

  .baylike .shell{ max-width:900px; margin:0 auto; padding:0 env(safe-area-inset-right) 0 env(safe-area-inset-left); flex:1; display:flex; width:100%; }
  .baylike .card{ background:var(--panel); border:1px solid var(--border); border-radius:var(--radius); box-shadow:var(--shadow); overflow:hidden; }

  .baylike .chat{ display:flex; flex-direction:column; flex:1; width:100%; }

  .baylike .chat-head{ padding:10px 14px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; background:linear-gradient(180deg,rgba(255,255,255,.02),transparent) }

  .baylike .chat-body{ flex:1; overflow:auto; padding:14px; display:flex; flex-direction:column; gap:10px; background:radial-gradient(1200px 400px at 20% -20%, rgba(47,129,247,.07), transparent 60%) }
  /* Hide scrollbars in chat and composer textarea */
  .baylike .chat-body{ -ms-overflow-style:none; scrollbar-width:none }
  .baylike .chat-body::-webkit-scrollbar{ display:none }

  .baylike .msg{ display:flex; gap:10px; max-width:84%; animation:pop .14s ease-out }
  @keyframes pop{ from{ transform:scale(.98); opacity:.7 } }
  .baylike .msg.you{ align-self:flex-end; flex-direction:row-reverse }
  .baylike .bubble{ padding:10px 12px; border:1px solid var(--border); border-radius:14px; box-shadow:var(--shadow); background:var(--you) }
  .baylike .you .bubble{ background:linear-gradient(180deg,#1a2635,#162130) }
  .baylike .them .bubble{ background:linear-gradient(180deg,#1a2a1a,#152315) }
  .baylike .meta{ font-size:12px; color:var(--muted); margin-top:4px }
  .baylike .avatar{ width:28px; height:28px; border-radius:50%; background:#22344a; display:grid; place-items:center; font-weight:700; font-size:12px; border:1px solid var(--border) }
  .baylike .them .avatar{ background:#2a3b2a }

  .baylike .typing{ display:flex; align-items:center; gap:8px; padding:8px 12px; width:max-content; border:1px dashed var(--border); border-radius:12px; color:var(--muted) }
  .baylike .dots{ display:inline-flex; gap:4px }
  .baylike .dots span{ width:6px; height:6px; border-radius:50%; background:currentColor; opacity:.35; animation:bounce 1.2s infinite ease-in-out }
  .baylike .dots span:nth-child(2){ animation-delay:.15s }
  .baylike .dots span:nth-child(3){ animation-delay:.3s }
  @keyframes bounce{ 0%,80%,100%{ transform:translateY(0); opacity:.35 } 40%{ transform:translateY(-4px); opacity:.9 } }

  .baylike .composer{ position:sticky; bottom:0; padding:10px env(safe-area-inset-right) calc(10px + env(safe-area-inset-bottom)) env(safe-area-inset-left); border-top:1px solid var(--border); display:flex; gap:10px; background:var(--panel) }
  .baylike .input{ flex:1; position:relative }
  .baylike textarea{ width:100%; background:#0c1218; color:var(--text); border:1px solid var(--border); padding:12px 56px 12px 12px; border-radius:12px; resize:none; min-height:52px; line-height:1.3; outline:none; font-size:16px; overflow:hidden; -ms-overflow-style:none; scrollbar-width:none }
  .baylike textarea::-webkit-scrollbar{ display:none }
  .baylike .send{ min-width:104px; border:none; background:var(--accent); color:#fff; font-weight:800; border-radius:12px; padding:14px 16px; box-shadow:var(--shadow); cursor:pointer; transition:.15s transform, .15s opacity; font-size:16px }
  .baylike .send:active{ transform:translateY(1px) }
  .baylike .send:disabled{ opacity:.6; cursor:default }
  `;

    const script: Message[] = [
        { who: "you", text: "Hey! Quick question about the W1‑SH — is its CPU 8088‑compatible? Would it run DOS?" },
        { who: "them", text: "I'm not sure, sorry. It was my dad's." },
        { who: "you", text: "Could you ask him?" },
        { who: "them", text: "I wish I could. He disappeared three years ago. We still don't know what happened. Sorry." },
        { who: "you", text: "Oh no… I'm really sorry. And the price is still $50?" },
        { who: "them", text: "Yeah — fifty. Basically the price of a Starbucks coffee these days." },
        { who: "you", text: "Alright, I'll take it." }
    ];

    const chatRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]); // keep track to clean up
    const idxRef = useRef<number>(0);

    const [messages, setMessages] = useState<Message[]>([]); // {who, text}[]
    const [composerText, setComposerText] = useState<string>("");
    const [awaitingSend, setAwaitingSend] = useState<boolean>(false);
    const [typing, setTyping] = useState<boolean>(false);
    const [done, setDone] = useState<boolean>(false);

    const scrollBottom = (): void => {
        const el = chatRef.current; if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    };

    useEffect(() => { scrollBottom(); }, [messages, typing]);
    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = '0px';
        el.style.height = `${el.scrollHeight}px`;
    }, [composerText]);

    useEffect(() => {
        nextStep();
        return () => {
            if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
            timeoutsRef.current.forEach(clearTimeout);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function schedule(fn: () => void, ms: number): ReturnType<typeof setTimeout> {
        const id = setTimeout(fn, ms);
        timeoutsRef.current.push(id);
        return id;
    }

    function typeIntoComposer(text: string): void {
        setComposerText("");
        setAwaitingSend(false);
        if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
        let i = 0;
        typingIntervalRef.current = setInterval(() => {
            const burst = Math.random() < 0.2 ? 2 : 1;
            let chunk = "";
            for (let b = 0; b < burst && i < text.length; b++, i++) chunk += text[i];
            setComposerText(prev => prev + chunk);
            if (i >= text.length) {
                clearInterval(typingIntervalRef.current!);
                typingIntervalRef.current = null;
                setAwaitingSend(true);
            }
        }, 18 + Math.floor(Math.random() * 12));
    }

    function nextStep(): void {
        if (idxRef.current >= script.length) {
            setDone(true);
            setAwaitingSend(false);
            setComposerText("");
            return;
        }
        const line = script[idxRef.current];
        if (line.who === "you") {
            typeIntoComposer(line.text);
        } else {
            const base = 500;
            const perChar = 28;
            const ms = Math.min(2500, base + perChar * Math.min(90, line.text.length));
            setTyping(true);
            schedule(() => {
                setTyping(false);
                setMessages(prev => [...prev, { who: "them", text: line.text }]);
                idxRef.current += 1;
                schedule(() => nextStep(), 280);
            }, ms);
        }
    }

    function onSend(): void {
        if (!awaitingSend || !composerText.trim()) return;
        setMessages(prev => [...prev, { who: "you", text: composerText.trim() }]);
        setComposerText("");
        setAwaitingSend(false);
        idxRef.current += 1;
        schedule(() => nextStep(), 360);
    }

    return (
        <div className="baylike" role="application" aria-label="BayLike chat simulator">
            <style>{css}</style>
            <div className="baylike-header">
                <div className="nav">
                    <div className="logo-badge">B</div>
                    <div className="brand">BayLike</div>
                    <div className="muted" style={{ marginLeft: "auto" }}>Secure • Buyer Protection</div>
                </div>
            </div>

            <main className="shell">
                <section className="card chat" aria-live="polite" aria-label="Chat with seller">
                    <div className="chat-head">
                        <div><strong>Messages</strong> <span className="muted">with Emilia • W1‑SH</span></div>
                        <div className="muted">Order: #7421</div>
                    </div>

                    <div ref={chatRef} className="chat-body" role="log" aria-label="Chat transcript">
                        {messages.map((m, i) => (
                            <div key={i} className={`msg ${m.who === 'you' ? 'you' : 'them'}`}>
                                <div className={`avatar ${m.who === 'you' ? '' : 'them'}`}>{m.who === 'you' ? 'YOU' : 'ES'}</div>
                                <div>
                                    <div className="bubble">{m.text}</div>
                                    <div className="meta">{m.who === 'you' ? 'You' : 'Emilia'}</div>
                                </div>
                            </div>
                        ))}

                        {typing && (
                            <div className="msg them" data-typing="1">
                                <div className="avatar them">ES</div>
                                <div className="typing"><span>Emilia is typing</span> <span className="dots"><span></span><span></span><span></span></span></div>
                            </div>
                        )}

                        {done && (
                            <div className="meta" style={{ alignSelf: 'center', margin: '8px auto 12px' }}>Conversation complete.</div>
                        )}
                    </div>

                    <div className="composer">
                        <div className="input">
                            <textarea ref={textareaRef} readOnly aria-label="Message composer (auto-typing)" value={composerText} />
                        </div>
                        <button className="send" onClick={onSend} disabled={!awaitingSend}>Send</button>
                    </div>
                </section>
            </main>
        </div>
    );
}
