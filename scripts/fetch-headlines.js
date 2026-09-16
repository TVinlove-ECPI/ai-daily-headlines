// scripts/fetch-headlines.js
// Run by .github/workflows/daily-headlines.yml on a daily schedule.
// Fetches AI-related headlines from multiple outlets server-side (no CORS
// restriction applies here — that's a browser-only rule) and writes a
// combined, sorted list to docs/headlines.json, served by GitHub Pages.
//
// No API key, no LLM — this is keyword filtering across public RSS feeds,
// not synthesis. See the project README for that distinction.

const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '..', 'docs', 'headlines.json');
const MAX_ITEMS = 30;
const MAX_PER_SOURCE = 6; // caps any one outlet from flooding the list

// Matches common AI-related terms as whole words, case-insensitive.
const AI_KEYWORD_REGEX = /\b(AI|A\.I\.|artificial intelligence|machine learning|deep learning|neural network|chatgpt|gpt-?\d|openai|anthropic|claude|gemini|copilot|llm|large language model|generative ai|genai|chatbot)\b/i;

// Each source is fetched independently — if one fails or is blocked,
// the others still populate the feed. filterAI: true means the feed is
// general (not AI-specific), so items are kept only if the title mentions
// AI. Reuters and AP no longer publish public RSS feeds directly, so
// those two route through Google News' public search feed instead —
// a workaround, not an official feed from those outlets.
const SOURCES = [
  { name: 'The New York Times', url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', filterAI: true },
  { name: 'The Washington Post', url: 'https://feeds.washingtonpost.com/rss/business/technology', filterAI: true },
  { name: 'NPR', url: 'https://feeds.npr.org/1019/rss.xml', filterAI: true },
  { name: 'Reuters', url: 'https://news.google.com/rss/search?q=AI+when:3d+site:reuters.com&hl=en-US&gl=US&ceid=US:en', filterAI: false, stripSourceSuffix: true },
  { name: 'AP', url: 'https://news.google.com/rss/search?q=AI+when:3d+site:apnews.com&hl=en-US&gl=US&ceid=US:en', filterAI: false, stripSourceSuffix: true },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', filterAI: true },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss', filterAI: true },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', filterAI: true },
  { name: 'CNBC', url: 'https://www.cnbc.com/id/19854910/device/rss/rss.html', filterAI: true },
  { name: 'Axios', url: 'https://api.axios.com/feed/top/', filterAI: true }
];

function decodeEntities(str) {
  return (str || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function extractTag(block, tag) {
  const cdataMatch = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`));
  if (cdataMatch) return cdataMatch[1].trim();
  const plainMatch = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return plainMatch ? decodeEntities(plainMatch[1].trim()) : '';
}

function parseFeed(xml) {
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) || xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  return blocks.map((block) => ({
    title: extractTag(block, 'title'),
    link: extractTag(block, 'link') || (block.match(/<link[^>]*href="([^"]+)"/) || [])[1] || '',
    pubDate: extractTag(block, 'pubDate') || extractTag(block, 'published') || extractTag(block, 'updated')
  }));
}

async function fetchSource(source) {
  const res = await fetch(source.url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AI-Headlines-Bot/1.0)' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();

  let items = parseFeed(xml);
  if (!items.length) throw new Error('no items found');

  if (source.filterAI) {
    items = items.filter((item) => AI_KEYWORD_REGEX.test(item.title));
  }

  items = items.slice(0, MAX_PER_SOURCE).map((item) => {
    let title = item.title;
    if (source.stripSourceSuffix) {
      title = title.replace(/\s+-\s+[^-]+$/, '').trim(); // strips " - Outlet Name" from Google News titles
    }
    return { title, link: item.link, pubDate: item.pubDate, source: source.name };
  });

  return items;
}

async function main() {
  const results = await Promise.allSettled(SOURCES.map(fetchSource));

  let combined = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      combined = combined.concat(result.value);
      console.log(`${SOURCES[i].name}: ${result.value.length} item(s)`);
    } else {
      console.warn(`${SOURCES[i].name} skipped: ${result.reason.message}`);
    }
  });

  if (!combined.length) {
    throw new Error('All sources failed — no items collected.');
  }

  // Sort newest first, dedupe by link, cap the total.
  combined.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  const seen = new Set();
  const deduped = combined.filter((item) => {
    if (seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });

  const output = {
    updated_at: new Date().toISOString(),
    items: deduped.slice(0, MAX_ITEMS)
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Wrote ${OUTPUT_PATH} with ${output.items.length} items from ${results.filter(r => r.status === 'fulfilled').length}/${SOURCES.length} sources.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
