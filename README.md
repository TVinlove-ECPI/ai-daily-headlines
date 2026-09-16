# AI Daily Headlines Feed

A small, self-updating feed of daily AI news headlines, built for embedding
in an Articulate Rise course. No AI model, no API key — it pulls AI-related
headlines directly from the public RSS feeds of ten major outlets: The New
York Times, The Washington Post, NPR, Reuters, AP, TechCrunch, Wired, The
Verge, CNBC, and Axios.

This is keyword filtering across public feeds, not AI synthesis — it
collects and sorts real headlines, it doesn't summarize or interpret them.

## How it works

1. **`.github/workflows/daily-headlines.yml`** runs on a daily schedule
   (GitHub Actions), plus can be triggered manually from the Actions tab.
2. It runs **`scripts/fetch-headlines.js`**, which fetches all ten
   outlets' feeds, keeps only items that mention AI-related terms (for
   the general-news outlets — TechCrunch/Wired/etc. are filtered the
   same way since their feeds aren't AI-specific), sorts everything by
   date, and writes the combined list to **`docs/headlines.json`**.
3. **GitHub Pages** serves that file publicly from
   `https://<username>.github.io/<repo>/headlines.json`.
4. The Rise course embeds a small HTML/JS block that fetches that URL
   and renders it as a formatted, dated, source-labeled headline list
   for learners — see `rise-headlines-embed-github.html`.

Nothing in this repo needs a secret, API key, or manual daily update.
Once set up, it runs itself.

### A note on two of the ten sources

Reuters and AP discontinued their public RSS feeds years ago. For those
two, the script routes through Google News' public search feed instead,
filtered to each outlet's site — a workaround, not an official feed from
either outlet. NPR's feed has also been known to intermittently block
non-US traffic; the script skips any source that fails rather than
breaking the whole feed, so this only means NPR's headlines are
occasionally thinner on a given day, not that anything is broken.

## Repo structure

```
.github/workflows/daily-headlines.yml   # the daily schedule
scripts/fetch-headlines.js              # fetches, filters, and combines all 10 feeds
docs/headlines.json                     # generated output (served via Pages)
```

## Changing how many headlines show

The number of items displayed in Rise is set separately from how many are
collected. In `rise-headlines-embed-github.html`, find:

```
var ISSUES_TO_SHOW = 12;
```

Change the number and re-paste the file into Rise's embed block. (The
underlying `headlines.json` holds up to 30 items regardless, so lowering
this number just trims what's displayed, not what's collected.)

## Changing the schedule

Edit the `cron` line in `daily-headlines.yml`. It's currently set to
`0 11 * * *` (11:00 UTC), which doesn't shift with daylight saving —
adjust the hour if you want headlines ready earlier or later for your
timezone.

## If it stops working

- **Actions tab** shows the history of every run — a red X means it
  failed; click in to see the error log.
- Click into a run and expand the "Fetch headlines" step — it logs how
  many items came from each of the 10 sources, and warns (without
  failing the whole run) about any source that didn't respond.
- If one or two sources go quiet for good (an outlet changes its feed
  URL or format), edit the `SOURCES` list near the top of
  `fetch-headlines.js` — each entry is just a name and a URL, easy to
  update, remove, or add to.
- The Rise embed shows a friendly fallback message rather than breaking
  the page if `headlines.json` is ever unreachable.

## Attribution

Headlines and links are sourced from the public feeds of The New York
Times, The Washington Post, NPR, Reuters, AP, TechCrunch, Wired, The
Verge, CNBC, and Axios. This repo only stores and displays their public
titles and links — no article content is reproduced.
