// 브라우저와 Node(scripts/build.mjs) 양쪽에서 쓰므로 DOM에 의존하지 않는다.
const FM_RE = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

function parseValue(raw) {
  const v = raw.trim();
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v.startsWith('[') && v.endsWith(']')) {
    return v.slice(1, -1).split(',').map((s) => unquote(s.trim())).filter(Boolean);
  }
  return unquote(v);
}

function unquote(s) {
  if (s.length >= 2 && (s[0] === '"' || s[0] === "'") && s.at(-1) === s[0]) return s.slice(1, -1);
  return s;
}

export function parseFrontMatter(text) {
  const match = FM_RE.exec(text);
  if (!match) return { data: {}, body: text };

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx < 1 || line.trimStart().startsWith('#')) continue;
    data[line.slice(0, idx).trim()] = parseValue(line.slice(idx + 1));
  }
  return { data, body: text.slice(match[0].length) };
}
