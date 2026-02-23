const ALLOWED_TAGS = new Set([
  'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'del', 'sup', 'sub', 'code',
  'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'span', 'div',
]);

const BLOCKED_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed', 'form']);

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

const ALLOWED_GLOBAL_ATTRS = new Set(['style', 'class']);

const ALLOWED_ATTRS_BY_TAG: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height']),
};

const ALLOWED_STYLES = new Set([
  'color', 'background-color', 'font-size', 'font-weight',
  'font-style', 'text-align', 'text-decoration',
]);

function isAllowedUrl(url: string): boolean {
  const normalized = url.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  if (normalized.includes('javascript:')) {
    return false;
  }

  if (normalized.startsWith('data:') && !normalized.startsWith('data:image/')) {
    return false;
  }

  if (
    normalized.startsWith('/')
    || normalized.startsWith('./')
    || normalized.startsWith('../')
    || normalized.startsWith('#')
    || normalized.startsWith('data:image/')
  ) {
    return true;
  }

  try {
    const parsed = new URL(url, 'http://example.com');
    return ALLOWED_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

function sanitizeStyle(style: string): string {
  const safe: string[] = [];
  const declarations = style.split(';').map((item) => item.trim()).filter(Boolean);

  for (const declaration of declarations) {
    const separatorIndex = declaration.indexOf(':');
    if (separatorIndex === -1) {
      continue;
    }

    const property = declaration.slice(0, separatorIndex).trim().toLowerCase();
    const value = declaration.slice(separatorIndex + 1).trim();
    const normalizedValue = value.toLowerCase();

    if (!ALLOWED_STYLES.has(property)) {
      continue;
    }

    if (normalizedValue.includes('url(') || normalizedValue.includes('expression(')) {
      continue;
    }

    safe.push(`${property}: ${value}`);
  }

  return safe.join('; ');
}

function sanitizeAttributes(element: Element): void {
  const tagName = element.tagName.toLowerCase();
  const allowedTagAttrs = ALLOWED_ATTRS_BY_TAG[tagName] ?? new Set<string>();

  for (const attr of Array.from(element.attributes)) {
    const name = attr.name.toLowerCase();
    const value = attr.value;
    const isAllowedAttr = ALLOWED_GLOBAL_ATTRS.has(name) || allowedTagAttrs.has(name);

    if (name.startsWith('on')) {
      element.removeAttribute(attr.name);
      continue;
    }

    if (value.toLowerCase().includes('javascript:')) {
      element.removeAttribute(attr.name);
      continue;
    }

    if (!isAllowedAttr) {
      element.removeAttribute(attr.name);
      continue;
    }

    if ((name === 'href' || name === 'src') && !isAllowedUrl(value)) {
      element.removeAttribute(attr.name);
      continue;
    }

    if (name === 'style') {
      const safeStyle = sanitizeStyle(value);
      if (safeStyle) {
        element.setAttribute('style', safeStyle);
      } else {
        element.removeAttribute('style');
      }
    }
  }
}

function sanitizeNode(node: Node): void {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType !== Node.ELEMENT_NODE) {
      continue;
    }

    const element = child as Element;
    const tagName = element.tagName.toLowerCase();

    if (BLOCKED_TAGS.has(tagName)) {
      node.removeChild(element);
      continue;
    }

    if (!ALLOWED_TAGS.has(tagName)) {
      while (element.firstChild) {
        node.insertBefore(element.firstChild, element);
      }
      node.removeChild(element);
      continue;
    }

    sanitizeAttributes(element);
    sanitizeNode(element);
  }
}

export function sanitizeRichTextHtml(html: string): string {
  if (!html) {
    return '';
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(html, 'text/html');

  sanitizeNode(document.body);

  return document.body.innerHTML;
}
