// 마크다운 → HTML. DOM에 의존하지 않는 순수 함수라 Node에서도 테스트할 수 있다.
// 모든 텍스트는 먼저 이스케이프하며, 원본의 raw HTML은 허용하지 않는다.

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 이스케이프가 끝난 URL에서 위험한 스킴을 차단한다.
function safeUrl(url) {
  return /^\s*(javascript|data|vbscript):/i.test(url) ? '#' : url;
}

function inline(src) {
  const codes = [];
  let s = src.replace(/`([^`]+)`/g, (_, code) => {
    codes.push(code);
    return `\u0000${codes.length - 1}\u0000`;
  });

  s = escapeHtml(s);

  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;(.*?)&quot;)?\)/g, (_, alt, url, title) =>
    `<img src="${safeUrl(url)}" alt="${alt}"${title ? ` title="${title}"` : ''} loading="lazy">`);

  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;(.*?)&quot;)?\)/g, (_, text, url, title) => {
    const external = /^https?:\/\//i.test(url) ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${safeUrl(url)}"${title ? ` title="${title}"` : ''}${external}>${text}</a>`;
  });

  s = s
    .replace(/\*\*(.+?)\*\*|__(.+?)__/g, (_, a, b) => `<strong>${a ?? b}</strong>`)
    .replace(/\*(?!\s)(.+?)(?<!\s)\*|(?<![\w])_(?!\s)(.+?)(?<!\s)_(?![\w])/g, (_, a, b) => `<em>${a ?? b}</em>`)
    .replace(/~~(.+?)~~/g, '<del>$1</del>');

  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${escapeHtml(codes[i])}</code>`);
}

const FENCE_RE = /^\s*(```|~~~)\s*([\w+#.-]*)\s*$/;
const HEADING_RE = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const HR_RE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const LIST_RE = /^(\s*)([-*+]|\d+\.)\s+(.*)$/;
const TABLE_SEP_RE = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

const isBlank = (l) => l.trim() === '';

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

function startsBlock(lines, i) {
  const l = lines[i];
  return FENCE_RE.test(l) || HEADING_RE.test(l) || HR_RE.test(l) || LIST_RE.test(l) || /^\s*>/.test(l)
    || (l.includes('|') && i + 1 < lines.length && TABLE_SEP_RE.test(lines[i + 1]) && lines[i + 1].includes('-'));
}

function renderList(lines, start) {
  const first = LIST_RE.exec(lines[start]);
  const base = first[1].length;
  const ordered = /\d/.test(first[2]);
  const items = [];
  let i = start;

  while (i < lines.length) {
    const m = LIST_RE.exec(lines[i]);
    if (!m || m[1].length !== base || /\d/.test(m[2]) !== ordered) break;

    const content = [m[3]];
    i++;
    while (i < lines.length && !isBlank(lines[i])) {
      const indent = lines[i].match(/^\s*/)[0].length;
      if (indent <= base) break;
      content.push(lines[i].slice(Math.min(indent, base + 2)));
      i++;
    }
    // 항목 사이의 빈 줄은 건너뛰되, 같은 목록이 이어질 때만
    if (i < lines.length && isBlank(lines[i])) {
      let j = i;
      while (j < lines.length && isBlank(lines[j])) j++;
      const next = j < lines.length ? LIST_RE.exec(lines[j]) : null;
      if (next && next[1].length === base && /\d/.test(next[2]) === ordered) i = j;
    }
    items.push(content);
  }

  const html = items.map(([head, ...rest]) => {
    const task = /^\[([ xX])\]\s+(.*)$/.exec(head);
    const label = task
      ? `<input type="checkbox" disabled${task[1] === ' ' ? '' : ' checked'}> ${inline(task[2])}`
      : inline(head);
    const nested = rest.length ? renderBlocks(rest) : '';
    return `<li${task ? ' class="task"' : ''}>${label}${nested}</li>`;
  }).join('');

  const tag = ordered ? 'ol' : 'ul';
  return { html: `<${tag}>${html}</${tag}>`, next: i };
}

function renderBlocks(lines) {
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (isBlank(line)) { i++; continue; }

    const fence = FENCE_RE.exec(line);
    if (fence) {
      const code = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence[1])) code.push(lines[i++]);
      i++;
      const lang = fence[2];
      out.push(`<pre${lang ? ` data-lang="${escapeHtml(lang)}"` : ''}><code${lang ? ` class="language-${escapeHtml(lang)}"` : ''}>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    if (HR_RE.test(line)) { out.push('<hr>'); i++; continue; }

    if (/^\s*>/.test(line)) {
      const quote = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) quote.push(lines[i++].replace(/^\s*> ?/, ''));
      out.push(`<blockquote>${renderBlocks(quote)}</blockquote>`);
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length && TABLE_SEP_RE.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      const head = splitRow(line);
      const aligns = splitRow(lines[i + 1]).map((c) =>
        c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : '');
      i += 2;
      const rows = [];
      while (i < lines.length && !isBlank(lines[i]) && lines[i].includes('|')) rows.push(splitRow(lines[i++]));
      const cell = (tag, text, n) => `<${tag}${aligns[n] ? ` style="text-align:${aligns[n]}"` : ''}>${inline(text)}</${tag}>`;
      out.push(`<div class="table-wrap"><table><thead><tr>${head.map((c, n) => cell('th', c, n)).join('')}</tr></thead>`
        + `<tbody>${rows.map((r) => `<tr>${head.map((_, n) => cell('td', r[n] ?? '', n)).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }

    if (LIST_RE.test(line)) {
      const { html, next } = renderList(lines, i);
      out.push(html);
      i = next;
      continue;
    }

    const para = [line.trim()];
    i++;
    while (i < lines.length && !isBlank(lines[i]) && !startsBlock(lines, i)) para.push(lines[i++].trim());
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }

  return out.join('\n');
}

export function renderMarkdown(src) {
  return renderBlocks(src.replace(/\r\n?/g, '\n').split('\n'));
}
