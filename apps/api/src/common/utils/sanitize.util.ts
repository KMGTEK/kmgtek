import sanitizeHtmlLib from 'sanitize-html';

const RICH_TEXT_OPTIONS: sanitizeHtmlLib.IOptions = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr', 'blockquote', 'pre', 'code',
    'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'u', 's', 'sub', 'sup',
    'a', 'img', 'figure', 'figcaption',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
    'div', 'span', 'section', 'small', 'mark',
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel', 'title'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    '*': ['class', 'id', 'style'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  allowedStyles: {
    '*': {
      'text-align': [/^left$|^right$|^center$|^justify$/],
      color: [/^#(0x)?[0-9a-f]+$/i, /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+/],
      'background-color': [/^#(0x)?[0-9a-f]+$/i, /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+/],
    },
  },
  transformTags: {
    a: sanitizeHtmlLib.simpleTransform('a', { rel: 'noopener noreferrer' }),
  },
};

/**
 * Sanitize rich text coming from the admin editor before persisting it.
 * Always run user/admin supplied HTML through this — never store raw input.
 */
export const sanitizeRichText = (html: string): string => sanitizeHtmlLib(html, RICH_TEXT_OPTIONS);

/** Strip every tag (used for excerpts, search indexes and plain-text emails). */
export const stripHtml = (html: string): string =>
  sanitizeHtmlLib(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim();
