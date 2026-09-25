import { useState, useEffect, useCallback } from "react";
import AIChatBox from "../components/ai/Aichatbox";
import ChatSidebar from "../components/ai/Chatsidebar";

// Main AI assistant page — sidebar (chat history) + active chat box,
// same wiring pattern as DashboardPage, InvoicesPage etc.

const API_BASE = `${import.meta.env.VITE_API_URL}/chat`;

export default function AIPage() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);

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

  function handleNewChat() {
    setActiveChatId(null); // AIChatBox creates the row lazily on first send
  }

  function handleSelectChat(chatId) {
    setActiveChatId(chatId);
  }

  // Called by AIChatBox the moment the very first message creates a chat
  function handleChatCreated(chat) {
    setActiveChatId(chat.id);
    setChats((prev) => [chat, ...prev]);
  }

  // Called after every message exchange — keeps title/order in sync
  function handleChatUpdated(chat) {
    setChats((prev) => {
      const rest = prev.filter((c) => c.id !== chat.id);
      return [chat, ...rest];
    });
  }

  async function handleRenameChat(chatId, title) {
    // Optimistic update
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, title } : c)));
    try {
      await fetch(`${API_BASE}/${chatId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
    } catch (err) {
      console.error(err);
      loadChats(); // fall back to server truth if it failed
    }
  }

  async function handleDeleteChat(chatId) {
    const prevChats = chats;
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (activeChatId === chatId) setActiveChatId(null);

    try {
      const res = await fetch(`${API_BASE}/${chatId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    } catch (err) {
      console.error(err);
      setChats(prevChats); // restore on failure
    }
  }

  return (
    <div style={styles.page}>
           <div style={styles.headerRow}>
        <h1 style={styles.title}>Nexa</h1>
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
            greeting="Hi, I'm Nexa — your Invoice Pro assistant. What would you like to do?"
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