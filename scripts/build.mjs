// Builds paperhurts.dev into dist/.
//
//   node scripts/build.mjs           render from the committed projects.json
//   node scripts/build.mjs --fetch   refresh projects.json from the GitHub API first
//
// A project card appears for every public paperhurts repo tagged with the
// topic in projects.config.json. The config only pins order and polishes copy.

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

const OWNER = "paperhurts";
const root = new URL("../", import.meta.url);
const at = (p) => new URL(p, root);
const config = JSON.parse(await readFile(at("projects.config.json"), "utf8"));
const ACCENTS = ["", "violet", "pink"];

async function gh(path) {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "paperhurts-dev-build" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) throw new Error(`GitHub ${path}: HTTP ${res.status}`);
  return res.json();
}

/** Public, unarchived repos carrying the topic. */
async function fetchRepos() {
  const q = encodeURIComponent(`user:${OWNER} topic:${config.topic} fork:true`);
  const found = await gh(`/search/repositories?q=${q}&per_page=100`);
  return found.items
    .filter((r) => !r.private && !r.archived)
    .map((r) => ({ name: r.name, description: r.description, language: r.language, url: r.html_url, hasPages: r.has_pages, created: r.created_at }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Cards in display order: pinned ones first, then newly tagged repos, oldest first. */
function cardList(repos) {
  const byName = new Map(repos.map((r) => [r.name, r]));
  const extra = new Map((config.extra ?? []).map((e) => [e.name, e]));
  const card = (name) => {
    const e = extra.get(name);
    if (e) return { ...e, pages: null };
    const r = byName.get(name);
    if (!r) return null;
    const c = config.cards?.[name] ?? {};
    return {
      name,
      label: c.label ?? (r.language ? r.language.toLowerCase() : "project"),
      blurb: c.blurb ?? r.description ?? "",
      // The repo page, unless the config points somewhere better (a live site).
      url: c.url ?? r.url,
      // Project Pages sites live under the user site's domain (see pagesHost in the config).
      pages: r.hasPages ? new URL(`${name}/`, config.pagesHost).href : null,
      privacy: c.privacy,
    };
  };
  const pinned = (config.order ?? []).map(card);
  for (const [i, name] of (config.order ?? []).entries()) {
    if (!pinned[i]) console.warn(`note: ${name} is in the config order but isn't tagged "${config.topic}" (or isn't public), so it's hidden`);
  }
  const rest = repos.filter((r) => !config.order?.includes(r.name)).sort((a, b) => a.created.localeCompare(b.created)).map((r) => card(r.name));
  return [...pinned, ...rest].filter(Boolean);
}

const cardHtml = (c, i) => `<a class="${["card", ACCENTS[i % 3]].filter(Boolean).join(" ")}" href="${esc(c.url)}">
          <span class="card-label">${String(i + 1).padStart(2, "0")} — ${esc(c.label)}</span>
          <div class="card-body">
            <span class="card-title">${esc(c.name)}</span>
            <span class="card-blurb">${esc(c.blurb)}</span>
          </div>
        </a>`;

const privacyHtml = (cards) =>
  cards.filter((c) => c.privacy && c.pages).map((c) => `<a href="${esc(new URL(c.privacy, c.pages).href)}">${esc(c.name)}</a>`).join("\n        ");

// ---------- main ----------
let repos;
if (process.argv.includes("--fetch")) {
  try {
    repos = await fetchRepos();
    await writeFile(at("projects.json"), JSON.stringify({ fetchedAt: new Date().toISOString(), topic: config.topic, repos }, null, 2) + "\n");
    console.log(`fetched ${repos.length} tagged repos: ${repos.map((r) => r.name).join(", ")}`);
  } catch (err) {
    console.warn(`::warning::Couldn't reach GitHub (${err.message}); building from the committed projects.json.`);
  }
}
repos ??= JSON.parse(await readFile(at("projects.json"), "utf8")).repos;

const cards = cardList(repos);
if (!cards.length) throw new Error("No project cards; refusing to publish an empty portfolio.");

await rm(at("dist"), { recursive: true, force: true });
await mkdir(at("dist"), { recursive: true });
for (const page of ["index.html", "add-ons.html"]) {
  let html = await readFile(at(`src/${page}`), "utf8");
  html = html.replace("<!-- @cards -->", cards.map(cardHtml).join("\n        "));
  html = html.replace("<!-- @privacy -->", privacyHtml(cards));
  await writeFile(at(`dist/${page}`), html);
}
const fonts = (await readFile(at("src/fonts.css"), "utf8")).replaceAll("../fonts/", "fonts/");
await writeFile(at("dist/site.css"), fonts + "\n" + (await readFile(at("src/site.css"), "utf8")));
await cp(at("fonts"), at("dist/fonts"), { recursive: true });
for (const f of ["og-image.png", "CNAME"]) await cp(at(f), at(`dist/${f}`));
await writeFile(at("dist/projects.json"), JSON.stringify(cards.map(({ name, label, blurb, url }) => ({ name, label, blurb, url })), null, 2) + "\n");
console.log(`built dist/ with ${cards.length} project cards: ${cards.map((c) => c.name).join(", ")}`);
