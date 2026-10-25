// 해시 기반 라우터: #/ , #/tag/<tag> , #/post/<slug>
export function parseRoute(hash = location.hash) {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map((p) => {
    try { return decodeURIComponent(p); } catch { return p; }
  });

  if (parts.length === 0) return { name: 'home' };
  if (parts[0] === 'post' && parts[1]) return { name: 'post', slug: parts[1] };
  if (parts[0] === 'tag' && parts[1]) return { name: 'tag', tag: parts[1] };
  return { name: 'notfound' };
}

export function startRouter(onRoute) {
  const handle = () => onRoute(parseRoute());
  window.addEventListener('hashchange', handle);
  handle();
}
