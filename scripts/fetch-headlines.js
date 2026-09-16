// scripts/fetch-headlines.js
// Run by .github/workflows/daily-headlines.yml on a daily schedule.
// Fetches TLDR AI's public RSS feed server-side (no CORS restriction
// applies here — that's a browser-only rule) and writes the latest
// items to docs/headlines.json, served by GitHub Pages.

const fs = require('fs');
const path = require('path');

const FEED_URL = 'https://tldr.tech/api/rss/ai';
const OUTPUT_PATH = path.join(__dirname, '..', 'docs', 'headlines.json');
const MAX_ITEMS = 10;

async function main() {
  const res = await fetch(FEED_URL);
  if (!res.ok) {
    throw new Error(`Feed request failed: ${res.status}`);
  }
  const xml = await res.text();

  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  if (!itemBlocks.length) {
    throw new Error('No <item> blocks found in feed — TLDR may have changed its feed format.');
  }

  const items = itemBlocks.map((block) => {
    const title = (block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || [])[1] || '';
    const link = (block.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '';
    const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '';
    return { title: title.trim(), link: link.trim(), pubDate: pubDate.trim() };
  });

  const output = {
    updated_at: new Date().toISOString(),
    items: items.slice(0, MAX_ITEMS)
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Wrote ${OUTPUT_PATH} with ${output.items.length} items.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
