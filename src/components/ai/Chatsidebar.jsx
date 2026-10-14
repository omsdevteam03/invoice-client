import { useState } from "react";

// Sidebar listing all saved conversations, grouped Today / Previous,
// with New Chat, delete (with confirm), and inline rename.
// Data comes from the parent (AIPage) so both the sidebar and the
// chat box stay in sync off a single source of truth.

export default function ChatSidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  onHide,
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const { today, previous } = groupChats(chats);

  function startRename(chat) {
    setOpenMenuId(null);
    setEditingId(chat.id);
    setEditValue(chat.title);
  }

  function commitRename(chatId) {
    const trimmed = editValue.trim();
    setEditingId(null);
    if (trimmed) onRenameChat(chatId, trimmed);
  }

  function requestDelete(chatId) {
    setOpenMenuId(null);
    setConfirmDeleteId(chatId);
  }

  function confirmDelete() {
    onDeleteChat(confirmDeleteId);
    setConfirmDeleteId(null);
  }

  function renderChatRow(chat) {
    const isActive = chat.id === activeChatId;
    const isEditing = editingId === chat.id;

    return (
      <div
        key={chat.id}
        style={{ ...styles.row, ...(isActive ? styles.rowActive : {}) }}
        onClick={() => !isEditing && onSelectChat(chat.id)}
      >
        {isEditing ? (
          <input
            autoFocus
            style={styles.renameInput}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={() => commitRename(chat.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename(chat.id);
              if (e.key === "Escape") setEditingId(null);
            }}
          />
        ) : (
          <span style={styles.rowTitle} title={chat.title}>
            {chat.title}
          </span>
        )}

        <div style={{ position: "relative" }}>
          <button
            style={styles.menuBtn}
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenuId(openMenuId === chat.id ? null : chat.id);
            }}
            aria-label="Chat options"
          >
            ⋮
          </button>

          {openMenuId === chat.id && (
            <div style={styles.menu} onClick={(e) => e.stopPropagation()}>
              <button style={styles.menuItem} onClick={() => startRename(chat)}>
                Rename
              </button>
              <button
                style={{ ...styles.menuItem, color: "#e04b4b" }}
                onClick={() => requestDelete(chat.id)}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.sidebar}>
      <div style={styles.topRow}>
        <button style={styles.newChatBtn} onClick={onNewChat}>
          + New Chat
        </button>
        {onHide && (
          <button
            style={styles.hideBtn}
            onClick={onHide}
            title="Hide chats"
            aria-label="Hide chats"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="3" />
              <line x1="9" y1="4" x2="9" y2="20" />
            </svg>
          </button>
        )}
      </div>

      <div style={styles.list}>
        {today.length > 0 && (
          <>
            <div style={styles.groupLabel}>Today</div>
            {today.map(renderChatRow)}
          </>
        )}

        {previous.length > 0 && (
          <>
            <div style={styles.groupLabel}>Previous</div>
            {previous.map(renderChatRow)}
          </>
        )}

        {chats.length === 0 && (
          <div style={styles.empty}>No conversations yet</div>
        )}
      </div>

      {confirmDeleteId && (
        <div style={styles.overlay} onClick={() => setConfirmDeleteId(null)}>
          <div style={styles.confirmBox} onClick={(e) => e.stopPropagation()}>
            <p style={{ margin: 0, fontSize: 14 }}>
              Delete this conversation? This can't be undone.
            </p>
            <div style={styles.confirmActions}>
              <button style={styles.cancelBtn} onClick={() => setConfirmDeleteId(null)}>
                Cancel
              </button>
              <button style={styles.deleteBtn} onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function groupChats(chats) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const today = [];
  const previous = [];

  for (const chat of chats) {
    const updated = new Date(chat.updated_at || chat.created_at);
    if (updated >= startOfToday) today.push(chat);
    else previous.push(chat);
  }

  return { today, previous };
}

const styles = {
  sidebar: {
    width: 260,
    minWidth: 260,
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid #eee",
    background: "#fafafc",
    height: "100%",
  },
  topRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    margin: 12,
  },
  newChatBtn: {
    flex: 1,
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #ddd",
    background: "#fff",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    textAlign: "left",
  },
  hideBtn: {
    width: 42,
    height: 42,
    flexShrink: 0,
    borderRadius: 10,
    border: "1px solid #ddd",
    background: "#fff",
    color: "#475569",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "0 8px 12px",
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    padding: "10px 8px 4px",
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "9px 10px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    gap: 8,
  },
  rowActive: {
    background: "#dff3ea",
  },
  rowTitle: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
  },
  renameInput: {
    flex: 1,
    fontSize: 14,
    padding: "4px 6px",
    borderRadius: 6,
    border: "1px solid #ccc",
    outline: "none",
  },
  menuBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: 16,
    color: "#888",
    padding: "0 4px",
    lineHeight: 1,
  },
  menu: {
    position: "absolute",
    right: 0,
    top: "100%",
    marginTop: 4,
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 8,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    zIndex: 10,
    minWidth: 110,
    overflow: "hidden",
  },
  menuItem: {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "8px 12px",
    border: "none",
    background: "#fff",
    fontSize: 13,
    cursor: "pointer",
  },
  empty: {
    padding: "20px 10px",
    color: "#aaa",
    fontSize: 13,
    textAlign: "center",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  confirmBox: {
    background: "#fff",
    borderRadius: 12,
    padding: 20,
    width: 280,
    boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
  },
  confirmActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid #ddd",
    background: "#fff",
    cursor: "pointer",
    fontSize: 13,
  },
  deleteBtn: {
    padding: "8px 14px",
    borderRadius: 8,
    border: "none",
    background: "#e04b4b",
    color: "#fff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },
};