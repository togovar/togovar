declare module '*.scss' {
  import type { CSSResult } from 'lit';
  const content: CSSResult;
  export default content;
}

declare module '*.sass' {
  import type { CSSResult } from 'lit';
  const content: CSSResult;
  export default content;
}

declare module '*.css' {
  import type { CSSResult } from 'lit';
  const content: CSSResult;
  export default content;
}

declare module '*.module.scss' {
  const classes: Record<string, string>;
  export default classes;
}

declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}

// Asset imports with file-loader
declare module '!file-loader?name=[name].[ext]!*' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.jsonld' {
  const content: string;
  export default content;
}
