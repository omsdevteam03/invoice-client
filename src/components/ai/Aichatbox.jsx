import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// Reusable AI chat box, backed by the server.
//
// Props:
//   chatId          - id of the currently open chat, or null for a fresh/unsaved chat
//   greeting        - shown only when there's no chatId yet (nothing saved)
//   onChatCreated(chat) - called once the very first message creates a chat row in the backend
//   onChatUpdated(chat) - called after any message exchange (e.g. to bump it to the top of the sidebar / update title)

const API_BASE = `${import.meta.env.VITE_API_URL}/chat`;

// Change these to restyle everything (e.g. green: "#10b981" family)
const THEME = {
  pageBg: "linear-gradient(180deg, #f3fbf7 0%, #e3f4ec 100%)",
  solidBg: "#eaf6f0",
  userBubble: "linear-gradient(135deg, #34a98a 0%, #1f7a63 100%)",
  accent: "#1f7a63",
  orb: "radial-gradient(circle at 30% 28%, #ffffff 0%, #bbf7d0 28%, #6ee7b7 62%, #14b8a6 100%)",
  shadow: "rgba(31, 122, 99, 0.12)",
  shadowStrong: "rgba(31, 122, 99, 0.28)",
};

const Svg = ({ children, size = 16, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const CopyIcon = () => (<Svg><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></Svg>);
const ThumbIcon = ({ filled }) => (<Svg fill={filled ? "currentColor" : "none"}><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /></Svg>);
const SpeakerIcon = () => (<Svg><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></Svg>);
const RefreshIcon = () => (<Svg><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></Svg>);
const ClipIcon = () => (<Svg size={18}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></Svg>);
const MicIcon = () => (<Svg size={18}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /></Svg>);
const SendIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}>
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);
const CameraIcon = () => (<Svg size={18}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></Svg>);
// Dictation languages
const VOICE_LANGUAGES = [
  { code: "ta-IN", label: "தமிழ் (Tamil)" },
  { code: "en-IN", label: "English" },
  { code: "hi-IN", label: "हिन्दी (Hindi)" },
  { code: "te-IN", label: "తెలుగు (Telugu)" },
  { code: "ml-IN", label: "മലയാളം (Malayalam)" },
  { code: "kn-IN", label: "ಕನ್ನಡ (Kannada)" },
  { code: "bn-IN", label: "বাংলা (Bengali)" },
  { code: "mr-IN", label: "मराठी (Marathi)" },
  { code: "gu-IN", label: "ગુજરાતી (Gujarati)" },
];

// Matches the "![image](data:...)\n<rest of text>" format we save for
// image messages. Returns { imageDataUrl, text }. If there's no image,
// imageDataUrl is null and text is the original content unchanged.
function parseMessageContent(content) {
  if (!content) return { imageDataUrl: null, text: "" };
  const match = /^!\[image\]\((data:image\/[a-zA-Z0-9.+-]+;base64,[^)]+)\)\n?([\s\S]*)$/.exec(content);
  if (!match) return { imageDataUrl: null, text: content };
  return { imageDataUrl: match[1], text: match[2] || "" };
}

// Strips the hidden "<!--refs:[...]-->" marker the backend appends after
// creating/updating a quotation, invoice, or customer.
function parseMessageRefs(content) {
  if (!content) return { text: content || "", refs: [] };
  const match = /\n?<!--refs:(\[[\s\S]*?\])-->\s*$/.exec(content);
  if (!match) return { text: content, refs: [] };
  let refs = [];
  try {
    refs = JSON.parse(match[1]);
  } catch {
    refs = [];
  }
  return { text: content.slice(0, match.index), refs };
}

// Where each ref type should navigate to.
const REF_ROUTES = {
  quotation: (id) => `/quotations/${id}`,
  invoice: (id) => `/invoices/${id}`,
  customer: (id) => `/customers/${id}`,
};
const REF_LABELS = {
  quotation: "View Quotation",
  invoice: "View Invoice",
  customer: "View Customer",
};

// Minimal Markdown renderer for chat bubbles — handles **bold** and
// line breaks, which covers everything Nexa's replies currently use.
function renderMarkdownLite(text) {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, lineIdx) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
    return (
      <span key={lineIdx}>
        {parts.map((part, i) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={i}>{part.slice(2, -2)}</strong>;
          }
          return <span key={i}>{part}</span>;
        })}
        {lineIdx < lines.length - 1 && <br />}
      </span>
    );
  });
}

// Browser speech-to-text (dictation). Chrome/Edge support this well;
// Safari/Firefox support is limited or absent, so we just hide the mic
// button entirely if the browser doesn't support it.
const SpeechRecognitionAPI =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

// Pulls the hidden "<!--form:{...}-->" marker out of an AI reply.
function parseMessageForm(content) {
  if (!content) return { text: content || "", form: null };
  const match = /\n?<!--form:(\{[\s\S]*?\})-->/.exec(content);
  if (!match) return { text: content, form: null };
  let form = null;
  try { form = JSON.parse(match[1]); } catch { form = null; }
  return { text: content.replace(match[0], "").trim(), form };
}

// Fill-in-the-blanks card. Every question can be skipped.
// A question with type "items" shows a repeatable rows table.
const EMPTY_ITEM = { description: "", qty: "1", price: "" };

function QuestionForm({ questions, onSubmit }) {
  const [answers, setAnswers] = useState({});
  const [skipped, setSkipped] = useState({});
  const [itemRows, setItemRows] = useState({}); // key -> [{description, qty, price}]

  const rowsFor = (key) => itemRows[key] || [{ ...EMPTY_ITEM }];

  function updateRow(key, idx, field, value) {
    setItemRows((prev) => {
      const rows = [...(prev[key] || [{ ...EMPTY_ITEM }])];
      rows[idx] = { ...rows[idx], [field]: value };
      return { ...prev, [key]: rows };
    });
  }
  function addRow(key) {
    setItemRows((prev) => ({ ...prev, [key]: [...(prev[key] || [{ ...EMPTY_ITEM }]), { ...EMPTY_ITEM }] }));
  }
  function removeRow(key, idx) {
    setItemRows((prev) => {
      const rows = (prev[key] || []).filter((_, i) => i !== idx);
      return { ...prev, [key]: rows.length ? rows : [{ ...EMPTY_ITEM }] };
    });
  }
  const rowTotal = (r) => (Number(r.qty) || 0) * (Number(r.price) || 0);

  function submit(skipAll) {
    const lines = questions.map((q) => {
      if (q.type === "items") {
        const rows = rowsFor(q.key).filter((r) => r.description.trim());
        if (skipAll || skipped[q.key] || rows.length === 0) return `${q.label}: (skipped)`;
        const list = rows.map(
          (r, i) => `${i + 1}. ${r.description.trim()} | qty ${Number(r.qty) || 1} | unit price ₹${Number(r.price) || 0}`
        );
        return `${q.label}:\n${list.join("\n")}`;
      }
      const val = (answers[q.key] || "").trim();
      const isSkipped = skipAll || skipped[q.key] || !val;
      return `${q.label}: ${isSkipped ? "(skipped)" : val}`;
    });
    onSubmit(lines.join("\n"));
  }

  return (
    <div style={styles.formCard}>
      {questions.map((q) => (
        <div key={q.key} style={styles.formRow}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={styles.formLabel}>{q.label}</div>
            {q.type === "items" && (
              <button
                style={styles.formSkipBtn}
                onClick={() => setSkipped((s) => ({ ...s, [q.key]: !s[q.key] }))}
              >
                {skipped[q.key] ? "Undo" : "Skip"}
              </button>
            )}
          </div>

          {q.type === "items" ? (
            skipped[q.key] ? (
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Skipped</div>
            ) : (
              <>
                {rowsFor(q.key).map((r, idx) => (
                  <div key={idx} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    <input
                      style={{ ...styles.formInput, flex: "1 1 160px", minWidth: 0 }}
                      placeholder={`Item ${idx + 1} (e.g. Frontend)`}
                      value={r.description}
                      onChange={(e) => updateRow(q.key, idx, "description", e.target.value)}
                    />
                    <input
                      style={{ ...styles.formInput, flex: "0 0 64px", minWidth: 0, textAlign: "center" }}
                      placeholder="Qty"
                      inputMode="numeric"
                      value={r.qty}
                      onChange={(e) => updateRow(q.key, idx, "qty", e.target.value.replace(/[^\d.]/g, ""))}
                    />
                    <input
                      style={{ ...styles.formInput, flex: "1 1 90px", minWidth: 0 }}
                      placeholder="₹ Price"
                      inputMode="numeric"
                      value={r.price}
                      onChange={(e) => updateRow(q.key, idx, "price", e.target.value.replace(/[^\d.]/g, ""))}
                    />
                    <button
                      style={styles.formRemoveBtn}
                      onClick={() => removeRow(q.key, idx)}
                      aria-label="Remove item"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button style={styles.formAddItemBtn} onClick={() => addRow(q.key)}>
                    + Add item
                  </button>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>
                    Total: ₹{rowsFor(q.key).reduce((s, r) => s + rowTotal(r), 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </>
            )
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                style={{ ...styles.formInput, ...(skipped[q.key] ? { background: "#f1f5f9" } : {}) }}
                value={skipped[q.key] ? "" : answers[q.key] || ""}
                disabled={skipped[q.key]}
                placeholder={skipped[q.key] ? "Skipped" : q.placeholder || ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.value }))}
              />
              <button
                style={styles.formSkipBtn}
                onClick={() => setSkipped((s) => ({ ...s, [q.key]: !s[q.key] }))}
              >
                {skipped[q.key] ? "Undo" : "Skip"}
              </button>
            </div>
          )}
        </div>
      ))}
      <div style={styles.formActions}>
        <button style={styles.formSkipAll} onClick={() => submit(true)}>Skip all</button>
        <button style={styles.formSubmit} onClick={() => submit(false)}>Continue</button>
      </div>
    </div>
  );
}
const TicksIcon = ({ color = "#94a3b8" }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 13 6 18 15 7" />
    <polyline points="9 15 11.5 17.5 22 6" />
  </svg>
);

// "07.05 am" style, from the saved message time
function formatMsgTime(m) {
  const raw = m.created_at || m.createdAt;
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d)) return "";
  return d
    .toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
    .replace(":", ".");
}

export default function AIChatBox({
  chatId,
  isMobile = false,
  aiName = "Nexa",
  greeting = "Hi! How can I help you today?",
  onChatCreated,
  onChatUpdated,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [attachedImage, setAttachedImage] = useState(null); // data URL or null
  const [isRecording, setIsRecording] = useState(false);
  const [micError, setMicError] = useState(null);
  // "ta-IN" = Tamil, "en-IN" = English. Remembered between visits.
  const [voiceLang, setVoiceLang] = useState(() => {
    const saved = localStorage.getItem("nexa:voiceLang");
    return VOICE_LANGUAGES.some((l) => l.code === saved) ? saved : "ta-IN";
  });
  const [copiedId, setCopiedId] = useState(null);
  const [liked, setLiked] = useState({}); // messageId -> true
  const [editingMessageId, setEditingMessageId] = useState(null); // id of the message being edited, or null
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const waveRef = useRef(null);
  const [barCount, setBarCount] = useState(60);
  const shouldRecordRef = useRef(false);
  const navigate = useNavigate();  //tracks recording intent without stale-closure issues
  const location = useLocation();
  const [usage, setUsage] = useState(null); // { limit, used } or null (no limit)
  const limitReached = Boolean(usage?.limit && usage.used >= usage.limit);

  // Load today's usage once
  useEffect(() => {
    fetch(`${API_BASE}/usage`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setUsage(data))
      .catch(() => {});
  }, []);

  // Load full conversation whenever a different chat is selected
  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setLoadingHistory(true);

    fetch(`${API_BASE}/${chatId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load chat");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setMessages(data.messages || []);
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [chatId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // ── Voice-to-text (dictation) ────────────────────────────────────────
  // Fill the whole waveform bar: each bar is 3px wide + 3px gap = 6px
  useEffect(() => {
    if (!isRecording || !waveRef.current) return;
    const update = () => {
      const w = waveRef.current?.clientWidth || 0;
      setBarCount(Math.max(20, Math.floor((w - 12) / 6)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(waveRef.current);
    return () => ro.disconnect();
  }, [isRecording]);

  function stopRecording() {
    shouldRecordRef.current = false;
    const rec = recognitionRef.current;
    rec?.stop();
    setIsRecording(false);
  }

  // The ✕ button: stop AND throw away whatever was transcribed
  function cancelRecording() {
    stopRecording();
    setInput("");
  }

  // The ↑ button while recording: stop, then send immediately
  function sendRecordingNow() {
    stopRecording();
    setTimeout(() => sendMessage(), 50);
  }

  function toggleRecording() {
    if (!SpeechRecognitionAPI) return;

    if (isRecording) {
      stopRecording();
      return;
    }

    setMicError(null);
    shouldRecordRef.current = true;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = voiceLang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    const baseTextRef = { current: input ? input + " " : "" };

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript + " ";
        } else {
          interimText += transcript;
        }
      }

      if (finalText) {
        baseTextRef.current += finalText;
      }
      setInput(baseTextRef.current + interimText);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      const messages = {
        "not-allowed": "Microphone access is blocked. Allow it in your browser's site settings.",
        "audio-capture": "No microphone was found.",
        "no-speech": "Didn't catch that — try again.",
        network: "Speech service unreachable — check your connection.",
        "language-not-supported": "This browser can't recognise that language. Try Chrome or Edge.",
      };
      setMicError(messages[event.error] || `Mic error: ${event.error}`);
      shouldRecordRef.current = false;
      setIsRecording(false);
    };

    recognition.onend = () => {
      // Check the ref (always current), not the stale `isRecording` state
      if (shouldRecordRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          // ignore
        }
      }
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }

  // ── Image attach ──────────────────────────────────────────────────────
  function readImageFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onloadend = () => setAttachedImage(reader.result);
    reader.readAsDataURL(file);
  }

  function handleImageSelect(e) {
    readImageFile(e.target.files?.[0]);
    e.target.value = ""; // allow re-selecting the same file later
  }

  // Ctrl+V: if the clipboard has an image, attach it. Plain text falls
  // through to the browser's normal paste into the input.
  function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        e.preventDefault();
        readImageFile(item.getAsFile());
        return;
      }
    }
  }

  function removeAttachedImage() {
    setAttachedImage(null);
  }

  // ── Copy ──────────────────────────────────────────────────────────────
  function handleCopy(message) {
    const { text: withoutRefs } = parseMessageRefs(message.content);
    const { text } = parseMessageContent(withoutRefs);
    navigator.clipboard.writeText(text || withoutRefs).then(() => {
      setCopiedId(message.id);
      setTimeout(() => setCopiedId((id) => (id === message.id ? null : id)), 1500);
    });
  }

  // ── Speak a reply out loud ────────────────────────────────────────────
  function speak(text) {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voiceLang;
    window.speechSynthesis.speak(u);
  }

  // ── Tap the language chip to cycle Tamil → English → Hindi … ─────────
  function cycleLang() {
    const i = VOICE_LANGUAGES.findIndex((l) => l.code === voiceLang);
    const next = VOICE_LANGUAGES[(i + 1) % VOICE_LANGUAGES.length].code;
    setVoiceLang(next);
    localStorage.setItem("nexa:voiceLang", next);
  }

  // ── Regenerate the last reply (re-sends the user message before it) ──
  async function regenerate(botIdx) {
    if (loading || !chatId) return;
    const userMsg = [...messages.slice(0, botIdx)].reverse().find((m) => m.role === "user");
    if (!userMsg || String(userMsg.id).startsWith("temp-")) return;
    const { imageDataUrl, text } = parseMessageContent(userMsg.content);

    setLoading(true);
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === userMsg.id);
      return idx === -1 ? prev : prev.slice(0, idx);
    });
    try {
      const res = await fetch(`${API_BASE}/${chatId}/messages/${userMsg.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, image: imageDataUrl || undefined, aiName }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      if (data.usage) setUsage(data.usage);
      setMessages((prev) => [...prev, data.userMessage, data.assistantMessage]);
      onChatUpdated?.(data.chat);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: "assistant", content: "Couldn't regenerate. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // ── Edit (rewrites the message + regenerates the AI reply) ───────────
  function handleEdit(message) {
    const { imageDataUrl, text } = parseMessageContent(message.content);
    setInput(text);
    setAttachedImage(imageDataUrl || null);
    setEditingMessageId(message.id);
  }

  function cancelEdit() {
    setEditingMessageId(null);
    setInput("");
    setAttachedImage(null);
  }

  async function saveEdit() {
    const text = input.trim();
    if ((!text && !attachedImage) || loading || !editingMessageId) return;

    const imageToSend = attachedImage;
    const messageId = editingMessageId;

    setInput("");
    setAttachedImage(null);
    setEditingMessageId(null);
    setLoading(true);

    // Optimistically drop the old version of this message and everything
    // after it, since the AI reply is about to be regenerated.
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === messageId);
      return idx === -1 ? prev : prev.slice(0, idx);
    });

    try {
      const res = await fetch(`${API_BASE}/${chatId}/messages/${messageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, image: imageToSend || undefined, aiName }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();

      setMessages((prev) => [...prev, data.userMessage, data.assistantMessage]);
      onChatUpdated?.(data.chat);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: "assistant", content: "Something went wrong while saving your edit." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(overrideText) {
    const text = (typeof overrideText === "string" ? overrideText : input).trim();
    if ((!text && !attachedImage) || loading || limitReached) return;

    const imageToSend = attachedImage;
    const savedContent = imageToSend
      ? `![image](${imageToSend})\n${text}`
      : text;

    setInput("");
    setAttachedImage(null);
    setLoading(true);

    // Optimistically show the user's message right away
    const optimisticUserMsg = { id: `temp-${Date.now()}`, role: "user", content: savedContent };
    setMessages((prev) => [...prev, optimisticUserMsg]);

    try {
      let activeChatId = chatId;
      let isNewChat = false;

      if (!activeChatId) {
        const createRes = await fetch(API_BASE, { method: "POST" });
        if (!createRes.ok) throw new Error("Failed to create chat");
        const newChat = await createRes.json();
        activeChatId = newChat.id;
        isNewChat = true;
      }

      const res = await fetch(`${API_BASE}/${activeChatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, image: imageToSend || undefined, aiName }),
      });

      if (res.status === 429) {
        const d = await res.json();
        setUsage({ limit: d.limit, used: d.used });
        setInput(text); // give the text back
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== optimisticUserMsg.id),
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: `You've used all ${d.limit} messages for today. Your limit resets at 12:00 AM. Upgrade to the paid plan to continue.`,
          },
        ]);
        return;
      }

      if (!res.ok) throw new Error("Request failed");

      const data = await res.json();

      if (data.usage) setUsage(data.usage);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticUserMsg.id),
        data.userMessage,
        data.assistantMessage,
      ]);

      if (isNewChat) {
        onChatCreated?.(data.chat);
      } else {
        onChatUpdated?.(data.chat);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

function handleKeyDown(e) {
  if (e.key === "Enter") sendMessage();
}

  const showGreeting = !chatId && messages.length === 0 && !loadingHistory;
  const canSend = Boolean((input.trim() || attachedImage) && !loading && !limitReached);

  // Compact sizes for phones
  const mIcon = isMobile ? { width: 32, height: 32, fontSize: 14 } : {};
  const mLang = isMobile ? { width: 92, maxWidth: 92, height: 32, fontSize: 12, padding: "0 6px" } : {};
  const mSend = isMobile ? { width: 38, height: 38, marginLeft: "auto" } : {};

  return (
    <div style={styles.wrapper} onPaste={handlePaste}>
      <div
        style={{ ...styles.messages, ...(isMobile ? { padding: 10, minHeight: 0 } : {}) }}
        ref={scrollRef}
      >
        <div style={styles.dateLabel}>Today</div>
        {loadingHistory && (
          <div style={{ ...styles.msg, ...styles.msgBot, fontStyle: "italic", color: "#999" }}>
            Loading conversation...
          </div>
        )}

        {showGreeting && (
          <div style={{ ...styles.msg, ...styles.msgBot }}>{greeting}</div>
        )}

        {messages.map((m, idx) => {
          const { text: contentWithoutRefs, refs } = parseMessageRefs(m.content);
          const { text: contentWithoutForm, form } = parseMessageForm(contentWithoutRefs);
          const { imageDataUrl, text } = parseMessageContent(contentWithoutForm);
          const isUser = m.role === "user";
          const isSaved = !String(m.id).startsWith("temp-") && !String(m.id).startsWith("err-");
          return (
            <div key={m.id} style={{ display: "flex", flexDirection: "column", ...(isUser ? { alignItems: "flex-end" } : { alignItems: "flex-start" }) }}>
              <div style={styles.metaRow}>
                {isUser ? (
                  <>
                    <span>{formatMsgTime(m)}</span>
                    <span style={styles.metaName}>You</span>
                  </>
                ) : (
                  <>
                    <span style={styles.metaName}>{aiName}</span>
                    <span>{formatMsgTime(m)}</span>
                  </>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  maxWidth: isMobile ? "92%" : "80%",
                }}
              >
                <div
                  style={{
                    ...styles.msg,
                    ...(isUser ? styles.msgUser : styles.msgBot),
                    maxWidth: "100%",
                    minWidth: 0,
                    wordBreak: "break-word",
                  }}
                >
                  {imageDataUrl && (
                    <img src={imageDataUrl} alt="attachment" style={styles.msgImage} />
                  )}
                  {text && renderMarkdownLite(text)}
                </div>
              </div>

              {/* One button per created/updated record */}
              {refs.length > 0 && (
                <div style={styles.refButtonRow}>
                  {refs.map((ref, i) => (
                    <button
                      key={`${ref.type}-${ref.id}-${i}`}
                      style={styles.refBtn}
                      onClick={() =>
                        navigate(REF_ROUTES[ref.type]?.(ref.id) || "/", {
                          state: { fromAI: true, returnTo: location.pathname },
                        })
                      }
                    >
                      {REF_LABELS[ref.type] || "View"}
                      {ref.label ? ` · ${ref.label}` : ""}
                    </button>
                  ))}
                </div>
              )}

              {form?.questions?.length > 0 && !isUser && idx === messages.length - 1 && !loading && (
                <QuestionForm questions={form.questions} onSubmit={(answersText) => sendMessage(answersText)} />
              )}

{isUser ? (
  <div style={styles.msgActions}>
    <button
      style={{ ...styles.circleBtn, width: 30, height: 30 }}
      onClick={() => handleCopy(m)}
      title="Copy"
      aria-label="Copy"
    >
      {copiedId === m.id ? "✓" : <CopyIcon />}
    </button>
  </div>
) : (
                <div style={styles.botFooter}>
                  <button style={styles.circleBtn} onClick={() => handleCopy(m)} title="Copy">
                    {copiedId === m.id ? "✓" : <CopyIcon />}
                  </button>
                  <button
                    style={{ ...styles.circleBtn, ...(liked[m.id] ? { color: THEME.accent } : {}) }}
                    onClick={() => setLiked((l) => ({ ...l, [m.id]: !l[m.id] }))}
                    title="Like"
                  >
                    <ThumbIcon filled={!!liked[m.id]} />
                  </button>
                  <button style={styles.circleBtn} onClick={() => speak(text)} title="Read aloud">
                    <SpeakerIcon />
                  </button>
                  {idx === messages.length - 1 && isSaved && (
                    <button
                      style={{ ...styles.circleBtn, marginLeft: "auto" }}
                      onClick={() => regenerate(idx)}
                      title="Regenerate"
                    >
                      <RefreshIcon />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ ...styles.msg, ...styles.msgBot, display: "flex", gap: 5, padding: "14px 16px" }}>
              <span style={styles.dot} />
              <span style={{ ...styles.dot, animationDelay: "0.2s" }} />
              <span style={{ ...styles.dot, animationDelay: "0.4s" }} />
            </div>
          </div>
        )}
      </div>

      {editingMessageId && (
        <div style={styles.attachPreviewBar}>
          <span style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>Editing message…</span>
          <button style={styles.attachRemoveBtn} onClick={cancelEdit} aria-label="Cancel edit">
            ✕
          </button>
        </div>
      )}

      {attachedImage && (
        <div style={styles.attachPreviewBar}>
          <img src={attachedImage} alt="preview" style={styles.attachThumb} />
          <button style={styles.attachRemoveBtn} onClick={removeAttachedImage} aria-label="Remove image">
            ✕
          </button>
        </div>
      )}

      {micError && (
        <div style={{ padding: "6px 14px", fontSize: 12, color: "#e04b4b", background: "#fef2f2" }}>
          {micError}
        </div>
      )}

      <style>{`
        @keyframes waveformPulse {
          0%, 100% { transform: scaleY(0.35); }
          50% { transform: scaleY(1); }
        }
        @keyframes orbFloat {
          0%, 100% { transform: translateY(0) scale(1); box-shadow: 0 2px 6px rgba(31,122,99,0.25); }
          50% { transform: translateY(-2px) scale(1.06); box-shadow: 0 4px 12px rgba(31,122,99,0.45); }
        }
        @keyframes orbThink {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(31,122,99,0.45); }
          50% { transform: scale(1.12); box-shadow: 0 0 0 8px rgba(31,122,99,0); }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
           @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }
      `}</style>

      {usage?.limit && (
        <div style={{ ...styles.usageBar, ...(limitReached ? styles.usageBarFull : {}) }}>
          {limitReached
            ? "Daily limit reached. Resets at 12:00 AM."
            : `${usage.limit - usage.used} of ${usage.limit} messages left today`}
        </div>
      )}

      {isRecording ? (
        <div style={styles.recordingBar}>
          <button style={styles.recordingCancelBtn} onClick={cancelRecording} aria-label="Cancel recording">
            ✕
          </button>

          <div ref={waveRef} style={styles.waveform}>
            {Array.from({ length: barCount }).map((_, i) => (
              <span
                key={i}
                style={{
                  ...styles.waveBar,
                  animationDelay: `${(i % 7) * 0.08}s`,
                }}
              />
            ))}
          </div>

          <button style={styles.recordingStopBtn} onClick={stopRecording} aria-label="Stop recording">
            ■
          </button>
          <button style={styles.recordingSendBtn} onClick={sendRecordingNow} aria-label="Send">
            ↑
          </button>
        </div>
      ) : (
        <div
          style={{
            ...styles.inputBar,
            ...(isMobile ? { flexWrap: "wrap", padding: 8, gap: 6 } : {}),
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleImageSelect}
          />
          <button
            style={{ ...styles.iconBtn, ...mIcon }}
            onClick={() => fileInputRef.current?.click()}
            title="Attach image"
            aria-label="Attach image"
          >
            <CameraIcon />
          </button>

          {SpeechRecognitionAPI && (
            <>
              <button
                style={{ ...styles.iconBtn, ...mIcon }}
                onClick={toggleRecording}
                title="Voice input"
                aria-label="Voice input"
              >
                <MicIcon />
              </button>
              <select
                style={{ ...styles.langSelect, ...mLang }}
                value={voiceLang}
                onChange={(e) => {
                  setVoiceLang(e.target.value);
                  localStorage.setItem("nexa:voiceLang", e.target.value);
                }}
                title="Voice language"
                aria-label="Voice language"
              >
                {VOICE_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </>
          )}

          <input
            style={{
              ...styles.input,
              ...(isMobile
                ? { order: -1, flex: "1 1 100%", minWidth: 0, padding: "7px 14px", fontSize: 13 }
                : {}),
            }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
           placeholder="Type your question..."
/>
<button
  style={{ ...styles.sendBtn, ...(canSend ? {} : styles.sendBtnDisabled), ...mSend }}
  onClick={() => sendMessage()}
  disabled={!canSend}
  aria-label="Send"
  title="Send"
>
  <SendIcon />
</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  dateLabel: { textAlign: "center", fontSize: 12, color: "#8e8e93", margin: "4px 0 8px" },
  wrapper: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    border: "none",
    borderRadius: 20,
    overflow: "hidden",
    background: THEME.solidBg,
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    background: THEME.pageBg,
    minHeight: 300,
  },
  msg: {
    maxWidth: "70%",
    padding: "12px 16px",
    borderRadius: 20,
    fontSize: 14,
    lineHeight: 1.55,
  },
  msgBot: {
    background: "#fff",
    color: "#1f2937",
    border: "none",
    boxShadow: `0 2px 12px ${THEME.shadow}`,
    alignSelf: "flex-start",
  },
  msgUser: {
    background: THEME.userBubble,
    color: "#fff",
    boxShadow: `0 2px 12px ${THEME.shadowStrong}`,
    alignSelf: "flex-end",
  },
  msgImage: {
    maxWidth: "100%",
    maxHeight: 220,
    borderRadius: 10,
    display: "block",
    marginBottom: 6,
  },
  msgActions: {
    display: "flex",
    gap: 6,
    margin: "2px 4px 10px 4px",
  },

  attachPreviewBar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 14px",
    borderTop: "1px solid #eee",
    background: "#fafafa",
  },
  attachThumb: {
    width: 44,
    height: 44,
    objectFit: "cover",
    borderRadius: 8,
    border: "1px solid #eee",
  },
  attachRemoveBtn: {
    border: "none",
    background: "#f1f5f9",
    borderRadius: "50%",
    width: 22,
    height: 22,
    cursor: "pointer",
    fontSize: 11,
    color: "#475569",
  },
  inputBar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px 14px",
    background: THEME.solidBg,
  },
  pill: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "#fff",
    borderRadius: 999,
    padding: "4px 8px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  },
  pillIconBtn: {
    border: "none",
    background: "transparent",
    color: "#64748b",
    width: 34,
    height: 34,
    flexShrink: 0,
    borderRadius: "50%",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  pillInput: {
    flex: 1,
    minWidth: 0,
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 14,
    padding: "8px 4px",
  },
  langChip: {
    border: "none",
    background: "#f1f5f9",
    color: "#475569",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
  },
  sendCircle: {
    width: 46,
    height: 46,
    flexShrink: 0,
    borderRadius: "50%",
    border: "none",
    background: "#fff",
    color: THEME.accent,
    boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    fontWeight: 700,
  },

  // bot footer (orb + action icons) and user avatar
  botFooter: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "min(100%, 340px)",
    margin: "6px 0 10px 46px", // 36px orb + 10px gap
  },
  orb: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: THEME.orb,
    flexShrink: 0,
    animation: "orbFloat 3s ease-in-out infinite",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: THEME.accent,
    display: "inline-block",
    animation: "dotBounce 1.2s ease-in-out infinite",
  },
  circleBtn: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    border: "none",
    background: "rgba(255,255,255,0.85)",
    color: "#334155",
    boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    flexShrink: 0,
    background: "linear-gradient(135deg, #1f2937, #475569)",
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtn: {
    border: "none",
    background: "#fff",
    color: THEME.accent,
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    borderRadius: "50%",
    width: 38,
    height: 38,
    flexShrink: 0,
    cursor: "pointer",
    fontSize: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnActive: {
    background: "#fee2e2",
    border: "1px solid #fecaca",
  },
  langSelect: {
    border: "1px solid #ddd",
    background: "#fff",
    borderRadius: 999,
    height: 38,
    padding: "0 10px",
    fontSize: 13,
    cursor: "pointer",
    outline: "none",
    maxWidth: 140,
  },
  input: {
    flex: 1,
    border: "1px solid #ddd",
    borderRadius: 999,
    padding: "10px 16px",
    fontSize: 14,
    outline: "none",
  },
  sendBtn: {
    background: THEME.userBubble,
    color: "#fff",
    border: "none",
    borderRadius: "50%",
    width: 44,
    height: 44,
    padding: 0,
    cursor: "pointer",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: `0 2px 8px ${THEME.shadowStrong}`,
    transition: "opacity 0.15s",
  },
  sendBtnDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
    boxShadow: "none",
  },

  recordingBar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 14px",
    borderTop: "1px solid #eee",
    background: "#fff",
  },
  recordingCancelBtn: {
    border: "1px solid #ddd",
    background: "#fff",
    borderRadius: "50%",
    width: 34,
    height: 34,
    flexShrink: 0,
    cursor: "pointer",
    fontSize: 14,
    color: "#333",
  },
  waveform: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 3,
    height: 24,
    overflow: "hidden",
    padding: "0 6px",
    background: "#f7f7fb",
    borderRadius: 999,
  },
  waveBar: {
    display: "inline-block",
    width: 3,
    height: 18,
    borderRadius: 2,
    background: "#94a3b8",
    animation: "waveformPulse 0.9s ease-in-out infinite",
  },
  recordingStopBtn: {
    border: "none",
    background: "#111827",
    color: "#fff",
    borderRadius: "50%",
    width: 34,
    height: 34,
    flexShrink: 0,
    cursor: "pointer",
    fontSize: 12,
  },
  recordingSendBtn: {
    border: "none",
    background: THEME.accent,
    color: "#fff",
    borderRadius: "50%",
    width: 38,
    height: 38,
    flexShrink: 0,
    cursor: "pointer",
    fontSize: 16,
  },

  formCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
    width: "min(480px, 100%)",
    boxSizing: "border-box",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  formRow: { display: "flex", flexDirection: "column", gap: 4 },
  formLabel: { fontSize: 13, fontWeight: 600, color: "#334155" },
  formInput: {
    flex: 1,
    minWidth: 0,
    boxSizing: "border-box",
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 13,
    outline: "none",
  },
  formSkipBtn: {
    border: "1px solid #ddd",
    background: "#fff",
    borderRadius: 8,
    padding: "0 12px",
    fontSize: 12,
    color: "#64748b",
    cursor: "pointer",
  },
  formRemoveBtn: {
    border: "none",
    background: "#fef2f2",
    color: "#dc2626",
    borderRadius: 6,
    width: 26,
    height: 26,
    flexShrink: 0,
    cursor: "pointer",
    fontSize: 11,
  },
  formAddItemBtn: {
    border: "1.5px dashed #4f6bf0",
    background: "transparent",
    color: "#4f6bf0",
    borderRadius: 8,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  formActions: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 },
  formSkipAll: {
    border: "none",
    background: "none",
    color: "#64748b",
    fontSize: 13,
    cursor: "pointer",
  },
  formSubmit: {
    border: "none",
    background: "#4f6bf0",
    color: "#fff",
    borderRadius: 999,
    padding: "8px 18px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "#64748b",
    margin: "8px 0 4px",
  },
  metaName: { color: "#1f2937", fontWeight: 500 },

  usageBar: {
    padding: "6px 16px 0",
    fontSize: 12,
    color: "#64748b",
    background: THEME.solidBg,
    textAlign: "right",
  },
  usageBarFull: { color: "#dc2626", fontWeight: 600 },

  refButtonRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    margin: "6px 4px 2px",
  },
  refBtn: {
    border: "1px solid #a7e3cf",
    background: "#e8f7f1",
    color: "#1f7a63",
    borderRadius: 999,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
};