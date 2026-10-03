import { useState, useEffect, useCallback } from "react";
import AIChatBox from "../components/ai/Aichatbox";
import ChatSidebar from "../components/ai/Chatsidebar";

// Main AI assistant page — sidebar (chat history) + active chat box,
// same wiring pattern as DashboardPage, InvoicesPage etc.

const API_BASE = `${import.meta.env.VITE_API_URL}/chat`;
const LAST_CHAT_KEY = "nexa:lastActiveChatId";
const NAME_KEY = "ai:assistantName";
const DEFAULT_AI_NAME = "Nexa";

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < breakpoint
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [breakpoint]);
  return isMobile;
}

export default function AIPage() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer
  const [chats, setChats] = useState([]);

  const [aiName, setAiName] = useState(
    () => localStorage.getItem(NAME_KEY) || DEFAULT_AI_NAME
  );
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  function startEditName() {
    setNameDraft(aiName);
    setEditingName(true);
  }

  function saveName() {
    const clean = nameDraft.trim().slice(0, 20);
    if (clean) {
      setAiName(clean);
      localStorage.setItem(NAME_KEY, clean);
    }
    setEditingName(false);
  }

  function resetName() {
    setAiName(DEFAULT_AI_NAME);
    localStorage.removeItem(NAME_KEY);
    setEditingName(false);
  }
  const [activeChatId, setActiveChatId] = useState(
    () => sessionStorage.getItem(LAST_CHAT_KEY) || null
  );

  const loadChats = useCallback(async () => {
    try {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error("Failed to load chats");
      const data = await res.json();
      setChats(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    if (activeChatId) {
      sessionStorage.setItem(LAST_CHAT_KEY, activeChatId);
    } else {
      sessionStorage.removeItem(LAST_CHAT_KEY);
    }
  }, [activeChatId]);

  function handleNewChat() {
    setActiveChatId(null); // AIChatBox creates the row lazily on first send
    setSidebarOpen(false);
  }

  function handleSelectChat(chatId) {
    setActiveChatId(chatId);
    setSidebarOpen(false);
  }

  function handleChatCreated(chat) {
    setActiveChatId(chat.id);
    setChats((prev) => [chat, ...prev]);
  }

  function handleChatUpdated(chat) {
    setChats((prev) => {
      const rest = prev.filter((c) => c.id !== chat.id);
      return [chat, ...rest];
    });
  }

  async function handleRenameChat(chatId, title) {
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, title } : c)));
    try {
      await fetch(`${API_BASE}/${chatId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
    } catch (err) {
      console.error(err);
      loadChats();
    }
  }

  async function handleDeleteChat(chatId) {
    const prevChats = chats;
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (activeChatId === chatId) {
      setActiveChatId(null);
      sessionStorage.removeItem(LAST_CHAT_KEY);
    }

    try {
      const res = await fetch(`${API_BASE}/${chatId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    } catch (err) {
      console.error(err);
      setChats(prevChats);
    }
  }

  return (
    <div style={{ ...styles.page, ...(isMobile ? styles.pageMobile : {}) }}>
      <div style={styles.headerRow}>
        {editingName ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              autoFocus
              value={nameDraft}
              maxLength={20}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
                if (e.key === "Escape") setEditingName(false);
              }}
              placeholder="e.g. Jesi"
              style={styles.nameInput}
            />
            <button style={styles.nameSaveBtn} onClick={saveName}>Save</button>
            <button style={styles.nameLinkBtn} onClick={() => setEditingName(false)}>Cancel</button>
            <button style={styles.nameLinkBtn} onClick={resetName}>Reset</button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 style={styles.title}>{aiName}</h1>
            <button style={styles.nameEditBtn} onClick={startEditName} title="Rename your assistant" aria-label="Rename assistant">
              ✏️
            </button>
            {isMobile && (
              <button style={styles.chatsBtn} onClick={() => setSidebarOpen(true)}>
                ☰ Chats
              </button>
            )}
          </div>
        )}
        {!isMobile && (
          <p style={styles.subtitle}>
            Ask about customers, invoices, quotations, or anything else in your dashboard.
          </p>
        )}
      </div>

      <div style={{ ...styles.body, ...(isMobile ? styles.bodyMobile : {}) }}>
        {isMobile ? (
          sidebarOpen && (
            <>
              <div style={styles.backdrop} onClick={() => setSidebarOpen(false)} />
              <div style={styles.drawer}>
                <ChatSidebar
                  chats={chats}
                  activeChatId={activeChatId}
                  onSelectChat={handleSelectChat}
                  onNewChat={handleNewChat}
                  onDeleteChat={handleDeleteChat}
                  onRenameChat={handleRenameChat}
                />
              </div>
            </>
          )
        ) : (
          <ChatSidebar
            chats={chats}
            activeChatId={activeChatId}
            onSelectChat={handleSelectChat}
            onNewChat={handleNewChat}
            onDeleteChat={handleDeleteChat}
            onRenameChat={handleRenameChat}
          />
        )}
        <div style={styles.chatArea}>
          <AIChatBox
            key={activeChatId || "new"}
            chatId={activeChatId}
            isMobile={isMobile}
            aiName={aiName}
            greeting={`Hi, I'm ${aiName} — your Invoice Pro assistant. What would you like to do?`}
            onChatCreated={handleChatCreated}
            onChatUpdated={handleChatUpdated}
          />
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    padding: 24,
    gap: 16,
  },
  headerRow: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: "#777",
    margin: 0,
  },
  body: {
    flex: 1,
    display: "flex",
    minHeight: 400,
    border: "1px solid #eee",
    borderRadius: 12,
    overflow: "hidden",
  },
  chatArea: {
    flex: 1,
    minWidth: 0, // lets the chat shrink instead of overflowing
    minHeight: 400,
  },

  // ── mobile ──
  // 150px ≈ top header + floating bottom nav. Adjust if your layout differs.
  pageMobile: { padding: 12, gap: 10, height: "calc(100dvh - 150px)" },
  bodyMobile: { position: "relative", minHeight: 0 },
  chatsBtn: {
    marginLeft: "auto",
    border: "1px solid #ddd",
    background: "#fff",
    borderRadius: 999,
    padding: "6px 12px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  backdrop: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.3)",
    zIndex: 19,
  },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 270,
    maxWidth: "85%",
    zIndex: 20,
    background: "#fafafc",
    boxShadow: "4px 0 16px rgba(0,0,0,0.15)",
  },
};