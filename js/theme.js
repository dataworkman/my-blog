const KEY = 'theme';
const root = document.documentElement;

function save(theme) {
  try { localStorage.setItem(KEY, theme); } catch { /* 저장소 접근이 막힌 환경 */ }
}

function hasSaved() {
  try { return localStorage.getItem(KEY) !== null; } catch { return false; }
}

function apply(theme) {
  root.setAttribute('data-theme', theme);
}

export function initTheme(button) {
  button.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    apply(next);
    save(next);
  });

  // 사용자가 직접 고르지 않았다면 시스템 설정 변경을 따라간다
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!hasSaved()) apply(e.matches ? 'dark' : 'light');
  });
}
