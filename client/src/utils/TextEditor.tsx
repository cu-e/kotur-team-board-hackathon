import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Button, Gapped } from '@skbkontur/react-ui';

import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  CLEAR_HISTORY_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
} from 'lexical';

import { HeadingNode, $createHeadingNode, QuoteNode } from '@lexical/rich-text';

import {
  ListNode,
  ListItemNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from '@lexical/list';

import { LinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { CodeNode } from '@lexical/code';
import { TRANSFORMERS } from '@lexical/markdown';
import { $setBlocksType } from '@lexical/selection';

import {
  Bold as IconBold,
  Italic as IconItalic,
  Underline as IconUnderline,
  Code as IconCode,
  AlignLeft as IconAlignLeft,
  AlignCenter as IconAlignCenter,
  AlignRight as IconAlignRight,
  Heading1 as IconH1,
  Heading2 as IconH2,
  List as IconListBulleted,
  ListOrdered as IconListNumbered,
  Link as IconLink,
  Link2Off as IconUnlink,
  RotateCcw as IconUndo,
  RotateCw as IconRedo,
  Trash2 as IconClear,
} from 'lucide-react';
import { createPortal } from 'react-dom';

type IssuePayload = {
  title: string;
  contentJSON: string;
  contentText: string;
};
const tiny = { fontSize: 12, lineHeight: '16px', padding: 0 } as const;

function CmdButton(props: React.ComponentProps<typeof Button> & { icon?: React.ReactNode }) {
  const { icon, children, ...rest } = props;
  return (
    <Button
      {...rest}
      size={props.size ?? 'small'}
      onMouseDown={(e: React.MouseEvent) => {
        e.preventDefault();
        props.onMouseDown?.(e);
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {icon}
        <span>{children}</span>
      </span>
    </Button>
  );
}

/** Toolbar внутри LexicalComposer — команды шлём editor.dispatchCommand */
function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();

  const doCmd = useCallback(
    (cmd: any, payload?: any) => () => {
      editor.focus();

      if (cmd === 'h1' || cmd === 'h2') {
        editor.update(() => {
          const sel = $getSelection();
          if ($isRangeSelection(sel)) {
            $setBlocksType(sel, () => $createHeadingNode(cmd as 'h1' | 'h2'));
          }
        });
        return;
      }

      if (cmd === 'link') {
        const url = window.prompt('URL:', 'https://') || null;
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, url); // null => unlink
        return;
      }

      if (cmd === 'clear') {
        // Полная очистка + сброс истории Undo/Redo
        editor.update(() => {
          const root = $getRoot();
          root.clear();
          root.append($createParagraphNode());
        });
        editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
        return;
      }

      editor.dispatchCommand(cmd, payload);
    },
    [editor],
  );

  return (
    <div style={{ marginBottom: 8 }}>
      <Gapped gap={8}>
        <CmdButton icon={<IconUndo size={16} />} onClick={doCmd(UNDO_COMMAND)}>
          Undo
        </CmdButton>
        <CmdButton icon={<IconRedo size={16} />} onClick={doCmd(REDO_COMMAND)}>
          Redo
        </CmdButton>

        <CmdButton icon={<IconBold size={16} />} onClick={doCmd(FORMAT_TEXT_COMMAND, 'bold')}>
          Bold
        </CmdButton>
        <CmdButton icon={<IconItalic size={16} />} onClick={doCmd(FORMAT_TEXT_COMMAND, 'italic')}>
          Italic
        </CmdButton>
        <CmdButton
          icon={<IconUnderline size={16} />}
          onClick={doCmd(FORMAT_TEXT_COMMAND, 'underline')}
        >
          Underline
        </CmdButton>
        <CmdButton icon={<IconCode size={16} />} onClick={doCmd(FORMAT_TEXT_COMMAND, 'code')}>
          Code
        </CmdButton>

        <CmdButton
          icon={<IconAlignLeft size={16} />}
          onClick={doCmd(FORMAT_ELEMENT_COMMAND, 'left')}
        >
          Left
        </CmdButton>
        <CmdButton
          icon={<IconAlignCenter size={16} />}
          onClick={doCmd(FORMAT_ELEMENT_COMMAND, 'center')}
        >
          Center
        </CmdButton>
        <CmdButton
          icon={<IconAlignRight size={16} />}
          onClick={doCmd(FORMAT_ELEMENT_COMMAND, 'right')}
        >
          Right
        </CmdButton>

        <CmdButton icon={<IconH1 size={16} />} onClick={doCmd('h1')}>
          H1
        </CmdButton>
        <CmdButton icon={<IconH2 size={16} />} onClick={doCmd('h2')}>
          H2
        </CmdButton>

        <CmdButton
          icon={<IconListBulleted size={16} />}
          onClick={doCmd(INSERT_UNORDERED_LIST_COMMAND)}
        >
          Bulleted
        </CmdButton>
        <CmdButton
          icon={<IconListNumbered size={16} />}
          onClick={doCmd(INSERT_ORDERED_LIST_COMMAND)}
        >
          Numbered
        </CmdButton>
        <CmdButton onClick={doCmd(REMOVE_LIST_COMMAND)}>Unlist</CmdButton>

        <CmdButton icon={<IconLink size={16} />} onClick={doCmd('link')}>
          Link
        </CmdButton>
        <CmdButton icon={<IconUnlink size={16} />} onClick={doCmd('link', null)}>
          Unlink
        </CmdButton>

        <CmdButton icon={<IconClear size={16} />} use="default" onClick={doCmd('clear')}>
          Clear
        </CmdButton>
      </Gapped>
    </div>
  );
}

export default function IssueEditor(props: {
  defaultTitle?: string;
  defaultContent?: string;
  onSubmit?: (data: IssuePayload) => void;
}) {
  const { defaultTitle = '', defaultContent, onSubmit } = props;
  const [title] = useState(defaultTitle);

  const initialConfig = useMemo(
    () => ({
      namespace: 'issue-editor',
      onError(error: unknown) {
        // eslint-disable-next-line no-console
        console.error(error);
      },
      nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, CodeNode],
      theme: {
        paragraph: 'issue-p',
        link: 'issue-link',
        text: {
          bold: 'issue-bold',
          italic: 'issue-italic',
          underline: 'issue-underline',
          code: 'issue-code',
        },
        heading: {
          h1: 'issue-h1',
          h2: 'issue-h2',
        },
        list: {
          ul: 'issue-ul',
          ol: 'issue-ol',
          listitem: 'issue-li',
        },
      },
    }),
    [],
  );

  const editorRef = useRef<any>(null);
  const contentRef = useRef<string>('');

  const handleChange = useCallback((editorState: any) => {
    contentRef.current = JSON.stringify(editorState.toJSON());
  }, []);

  const exportPlain = useCallback((): string => {
    if (!editorRef.current) return '';
    let text = '';
    const state = editorRef.current.getEditorState();
    state.read(() => {
      const root = $getRoot();
      text = root.getTextContent();
    });
    return text;
  }, []);

  const submit = useCallback(() => {
    const contentJSON = contentRef.current || '';
    const contentText = exportPlain();
    const payload: IssuePayload = { title, contentJSON, contentText };
    onSubmit?.(payload);
  }, [exportPlain, onSubmit, title]);

  // Состояние контекстного меню (координаты и открыто/закрыто)
  const [menu, setMenu] = useState<{ open: boolean; x: number; y: number }>({
    open: false,
    x: 0,
    y: 0,
  });
  const openMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setMenu({ open: true, x: e.clientX, y: e.clientY });
  }, []);
  const closeMenu = useCallback(() => setMenu((m) => ({ ...m, open: false })), []);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <LexicalComposer initialConfig={initialConfig}>
        <ToolbarPlugin />
        <EditorShell
          onChange={handleChange}
          editorRef={editorRef}
          onContextMenu={openMenu}
          defaultContent={defaultContent}
        />
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        <ListPlugin />
        <LinkPlugin />
        <HistoryPlugin />

        {/* Контекстное меню — как ПЛАГИН внутри LexicalComposer, порталом в body */}
        <ContextMenuPlugin open={menu.open} x={menu.x} y={menu.y} onClose={closeMenu} />
      </LexicalComposer>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Gapped gap={8}>
          <Button use="primary" size={'large'} onClick={submit}>
            Создать ишью
          </Button>
        </Gapped>
      </div>
    </div>
  );
}

function EditorShell({
  onChange,
  editorRef,
  onContextMenu,
  defaultContent,
}: {
  onChange: (state: any, editor: any) => void;
  editorRef: React.MutableRefObject<any>;
  onContextMenu?: (e: React.MouseEvent) => void;
  defaultContent?: string;
}) {
  const contentWrapStyle: React.CSSProperties = {
    position: 'relative',
    border: '1px solid rgba(0,0,0,0.12)',
    borderRadius: 8,
    padding: 12,
    background: '#fff',
  };
  const editableStyle: React.CSSProperties = {
    minHeight: 180,
    outline: 'none',
    lineHeight: '1.5',
    fontSize: 14,
  };

  const [editor] = useLexicalComposerContext();

  // сохранить ref
  React.useEffect(() => {
    editorRef.current = editor;
    return () => {
      editorRef.current = null;
    };
  }, [editor]);

  React.useEffect(() => {
    if (defaultContent === undefined) return;

    editor.update(() => {
      const root = $getRoot();
      root.clear();

      // JSON editorState
      let applied = false;
      if (defaultContent && defaultContent.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(defaultContent);
          const state = editor.parseEditorState(parsed);
          editor.setEditorState(state);
          applied = true;
        } catch {}
      }

      // plain text
      if (!applied) {
        const text = defaultContent || '';
        const lines = text.split('\n');
        for (const line of lines) {
          const p = $createParagraphNode();
          if (line.length) {
            p.append($createTextNode(line));
          }
          root.append(p);
        }
      }
    });
  }, [editor, defaultContent]);

  return (
    <div style={contentWrapStyle} className="issue-editor" onContextMenu={onContextMenu}>
      <RichTextPlugin
        contentEditable={<ContentEditable style={editableStyle} />}
        ErrorBoundary={() => null}
      />
      <OnChangePlugin onChange={onChange} />
    </div>
  );
}

function ContextMenuPlugin({
  open,
  x,
  y,
  onClose,
}: {
  open: boolean;
  x: number;
  y: number;
  onClose: () => void;
}) {
  const [editor] = useLexicalComposerContext();

  React.useEffect(() => {
    if (!open) return;
    const onDocClick = () => onClose();
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open, onClose]);

  if (!open) return null;

  const act = (fn: () => void) => () => {
    editor.focus();
    fn();
    onClose();
  };

  const menu = (
    <div
      style={{
        position: 'fixed',
        top: y,
        left: x,
        zIndex: 9999,
        background: '#fff',
        minWidth: 200,
        border: '1px solid rgba(0,0,0,0.12)',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <Button
        size="small"
        use="text"
        narrow
        style={tiny}
        onClick={act(() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold'))}
      >
        <IconBold size={14} /> Bold
      </Button>
      <Button
        size="small"
        use="text"
        narrow
        style={tiny}
        onClick={act(() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic'))}
      >
        <IconItalic size={14} /> Italic
      </Button>
      <Button
        size="small"
        use="text"
        narrow
        style={tiny}
        onClick={act(() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline'))}
      >
        <IconUnderline size={14} /> Underline
      </Button>
      <Button
        size="small"
        use="text"
        narrow
        style={tiny}
        onClick={act(() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code'))}
      >
        <IconCode size={14} /> Code
      </Button>
      <Button
        size="small"
        use="text"
        narrow
        style={tiny}
        onClick={act(() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined))}
      >
        <IconListBulleted size={14} /> Bulleted
      </Button>
      <Button
        size="small"
        use="text"
        narrow
        style={tiny}
        onClick={act(() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined))}
      >
        <IconListNumbered size={14} /> Numbered
      </Button>
      <Button
        size="small"
        use="text"
        narrow
        style={tiny}
        onClick={act(() => editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined))}
      >
        Unlist
      </Button>
      <Button
        size="small"
        use="text"
        narrow
        style={tiny}
        onClick={act(() => {
          const url = window.prompt('URL:', 'https://') || null;
          editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
        })}
      >
        <IconLink size={14} /> Link
      </Button>
    </div>
  );

  return createPortal(menu, document.body);
}
