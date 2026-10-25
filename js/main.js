import { escapeHtml, renderMarkdown } from './markdown.js';
import { parseFrontMatter } from './frontmatter.js';
import { startRouter } from './router.js';
import { initTheme } from './theme.js';

const SITE_TITLE = 'My Blog';
const app = document.getElementById('content');

let postsPromise;
function loadPosts() {
  postsPromise ??= fetch('posts/index.json')
    .then((res) => {
      if (!res.ok) throw new Error(`index.json ${res.status}`);
      return res.json();
    })
    .then((list) => list.filter((p) => !p.draft).sort((a, b) => String(b.date).localeCompare(String(a.date))));
  return postsPromise;
}

function formatDate(date) {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return escapeHtml(date);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

const postHref = (slug) => `#/post/${encodeURIComponent(slug)}`;
const tagHref = (tag) => `#/tag/${encodeURIComponent(tag)}`;

function tagList(tags = []) {
  if (!tags.length) return '';
  return `<ul class="tags">${tags.map((t) => `<li><a class="tag" href="${tagHref(t)}">#${escapeHtml(t)}</a></li>`).join('')}</ul>`;
}

function metaLine(post) {
  const minutes = post.minutes ? `<span>${post.minutes}분 읽기</span>` : '';
  return `<div class="meta"><time datetime="${escapeHtml(post.date)}">${formatDate(post.date)}</time>${minutes}</div>`;
}

function show(html, title) {
  app.innerHTML = html;
  document.title = title ? `${title} · ${SITE_TITLE}` : SITE_TITLE;
  window.scrollTo(0, 0);
  app.focus({ preventScroll: true });
}

function showMessage(message, title) {
  show(`<p class="status">${escapeHtml(message)}</p><p class="status"><a href="#/">홈으로 돌아가기</a></p>`, title);
}

async function renderList(tag) {
  const all = await loadPosts();
  const posts = tag ? all.filter((p) => (p.tags ?? []).includes(tag)) : all;

  const heading = tag ? `#${escapeHtml(tag)}` : '최근 글';
  const note = tag ? `<p class="filter-note">${posts.length}개의 글 · <a href="#/">전체 보기</a></p>` : '';

  if (!posts.length) {
    show(`<h1 class="page-title">${heading}</h1>${note}<p class="status">아직 글이 없습니다.</p>`, tag ? `#${tag}` : '');
    return;
  }

  const cards = posts.map((p) => `
    <li>
      <a class="post-card" href="${postHref(p.slug)}">
        <h2 class="post-card__title">${escapeHtml(p.title)}</h2>
        ${metaLine(p)}
        ${p.summary ? `<p class="post-card__summary">${escapeHtml(p.summary)}</p>` : ''}
      </a>
    </li>`).join('');

  show(`<h1 class="page-title">${heading}</h1>${note}<ul class="post-list">${cards}</ul>`, tag ? `#${tag}` : '');
}

async function renderPost(slug) {
  const posts = await loadPosts();
  // 목록에 있는 slug만 불러와 임의 경로 요청을 막는다
  const meta = posts.find((p) => p.slug === slug);
  if (!meta) {
    showMessage('글을 찾을 수 없습니다.', '404');
    return;
  }

  const res = await fetch(`posts/${encodeURIComponent(slug)}.md`);
  if (!res.ok) throw new Error(`${slug}.md ${res.status}`);
  const { body } = parseFrontMatter(await res.text());

  show(`
    <article class="post">
      <a class="back-link" href="#/">← 목록으로</a>
      <header class="post__header">
        <h1 class="post__title">${escapeHtml(meta.title)}</h1>
        ${metaLine(meta)}
        ${tagList(meta.tags)}
      </header>
      <div class="prose">${renderMarkdown(body)}</div>
    </article>`, meta.title);
}

async function onRoute(route) {
  try {
    if (route.name === 'home') await renderList();
    else if (route.name === 'tag') await renderList(route.tag);
    else if (route.name === 'post') await renderPost(route.slug);
    else showMessage('페이지를 찾을 수 없습니다.', '404');
  } catch (err) {
    console.error(err);
    showMessage('글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.', '오류');
  }
}

document.getElementById('year').textContent = new Date().getFullYear();
initTheme(document.getElementById('theme-toggle'));
startRouter(onRoute);
