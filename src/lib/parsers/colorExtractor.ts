// Color extraction utilities for CSS, HTML, and Markdown files

export interface ExtractedColor {
  name: string;
  hex: string;
  source: 'css-variable' | 'css-property' | 'inline-style' | 'hex-match';
}

// Common CSS color variable patterns
const CSS_VAR_PATTERNS = [
  /--([a-zA-Z0-9-_]+):\s*(#[0-9A-Fa-f]{3,8})/g,
  /--([a-zA-Z0-9-_]+):\s*rgb\((\d+),\s*(\d+),\s*(\d+)\)/g,
  /--([a-zA-Z0-9-_]+):\s*rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/g,
  /--([a-zA-Z0-9-_]+):\s*hsl\((\d+),\s*(\d+)%?,\s*(\d+)%?\)/g,
];

// Hex color pattern
const HEX_COLOR_PATTERN = /#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b/g;

// RGB/RGBA pattern
const RGB_PATTERN = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/g;

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function normalizeHex(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Expand 3-digit hex to 6-digit
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  
  // Take only first 6 characters (ignore alpha)
  hex = hex.slice(0, 6);
  
  return '#' + hex.toUpperCase();
}

function formatVariableName(name: string): string {
  // Convert kebab-case to Title Case
  return name
    .replace(/^--/, '')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function extractColorsFromCSS(cssContent: string): ExtractedColor[] {
  const colors: ExtractedColor[] = [];
  const seenHexes = new Set<string>();

  // Extract CSS custom properties (variables)
  const varMatches = cssContent.matchAll(/--([a-zA-Z0-9-_]+):\s*(#[0-9A-Fa-f]{3,8})/g);
  for (const match of varMatches) {
    const name = formatVariableName(match[1]);
    const hex = normalizeHex(match[2]);
    
    if (!seenHexes.has(hex)) {
      seenHexes.add(hex);
      colors.push({ name, hex, source: 'css-variable' });
    }
  }

  // Extract RGB variables
  const rgbVarMatches = cssContent.matchAll(/--([a-zA-Z0-9-_]+):\s*rgba?\((\d+),\s*(\d+),\s*(\d+)/g);
  for (const match of rgbVarMatches) {
    const name = formatVariableName(match[1]);
    const hex = rgbToHex(parseInt(match[2]), parseInt(match[3]), parseInt(match[4]));
    
    if (!seenHexes.has(hex)) {
      seenHexes.add(hex);
      colors.push({ name, hex, source: 'css-variable' });
    }
  }

  return colors;
}

export function extractColorsFromHTML(htmlContent: string): ExtractedColor[] {
  const colors: ExtractedColor[] = [];
  const seenHexes = new Set<string>();

  // Extract from inline styles
  const styleMatches = htmlContent.matchAll(/style="[^"]*(?:background-color|color|border-color):\s*(#[0-9A-Fa-f]{3,8}|rgba?\([^)]+\))[^"]*"/g);
  for (const match of styleMatches) {
    const colorMatch = match[0].match(/#[0-9A-Fa-f]{3,8}/);
    if (colorMatch) {
      const hex = normalizeHex(colorMatch[0]);
      if (!seenHexes.has(hex)) {
        seenHexes.add(hex);
        colors.push({ name: `Color ${colors.length + 1}`, hex, source: 'inline-style' });
      }
    }
  }

  // Extract from embedded style tags
  const styleTagMatches = htmlContent.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi);
  for (const match of styleTagMatches) {
    const cssColors = extractColorsFromCSS(match[1]);
    for (const color of cssColors) {
      if (!seenHexes.has(color.hex)) {
        seenHexes.add(color.hex);
        colors.push(color);
      }
    }
  }

  // Extract any hex colors in the document
  const hexMatches = htmlContent.matchAll(HEX_COLOR_PATTERN);
  for (const match of hexMatches) {
    const hex = normalizeHex(match[0]);
    if (!seenHexes.has(hex)) {
      seenHexes.add(hex);
      colors.push({ name: `Color ${colors.length + 1}`, hex, source: 'hex-match' });
    }
  }

  return colors;
}

export function extractColorsFromMarkdown(mdContent: string): ExtractedColor[] {
  const colors: ExtractedColor[] = [];
  const seenHexes = new Set<string>();

  // Look for color definitions in various formats
  // e.g., "Primary: #FF5733" or "- Primary Color: `#FF5733`"
  const colorDefMatches = mdContent.matchAll(/(?:^|\n)[\s*-]*([A-Za-z\s]+)(?:Color)?:\s*[`"]?(#[0-9A-Fa-f]{3,8})[`"]?/gi);
  for (const match of colorDefMatches) {
    const name = match[1].trim();
    const hex = normalizeHex(match[2]);
    
    if (!seenHexes.has(hex)) {
      seenHexes.add(hex);
      colors.push({ name, hex, source: 'hex-match' });
    }
  }

  // Extract any standalone hex colors
  const hexMatches = mdContent.matchAll(HEX_COLOR_PATTERN);
  for (const match of hexMatches) {
    const hex = normalizeHex(match[0]);
    if (!seenHexes.has(hex)) {
      seenHexes.add(hex);
      colors.push({ name: `Color ${colors.length + 1}`, hex, source: 'hex-match' });
    }
  }

  return colors;
}

export function extractColorsFromText(content: string, fileType: 'css' | 'html' | 'markdown' | 'unknown'): ExtractedColor[] {
  switch (fileType) {
    case 'css':
      return extractColorsFromCSS(content);
    case 'html':
      return extractColorsFromHTML(content);
    case 'markdown':
      return extractColorsFromMarkdown(content);
    default:
      // Try all extractors and combine unique results
      const cssColors = extractColorsFromCSS(content);
      const htmlColors = extractColorsFromHTML(content);
      const mdColors = extractColorsFromMarkdown(content);
      
      const seenHexes = new Set<string>();
      const allColors: ExtractedColor[] = [];
      
      for (const color of [...cssColors, ...htmlColors, ...mdColors]) {
        if (!seenHexes.has(color.hex)) {
          seenHexes.add(color.hex);
          allColors.push(color);
        }
      }
      
      return allColors;
  }
}

export function detectFileType(filename: string, mimeType?: string): 'css' | 'html' | 'markdown' | 'unknown' {
  // Check mime type first
  if (mimeType) {
    if (mimeType === 'text/css') return 'css';
    if (mimeType === 'text/html') return 'html';
    if (mimeType === 'text/markdown') return 'markdown';
  }

  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'css':
      return 'css';
    case 'html':
    case 'htm':
      return 'html';
    case 'md':
    case 'markdown':
      return 'markdown';
    default:
      return 'unknown';
  }
}
