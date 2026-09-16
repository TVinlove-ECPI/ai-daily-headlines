# AI Daily Headlines Feed

A small, self-updating feed of daily AI news headlines, built for embedding
in an Articulate Rise course. No AI model, no API key — it pulls directly
from [TLDR AI](https://tldr.tech/ai)'s public RSS feed once a day.

## How it works

1. **`.github/workflows/daily-headlines.yml`** runs on a daily schedule
   (GitHub Actions), plus can be triggered manually from the Actions tab.
2. It runs **`scripts/fetch-headlines.js`**, which fetches
   `https://tldr.tech/api/rss/ai` and writes the latest issues to
   **`docs/headlines.json`**.
3. **GitHub Pages** serves that file publicly from
   `https://<username>.github.io/<repo>/headlines.json`.
4. The Rise course embeds a small HTML/JS block that fetches that URL
   and renders it as a formatted headline list for learners — see
   `rise-headlines-embed-github.html`.

Nothing in this repo needs a secret, API key, or manual daily update.
Once set up, it runs itself.

## Repo structure

```
.github/workflows/daily-headlines.yml   # the daily schedule
scripts/fetch-headlines.js              # fetches + parses the RSS feed
docs/headlines.json                     # generated output (served via Pages)
```

## Changing the schedule

Edit the `cron` line in `daily-headlines.yml`. It's currently set to
`0 11 * * *` (11:00 UTC), which doesn't shift with daylight saving —
adjust the hour if you want headlines ready earlier or later for your
timezone.

## If it stops working

- **Actions tab** shows the history of every run — a red X means it
  failed; click in to see the error log.
- Most likely failure: TLDR changes its feed's URL or format. Check
  `https://tldr.tech/api/rss/ai` directly in a browser to confirm it's
  still returning XML in the expected shape.
- The Rise embed shows a friendly fallback message rather than breaking
  the page if `headlines.json` is ever unreachable.

## Attribution

Headlines and links are sourced from [TLDR AI](https://tldr.tech/ai),
a free daily newsletter. This repo only stores and displays their public
RSS titles and links — no article content is reproduced.
