import { useState, useEffect, useCallback } from "react";
import AIChatBox from "../components/ai/Aichatbox";
import ChatSidebar from "../components/ai/Chatsidebar";

// Main AI assistant page — sidebar (chat history) + active chat box,
// same wiring pattern as DashboardPage, InvoicesPage etc.

const API_BASE = `${import.meta.env.VITE_API_URL}/chat`;
const LAST_CHAT_KEY = "nexa:lastActiveChatId";
const NAME_KEY = "ai:assistantName";
const DEFAULT_AI_NAME = "Nexa";

export default function AIPage() {
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
  }

  function handleSelectChat(chatId) {
    setActiveChatId(chatId);
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
    <div style={styles.page}>
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
          </div>
        )}
        <p style={styles.subtitle}>
          Ask about customers, invoices, quotations, or anything else in your dashboard.
        </p>
      </div>

      <div style={styles.body}>
        <ChatSidebar
          chats={chats}
          activeChatId={activeChatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
          onRenameChat={handleRenameChat}
        />
        <div style={styles.chatArea}>
          <AIChatBox
            key={activeChatId || "new"}
            chatId={activeChatId}
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
    minHeight: 400,
  },
};