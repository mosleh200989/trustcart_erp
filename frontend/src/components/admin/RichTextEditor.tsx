import dynamic from 'next/dynamic';
import React, { useMemo, useState, useCallback, Component } from 'react';
import 'react-quill/dist/quill.snow.css';

// Dynamically import ReactQuill with SSR disabled
const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => <div className="h-40 bg-gray-100 animate-pulse rounded-lg" />,
});

/**
 * Sanitize HTML before passing to Quill to avoid splitText offset crashes.
 * Quill struggles with certain HTML patterns (nested empty tags, unusual whitespace,
 * zero-width chars, deeply nested spans) which cause DOM text node offset mismatches.
 */
function sanitizeForQuill(html: string): string {
  if (!html) return '';
  let s = html;
  // Remove zero-width characters that confuse Quill's offset calculations
  s = s.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
  // Collapse multiple consecutive <br> into one
  s = s.replace(/(<br\s*\/?>){3,}/gi, '<br><br>');
  // Remove empty inline tags that create phantom text nodes
  s = s.replace(/<(span|strong|em|b|i|u|s|a)\b[^>]*>\s*<\/\1>/gi, '');
  // Convert non-breaking spaces to regular spaces (Quill handles its own)
  s = s.replace(/&nbsp;/g, ' ');
  return s;
}

// Error boundary to catch Quill splitText crashes gracefully
class QuillErrorBoundary extends Component<
  { children: React.ReactNode; onError: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('RichTextEditor caught error (falling back to textarea):', error.message);
    this.props.onError();
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

interface RichTextEditorProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  error?: string;
}

export default function RichTextEditor({
  label,
  value,
  onChange,
  placeholder = 'Enter description...',
  className = '',
  required = false,
  error,
}: RichTextEditorProps) {
  const [fallbackMode, setFallbackMode] = useState(false);

  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ color: [] }, { background: [] }],
        ['link'],
        ['clean'],
      ],
    }),
    []
  );

  const formats = [
    'header',
    'bold',
    'italic',
    'underline',
    'strike',
    'list',
    'bullet',
    'color',
    'background',
    'link',
  ];

  // Sanitize value to prevent Quill splitText crashes
  const safeValue = useMemo(() => sanitizeForQuill(value), [value]);

  const handleQuillError = useCallback(() => {
    setFallbackMode(true);
  }, []);

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {fallbackMode ? (
        <div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[150px] font-mono"
            rows={8}
          />
          <p className="text-xs text-amber-600 mt-1">
            Rich editor unavailable for this content. Using HTML editor instead.
            <button
              type="button"
              onClick={() => setFallbackMode(false)}
              className="ml-2 text-blue-600 underline"
            >
              Try rich editor again
            </button>
          </p>
        </div>
      ) : (
        <div className="rich-text-editor">
          <QuillErrorBoundary onError={handleQuillError}>
            <ReactQuill
              theme="snow"
              value={safeValue}
              onChange={onChange}
              modules={modules}
              formats={formats}
              placeholder={placeholder}
              className="bg-white rounded-lg"
            />
          </QuillErrorBoundary>
        </div>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      <style jsx global>{`
        .rich-text-editor .ql-container {
          min-height: 150px;
          font-size: 14px;
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
        }
        .rich-text-editor .ql-toolbar {
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
          background: #f9fafb;
        }
        .rich-text-editor .ql-editor {
          min-height: 120px;
        }
        .rich-text-editor .ql-editor.ql-blank::before {
          font-style: normal;
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
}
