// posts/*.md 의 front matter를 읽어 posts/index.json 을 생성한다.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseFrontMatter } from '../js/frontmatter.js';

const postsDir = fileURLToPath(new URL('../posts/', import.meta.url));

const files = (await readdir(postsDir)).filter((f) => f.endsWith('.md'));
const posts = [];

for (const file of files) {
  const slug = file.replace(/\.md$/, '');
  const { data, body } = parseFrontMatter(await readFile(postsDir + file, 'utf8'));

  if (data.draft === true) continue;
  if (!data.title || !data.date) {
    console.warn(`건너뜀: ${file} (title, date 필요)`);
    continue;
  }

  posts.push({
    slug,
    title: data.title,
    date: data.date,
    tags: Array.isArray(data.tags) ? data.tags : [],
    summary: data.summary ?? '',
    minutes: Math.max(1, Math.round(body.replace(/\s/g, '').length / 500)),
  });
}

posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
await writeFile(postsDir + 'index.json', JSON.stringify(posts, null, 2) + '\n');
console.log(`posts/index.json 생성: ${posts.length}개`);
