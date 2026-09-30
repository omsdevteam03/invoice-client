// TinyMCEEditor.jsx
import { useEffect, useRef, useState } from "react"; import { TinyMCE } from "oms-custom-tinymce/react";

// Runs fn() and puts BOTH scroll positions back afterwards.
// The app scrolls inside .main-content, not only the window.
function keepScroll(fn) {
  const main = document.querySelector(".main-content");
  const mainTop = main ? main.scrollTop : 0;
  const winX = window.scrollX;
  const winY = window.scrollY;
  fn();
  const restore = () => {
    if (main) main.scrollTop = mainTop;
    window.scrollTo(winX, winY);
  };
  restore();
  requestAnimationFrame(restore);
  setTimeout(restore, 100);
  setTimeout(restore, 400);
}

export default function TinyMCEEditor({
  id,
  value,
  onChange,
  accent = "#F97316",
  height = 400,
  placeholder = "",
  disabled = false,
}) {
  const editorRef = useRef(null);
  // True for exactly one render cycle right after the user types inside
  // the editor — lets us tell "value changed because I typed" apart from
  // "value changed because something outside (e.g. a template button)
  // set it", so we only push setContent() for the latter.
  const isInternalUpdate = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const wrapperRef = useRef(null);

  useEffect(() => {
  const el = wrapperRef.current;
  if (!el) return;

  // This custom TinyMCE wrapper doesn't fire onInit reliably, so instead
  // we watch the DOM directly for the real toolbar (class "tox-tinymce")
  // to appear, and hide our loading placeholder the moment it shows up.
  const check = () => {
    const toolbarEl = el.querySelector(".tox-tinymce");
    if (!toolbarEl) return false;

    // onInit doesn't always fire for this wrapper when many editors mount
    // at once — when that happens editorRef.current stays null and the
    // initial `value` never actually reaches the editor's content, even
    // though the toolbar/iframe render fine. Recover by pulling the live
    // instance straight from TinyMCE's own registry and force-syncing it.
    if (!editorRef.current && typeof window !== "undefined" && window.tinymce) {
      const inst = window.tinymce.get(id);
      if (inst && !inst.destroyed && inst.initialized) {
        editorRef.current = inst;
        const current = inst.getContent();
        if (current !== (value || "")) {
          keepScroll(() => inst.setContent(value || "", { no_selection: true }));
        }
      } else {
        // toolbar is in the DOM but the instance isn't fully initialized
        // yet — keep observing instead of giving up.
        return false;
      }
    }

    setIsLoading(false);
    return true;
  };

  if (check()) return; // already loaded

  const observer = new MutationObserver(() => {
    if (check()) observer.disconnect();
  });
  observer.observe(el, { childList: true, subtree: true });

  // Safety fallback: never get stuck loading forever.
  const fallback = setTimeout(() => setIsLoading(false), 4000);

  return () => { observer.disconnect(); clearTimeout(fallback); };
}, [id, value]);
  // TinyMCE only reads `value` once, at init — it never looks at the prop
  // again on its own. So when something external (template picker, "Save"
  // reset, etc.) changes `value`, we have to manually sync it into the
  // live editor instance, or the box on screen goes stale until remount
  // (which is why it only ever "fixed itself" on a full refresh).
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    const editor = editorRef.current;
    if (editor && typeof editor.getContent === "function" && !editor.destroyed) {
      const current = editor.getContent();
      if (current !== (value || "")) {
        keepScroll(() => editor.setContent(value || "", { no_selection: true }));
      }
    }
  }, [value]);

  // Without this, TinyMCE's internal editor registry (keyed by `id`) still
  // holds a reference to this editor after React unmounts it — e.g. when
  // switching from a named template layout to "Customize by Your Own", or
  // back again. The next mount with the same `id` then finds a stale
  // registry entry and fails to fully initialize, showing a plain textarea
  // instead of the rich editor until a full page refresh clears it.
  useEffect(() => {
    return () => {
      const editor = editorRef.current;
      if (editor && typeof editor.remove === "function" && !editor.destroyed) {
        try {
          editor.remove();
        } catch (err) {
          console.error("Failed to clean up TinyMCE editor on unmount:", err);
        }
      }
    };
  }, []);

  return (
    <>
      <style>{`
        .tox .tox-tbtn--enabled,
        .tox .tox-tbtn:hover,
        .tox .tox-tbtn:focus { color: ${accent} !important; }
        .tox .tox-toolbar__primary { background: #f8fafc !important; }
        .tox .tox-edit-area__iframe { background: #ffffff !important; }
          `}</style>
      {isLoading && (
        <div style={{
          height,
          border: "1px solid #E5E7EB",
          borderRadius: 8,
          backgroundColor: "#F8FAFC",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94A3B8",
          fontSize: 13,
        }}>
          Loading editor...
        </div>
      )}
      <div ref={wrapperRef} style={{ display: isLoading ? "none" : "block" }}>
        <TinyMCE
          key={id}
          id={id}
          onInit={(evt, editor) => {
            editorRef.current = editor;
            setIsLoading(false);
            keepScroll(() => {});   // undo any jump caused by initialising
          }}
          value={value ?? ""}
          onEditorChange={(content) => {
            isInternalUpdate.current = true;
            onChange?.(content);
          }}
          disabled={disabled}
          init={{
            baseUrl: "/assets/tinymce",
            auto_focus: false,
            scrollbars: true,
            height,
            menubar: false,
            placeholder,
            branding: false,
            plugins: [
              "advlist", "autolink", "lists", "link", "charmap",
              "preview", "anchor", "searchreplace", "visualblocks", "code",
              "fullscreen", "insertdatetime", "table", "help", "wordcount",
            ],
            toolbar:
              "undo redo | blocks | " +
              "bold italic forecolor | alignleft aligncenter " +
              "alignright alignjustify | bullist numlist outdent indent | " +
              "removeformat | help",
            content_style: `
            body {
              font-family: Inter, Helvetica, Arial, sans-serif;
              font-size: 14px;
              line-height: 1.7;
              color: #334155;
            }
            p { margin: 0 0 8px; }
            ul, ol { padding-left: 20px; margin: 0 0 8px; }
            li { margin-bottom: 4px; }
          `,
            skin: "oxide",
          }}
        />
      </div>
    </>
  );
}