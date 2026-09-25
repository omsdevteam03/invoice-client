import { useState, useRef, useEffect } from "react";

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

export default function AIChatBox({
  chatId,
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
  const [copiedId, setCopiedId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null); // id of the message being edited, or null
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

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
  function toggleRecording() {
    if (!SpeechRecognitionAPI) return;

    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join(" ");
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

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
    const { text } = parseMessageContent(message.content);
    navigator.clipboard.writeText(text || message.content).then(() => {
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
        body: JSON.stringify({ content: text, image: imageToSend || undefined }),
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

  async function sendMessage() {
    const text = input.trim();
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

        {messages.map((m) => {
          const { imageDataUrl, text } = parseMessageContent(m.content);
          const isUser = m.role === "user";
          // Optimistic/error messages use temp string ids and don't exist
          // in the DB yet — editing only makes sense for saved messages.
          const isSaved = !String(m.id).startsWith("temp-") && !String(m.id).startsWith("err-");
          return (
            <div key={m.id} style={{ display: "flex", flexDirection: "column", ...(isUser ? { alignItems: "flex-end" } : { alignItems: "flex-start" }) }}>
              <div style={{ ...styles.msg, ...(isUser ? styles.msgUser : styles.msgBot) }}>
                {imageDataUrl && (
                  <img src={imageDataUrl} alt="attachment" style={styles.msgImage} />
                )}
                {text && renderMarkdownLite(text)}
              </div>
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
          <button
            style={{ ...styles.iconBtn, ...(isRecording ? styles.iconBtnActive : {}) }}
            onClick={toggleRecording}
            title={isRecording ? "Stop recording" : "Voice input"}
            aria-label="Voice input"
          >
            {isRecording ? "⏹" : "🎤"}
          </button>
        )}

        <input
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? "Listening..." : editingMessageId ? "Edit your message..." : "Type your question..."}
        />
        <button
          style={styles.sendBtn}
          onClick={editingMessageId ? saveEdit : sendMessage}
          aria-label={editingMessageId ? "Save edit" : "Send"}
        >
          {editingMessageId ? "Save" : "Send"}
        </button>
      </div>
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
};