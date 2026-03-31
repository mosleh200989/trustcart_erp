declare module 'react-quill' {
  import { Component } from 'react';

  export interface QuillOptions {
    theme?: string;
    modules?: Record<string, unknown>;
    formats?: string[];
    placeholder?: string;
    readOnly?: boolean;
    bounds?: string | HTMLElement;
    scrollingContainer?: string | HTMLElement;
  }

  export interface ReactQuillProps extends QuillOptions {
    value?: string;
    defaultValue?: string;
    onChange?: (content: string, delta: unknown, source: string, editor: unknown) => void;
    onChangeSelection?: (range: unknown, source: string, editor: unknown) => void;
    onFocus?: (range: unknown, source: string, editor: unknown) => void;
    onBlur?: (previousRange: unknown, source: string, editor: unknown) => void;
    onKeyPress?: React.KeyboardEventHandler<HTMLDivElement>;
    onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
    onKeyUp?: React.KeyboardEventHandler<HTMLDivElement>;
    className?: string;
    style?: React.CSSProperties;
    tabIndex?: number;
    preserveWhitespace?: boolean;
  }

  export default class ReactQuill extends Component<ReactQuillProps> {
    focus(): void;
    blur(): void;
    getEditor(): unknown;
  }
}
