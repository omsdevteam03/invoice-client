import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 

// Reusable AI chat box, backed by the server.
//
// Props:
//   chatId          - id of the currently open chat, or null for a fresh/unsaved chat
//   greeting        - shown only when there's no chatId yet (nothing saved)
//   onChatCreated(chat) - called once the very first message creates a chat row in the backend
//   onChatUpdated(chat) - called after any message exchange (e.g. to bump it to the top of the sidebar / update title)

const API_BASE = `${import.meta.env.VITE_API_URL}/chat`;

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
                  <div key={idx} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      style={{ ...styles.formInput, flex: 1, minWidth: 0 }}
                      placeholder={`Item ${idx + 1} (e.g. Frontend)`}
                      value={r.description}
                      onChange={(e) => updateRow(q.key, idx, "description", e.target.value)}
                    />
                    <input
                      style={{ ...styles.formInput, flex: "0 0 52px", textAlign: "center" }}
                      placeholder="Qty"
                      inputMode="numeric"
                      value={r.qty}
                      onChange={(e) => updateRow(q.key, idx, "qty", e.target.value.replace(/[^\d.]/g, ""))}
                    />
                    <input
                      style={{ ...styles.formInput, flex: "0 0 90px" }}
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

export default function AIChatBox({
  chatId,
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
  const [voiceLang, setVoiceLang] = useState(
    () => localStorage.getItem("nexa:voiceLang") || "ta-IN"
  ); 
  const [copiedId, setCopiedId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null); // id of the message being edited, or null
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const waveRef = useRef(null);
  const [barCount, setBarCount] = useState(60);
  const shouldRecordRef = useRef(false);
  const navigate = useNavigate();  //tracks recording intent without stale-closure issues

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
  function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setAttachedImage(reader.result);
    reader.readAsDataURL(file);
    e.target.value = ""; // allow re-selecting the same file later
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
    if ((!text && !attachedImage) || loading) return;

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
        body: JSON.stringify({ content: text, image: imageToSend || undefined }),
      });

      if (!res.ok) throw new Error("Request failed");

      const data = await res.json();

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
    if (e.key === "Enter") {
      if (editingMessageId) saveEdit();
      else sendMessage();
    }
  }

  const showGreeting = !chatId && messages.length === 0 && !loadingHistory;

  return (
    <div style={styles.wrapper}>
      <div style={styles.messages} ref={scrollRef}>
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
              <div style={{ ...styles.msg, ...(isUser ? styles.msgUser : styles.msgBot) }}>
                {imageDataUrl && (
                  <img src={imageDataUrl} alt="attachment" style={styles.msgImage} />
                )}
                {text && renderMarkdownLite(text)}
              </div>

              {/* One button per created/updated record */}
              {refs.length > 0 && (
                <div style={styles.refButtonRow}>
                  {refs.map((ref, i) => (
                    <button
                      key={`${ref.type}-${ref.id}-${i}`}
                      style={styles.refBtn}
                      onClick={() => navigate(REF_ROUTES[ref.type]?.(ref.id) || "/")}
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

              <div style={styles.msgActions}>
                <button style={styles.msgActionBtn} onClick={() => handleCopy(m)} title="Copy">
                  {copiedId === m.id ? "Copied!" : "Copy"}
                </button>
                {isUser && isSaved && (
                  <button style={styles.msgActionBtn} onClick={() => handleEdit(m)} title="Edit">
                    Edit
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{ ...styles.msg, ...styles.msgBot, fontStyle: "italic", color: "#999" }}>
            Typing...
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
      `}</style>

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
        <div style={styles.inputBar}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleImageSelect}
          />
          <button
            style={styles.iconBtn}
            onClick={() => fileInputRef.current?.click()}
            title="Attach image"
            aria-label="Attach image"
          >
            📷
          </button>

          {SpeechRecognitionAPI && (
            <>
              <button
                style={styles.iconBtn}
                onClick={toggleRecording}
                title="Voice input"
                aria-label="Voice input"
              >
                🎤
              </button>
              <button
                style={{ ...styles.iconBtn, width: 44, fontSize: 12, fontWeight: 700 }}
                onClick={() => {
                  const next = voiceLang === "ta-IN" ? "en-IN" : "ta-IN";
                  setVoiceLang(next);
                  localStorage.setItem("nexa:voiceLang", next);
                }}
                title="Voice language"
                aria-label="Voice language"
              >
                {voiceLang === "ta-IN" ? "த" : "EN"}
              </button>
            </>
          )}

          <input
            style={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={editingMessageId ? "Edit your message..." : "Type your question..."}
          />
          <button
            style={styles.sendBtn}
            onClick={editingMessageId ? saveEdit : sendMessage}
            aria-label={editingMessageId ? "Save edit" : "Send"}
          >
            {editingMessageId ? "Save" : "Send"}
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    border: "1px solid #eee",
    borderRadius: 12,
    overflow: "hidden",
    background: "#fff",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    background: "#f7f7fb",
    minHeight: 300,
  },
  msg: {
    maxWidth: "70%",
    padding: "10px 15px",
    borderRadius: 14,
    fontSize: 14,
    lineHeight: 1.5,
  },
  msgBot: {
    background: "#fff",
    border: "1px solid #eee",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  msgUser: {
    background: "#4f6bf0",
    color: "#fff",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
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
    margin: "2px 4px 10px",
  },
  msgActionBtn: {
    border: "none",
    background: "transparent",
    color: "#94a3b8",
    fontSize: 11,
    cursor: "pointer",
    padding: "2px 4px",
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
    gap: 8,
    padding: 14,
    borderTop: "1px solid #eee",
    background: "#fff",
  },
  iconBtn: {
    border: "1px solid #ddd",
    background: "#fff",
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
  input: {
    flex: 1,
    border: "1px solid #ddd",
    borderRadius: 999,
    padding: "10px 16px",
    fontSize: 14,
    outline: "none",
  },
  sendBtn: {
    background: "#4f6bf0",
    color: "#fff",
    border: "none",
    borderRadius: 999,
    padding: "0 20px",
    height: 38,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    flexShrink: 0,
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
    background: "#4f6bf0",
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
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  formRow: { display: "flex", flexDirection: "column", gap: 4 },
  formLabel: { fontSize: 13, fontWeight: 600, color: "#334155" },
  formInput: {
    flex: 1,
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

  refButtonRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    margin: "6px 4px 2px",
  },
  refBtn: {
    border: "1px solid #c7d2fe",
    background: "#eef2ff",
    color: "#4f46e5",
    borderRadius: 999,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
};