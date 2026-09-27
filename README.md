# paperhurts.dev

The studio homepage: plain HTML and CSS with self-hosted fonts, no JavaScript, and no third-party requests.

## Add a project to the homepage

Tag the repo on GitHub with the topic **`paperhurts-dev`**. It must be public. The next build adds a card using the repo's description and main language:

```bash
gh repo edit paperhurts/<repo> --add-topic paperhurts-dev
gh workflow run deploy.yml -R paperhurts/paperhurts.github.io   # optional: publish now instead of waiting for the daily build
```

To pin its position or polish the card, add an entry to `projects.config.json`. You can set `label`, `blurb`, `url` (a live site instead of the repo page), and `privacy` (a privacy page on its Pages site, linked in the footer). `extra` holds cards for things that aren't public repos, such as the reader app.

## Project addresses

This repo is the GitHub **user site** (`paperhurts.github.io`) with the custom domain `paperhurts.dev`, so every Pages project is served at `paperhurts.dev/<repo>`. Projects with their own domain, like `waterways.paperhurts.dev`, keep it.

## Develop

```bash
npm run dev      # build from the committed projects.json and serve at http://localhost:5110
npm run fetch    # refresh projects.json from the GitHub API, then build
```

There are no dependencies to install; Node 20+ runs everything. `src/` holds the page templates and CSS. `scripts/build.mjs` fills in the project cards and privacy links and writes `dist/`. `.github/workflows/deploy.yml` builds and publishes to Pages on push, daily, and on demand.
