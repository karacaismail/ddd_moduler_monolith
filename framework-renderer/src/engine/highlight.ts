/**
 * Mini syntax highlighter — Prism/Shiki yerine hafif regex-based.
 *
 * Desteklenen diller:
 *   typescript, ts, javascript, js, jsx, tsx,
 *   python, py, json, bash, sh, sql, scss, css, html, yaml, yml, go, rust
 *
 * Output: <span class="tok tok-{type}">...</span> ile sarılı tokens.
 * Css'de renkleri tanımlanmış olmalı.
 *
 * Bilinmeyen dil için input olduğu gibi escape edilmiş geri döner.
 */

type Lang =
  | 'typescript' | 'ts' | 'javascript' | 'js' | 'jsx' | 'tsx'
  | 'python' | 'py' | 'json' | 'bash' | 'sh' | 'sql'
  | 'scss' | 'css' | 'html' | 'yaml' | 'yml' | 'go' | 'rust';

const KEYWORDS: Record<string, RegExp> = {
  js: /\b(async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|from|function|if|import|in|instanceof|interface|let|new|null|of|private|protected|public|readonly|return|static|super|switch|this|throw|true|try|type|typeof|undefined|var|void|while|with|yield)\b/g,
  ts: /\b(any|as|async|await|break|case|catch|class|const|continue|debugger|declare|default|delete|do|else|enum|export|extends|false|finally|for|from|function|if|implements|import|in|instanceof|interface|is|keyof|let|namespace|never|new|null|number|of|private|protected|public|readonly|return|satisfies|static|string|super|switch|this|throw|true|try|type|typeof|undefined|unknown|var|void|while|with|yield)\b/g,
  py: /\b(False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield)\b/g,
  go: /\b(break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var)\b/g,
  rust: /\b(as|async|await|break|const|continue|crate|dyn|else|enum|extern|false|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|super|trait|true|type|unsafe|use|where|while)\b/g,
  sh: /\b(if|then|else|elif|fi|case|esac|for|while|do|done|in|function|return|exit|break|continue|local|export|alias|unset|echo|read|cd|pwd|ls|cat|grep|sed|awk|find)\b/g,
  sql: /\b(SELECT|FROM|WHERE|AND|OR|NOT|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|DROP|ALTER|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP|BY|ORDER|HAVING|LIMIT|OFFSET|UNION|AS|DISTINCT|NULL|TRUE|FALSE)\b/gi,
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;',
  );
}

function normalizeLang(lang: string): keyof typeof KEYWORDS | 'json' | 'css' | 'html' | 'yaml' | null {
  const l = lang.toLowerCase();
  if (['ts', 'typescript', 'tsx'].includes(l)) return 'ts';
  if (['js', 'javascript', 'jsx'].includes(l)) return 'js';
  if (['py', 'python'].includes(l)) return 'py';
  if (['go', 'golang'].includes(l)) return 'go';
  if (['rs', 'rust'].includes(l)) return 'rust';
  if (['bash', 'sh', 'shell', 'zsh'].includes(l)) return 'sh';
  if (l === 'sql') return 'sql';
  if (l === 'json') return 'json';
  if (['css', 'scss', 'sass'].includes(l)) return 'css';
  if (l === 'html') return 'html';
  if (['yaml', 'yml'].includes(l)) return 'yaml';
  return null;
}

export function highlight(code: string, lang: string): string {
  const norm = normalizeLang(lang);
  if (!norm) return escapeHtml(code);

  // 1. Token koruma — string/comment/number önce, sonra keyword
  // Çakışmaları önlemek için "placeholder" tekniği
  const placeholders: string[] = [];
  const PH = (i: number) => `\x00PH${i}\x00`;
  const grab = (re: RegExp, cls: string) => {
    code = code.replace(re, (m) => {
      placeholders.push(`<span class="tok tok-${cls}">${escapeHtml(m)}</span>`);
      return PH(placeholders.length - 1);
    });
  };

  // Yorumlar
  if (['ts', 'js'].includes(norm)) {
    grab(/\/\/[^\n]*/g, 'cmt');
    grab(/\/\*[\s\S]*?\*\//g, 'cmt');
  } else if (norm === 'py' || norm === 'sh' || norm === 'yaml') {
    grab(/#[^\n]*/g, 'cmt');
  } else if (norm === 'sql' || norm === 'css') {
    grab(/--[^\n]*/g, 'cmt');
    grab(/\/\*[\s\S]*?\*\//g, 'cmt');
  } else if (norm === 'go' || norm === 'rust') {
    grab(/\/\/[^\n]*/g, 'cmt');
    grab(/\/\*[\s\S]*?\*\//g, 'cmt');
  }

  // String'ler
  grab(/"(?:[^"\\]|\\.)*"/g, 'str');
  grab(/'(?:[^'\\]|\\.)*'/g, 'str');
  if (['ts', 'js'].includes(norm)) grab(/`(?:[^`\\]|\\.)*`/g, 'str');

  // Sayılar
  grab(/\b\d+(\.\d+)?\b/g, 'num');

  // HTML escape rest
  code = escapeHtml(code);

  // Keywords (norm === 'json' || 'html' || 'yaml' || 'css' için keyword listesi yok)
  const kwRe = KEYWORDS[norm];
  if (kwRe) {
    code = code.replace(kwRe, (m) => `<span class="tok tok-kw">${m}</span>`);
  }

  // CSS property selector
  if (norm === 'css') {
    code = code.replace(/^([\w-]+)\s*:/gm, (_m, p1: string) => `<span class="tok tok-kw">${p1}</span>:`);
  }

  // JSON keys
  if (norm === 'json') {
    code = code.replace(/(&quot;[^&]+?&quot;)\s*:/g, (_, k: string) => `<span class="tok tok-kw">${k}</span>:`);
  }

  // Placeholder geri al
  code = code.replace(/\x00PH(\d+)\x00/g, (_, i) => placeholders[Number(i)] ?? '');

  return code;
}
