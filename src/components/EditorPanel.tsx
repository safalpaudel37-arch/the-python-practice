"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState, Prec } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { sql } from "@codemirror/lang-sql";

const editorTheme = EditorView.theme({
  "&": { height: "100%" },
  ".cm-scroller": { overflow: "auto" },
  ".cm-content": { fontFamily: "'JetBrains Mono', 'Fira Code', monospace" },
});

export interface EditorPanelHandle {
  focus(): void;
  reset(): void;
}

type Props = {
  initialCode: string;
  onChange: (code: string) => void;
  onRun?: () => void;
  language?: 'python' | 'javascript' | 'sql';
};

const EditorPanel = forwardRef<EditorPanelHandle, Props>(function EditorPanel(
  { initialCode, onChange, onRun, language = 'python' },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onRunRef = useRef(onRun);
  useEffect(() => { onRunRef.current = onRun; });

  useImperativeHandle(ref, () => ({
    focus() {
      viewRef.current?.focus();
    },
    reset() {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: '' },
      });
    },
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const view = new EditorView({
      state: EditorState.create({
        doc: initialCode,
        extensions: [
          basicSetup,
          language === 'sql'
            ? sql()
            : language === 'javascript'
              ? javascript()
              : python(),
          editorTheme,
          Prec.highest(
            keymap.of([
              {
                key: 'Mod-Enter',
                run: () => {
                  onRunRef.current?.();
                  return true;
                },
              },
            ])
          ),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChange(update.state.doc.toString());
            }
          }),
        ],
      }),
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full overflow-hidden [&_.cm-editor]:h-full [&_.cm-scroller]:h-full"
    />
  );
});

export default EditorPanel;
