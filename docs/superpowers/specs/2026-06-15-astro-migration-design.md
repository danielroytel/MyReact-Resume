# Astro Migration Design

**Date:** 2026-06-15
**Status:** Approved (Group 1 reviewed, user authorized implementation)
**Scope:** Migrate personal resume site from Gatsby 3 to Astro 5

## Context & motivation

The current site (`package.json`, `gatsby-config.js`, `gatsby-node.js`) is a Gatsby 3
app from 2021. A package audit found 133 vulnerabilities (11 critical, 60 high).
Non-breaking fixes brought that to 105; the remaining 76 require a Gatsby 3 → 5
major upgrade, and 19 have no upstream fix at all (abandoned packages).
Gatsby itself is in maintenance mode. Rather than chase a Gatsby 5 upgrade for a
framework in decline, we are migrating off Gatsby entirely.

The site is a personal resume with a hidden blog (`/pensieve`) and an archive page
(`/archive`) of past projects. Static output only. Most "vulnerabilities" are
build-time dev-server concerns; the runtime surface is small.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Target framework | Astro 5.x (latest) |
| Component strategy | Mostly vanilla `.astro`; React islands only where state is required |
| Styling | Scoped CSS per component + global stylesheet (no styled-components, no Tailwind, no Sass) |
| Deploy target | AWS S3 + CodeBuild (keep current infra) |
| Route scope | Full 1:1 port of every existing route |
| Language | TypeScript |
| Analytics | GA4 with placeholder `G-XXXXXXXXXX` for the user to replace |
| Execution approach | Greenfield side-by-side in `astro-site/`, single cutover PR at the end |

## Architecture

### Directory layout

```
MyReact-Resume/
├── astro-site/                  ← new Astro project (built first, swapped last)
│   ├── astro.config.mjs
│   ├── tsconfig.json
│   ├── package.json
│   ├── public/                  ← og.png, DanielRoytel_Resume.pdf, favicon.svg, robots.txt
│   ├── src/
│   │   ├── content.config.ts    ← Zod schemas via Astro 5 Content Layer glob() loaders
│   │   ├── components/
│   │   │   ├── layout/          ← BaseLayout.astro, Head.astro, Nav.astro, Social.astro, Email.astro, Footer.astro
│   │   │   ├── sections/        ← Hero.astro, About.astro, Jobs.astro, Featured.astro, Projects.astro, Contact.astro
│   │   │   ├── islands/         ← JobsTabs.tsx, MobileMenu.tsx, Loader.tsx (React)
│   │   │   └── icons/           ← one .astro per SVG icon (IconLogo, IconGitHub, IconLinkedin, IconBookmark, IconExternal, etc.)
│   │   ├── layouts/
│   │   │   └── PostLayout.astro
│   │   ├── pages/
│   │   │   ├── index.astro
│   │   │   ├── 404.astro
│   │   │   ├── archive.astro
│   │   │   └── pensieve/
│   │   │       ├── index.astro
│   │   │       ├── [slug].astro          ← post detail
│   │   │       └── tags/
│   │   │           ├── index.astro       ← all tags
│   │   │           └── [tag].astro       ← per-tag listing
│   │   ├── styles/
│   │   │   ├── global.css       ← CSS reset + custom properties + element styles (port of GlobalStyle.js)
│   │   │   ├── fonts.css        ← @font-face for Calibre + SFMono
│   │   │   ├── prism.css        ← code block theme (shiki-compatible)
│   │   │   └── transitions.css  ← fadeup, fade, fadedown keyframes (port of TransitionStyles.js)
│   │   ├── hooks/               ← usePrefersReducedMotion.ts, useScrollDirection.ts, useOnClickOutside.ts
│   │   ├── utils/               ← sr.ts (scrollreveal), key-codes.ts, scroll.ts
│   │   └── config.ts            ← email, socialMedia, navLinks, colors, srConfig (port of src/config.js)
│   ├── fonts/                   ← copied from ../src/fonts (Calibre, SFMono)
│   └── images/                  ← copied from ../src/images (logo.png, me.jpg)
├── content/                     ← UNCHANGED, shared with Gatsby until cutover
│   ├── jobs/    (6 markdown files in subfolders)
│   ├── projects/ (~40 markdown files + images/)
│   ├── posts/   (1 markdown file in subfolder)
│   └── featured/ (1 markdown file in subfolder)
├── src/, gatsby-*.*, buildspec.yaml, package.json   ← old Gatsby site, untouched until cutover
```

### Content collections (`src/content.config.ts`)

Astro 5 Content Layer API reads the existing `content/` directory in place. No file
moves. Four collections:

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const jobs = defineCollection({
  loader: glob({ base: '../content/jobs', pattern: '**/index.md' }),
  schema: z.object({
    date: z.coerce.date(),
    title: z.string(),
    company: z.string(),
    team: z.string().optional(),
    location: z.string().optional(),
    range: z.string(),
    range_abrv: z.string(),
    url: z.string().url(),
  }),
});

const projects = defineCollection({
  loader: glob({ base: '../content/projects', pattern: '**/*.md' }),
  schema: z.object({
    date: z.coerce.date(),
    title: z.string(),
    description: z.string().optional(),
    tech: z.array(z.string()).default([]),
    github: z.string().url().optional(),
    external: z.string().url().optional(),
    ios: z.string().url().optional(),
    android: z.string().url().optional(),
    company: z.string().optional(),
    showInProjects: z.boolean().default(true),
  }),
});

const posts = defineCollection({
  loader: glob({ base: '../content/posts', pattern: '**/index.md' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    slug: z.string(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const featured = defineCollection({
  loader: glob({ base: '../content/featured', pattern: '**/index.md' }),
  schema: z.object({
    date: z.coerce.date(),
    title: z.string(),
    description: z.string().optional(),
    tech: z.array(z.string()).default([]),
    external: z.string().url().optional(),
    github: z.string().url().optional(),
    img: z.string().optional(),
  }),
});

export const collections = { jobs, projects, posts, featured };
```

Build fails on bad frontmatter — currently the Gatsby site silently ships broken content.

### Dependencies (`astro-site/package.json`)

| Package | Purpose |
|---|---|
| `astro` ^5.x | framework |
| `@astrojs/react` ^4.x | React island integration |
| `@astrojs/sitemap` ^3.x | replaces gatsby-plugin-sitemap |
| `react`, `react-dom` ^18.x | islands (React 18 — `@astrojs/react` 4 target) |
| `scrollreveal` ^4.0.9 | preserves existing scroll-reveal effect |
| `sharp` ^0.33.x | Astro image optimization |
| `typescript` ^5.x | types |

**Dropped**: all `gatsby-*`, `styled-components`, `react-helmet`, `react-transition-group` (replaced by Astro View Transitions + CSS), `prismjs` (replaced by Astro's built-in `shiki`), `prop-types` (TS replaces), `animejs` (not imported anywhere — only listed in a null-loader rule), `lodash` (only `kebabCase` used — inline a 5-line implementation).

### Astro config (`astro.config.mjs`)

- `output: 'static'`
- `site: 'https://danielroytel.com'`
- `integrations: [react(), sitemap()]`
- `vite.resolve.alias`: `@components`, `@styles`, `@utils`, `@hooks`, `@images`, `@fonts`, `@config` → `src/...`
- `markdown.shikiConfig`: `github-dark` theme (close to current Prism theme)

### TypeScript config

Extends `astro/tsconfigs/strict`. `jsx: 'react-jsx'`. Path aliases mirror Vite aliases.

## Routes & pages

| Path | File | Source of data |
|---|---|---|
| `/` | `src/pages/index.astro` | static + `jobs` collection (passed to JobsTabs island) |
| `/404` | `src/pages/404.astro` | static |
| `/archive` | `src/pages/archive.astro` | `projects` collection |
| `/pensieve` | `src/pages/pensieve/index.astro` | `posts` collection (excluding drafts) |
| `/pensieve/tags` | `src/pages/pensieve/tags/index.astro` | derived from `posts` tags |
| `/pensieve/tags/[tag]` | `src/pages/pensieve/tags/[tag].astro` | `getStaticPaths` from `posts` tags |
| `/pensieve/[slug]` | `src/pages/pensieve/[slug].astro` | `posts` collection keyed by `slug` frontmatter |

Home page (`index.astro`) preserves the current visible sections (Hero, Jobs, Contact).
About, Featured, Projects sections exist in `src/components/sections/` but are not
imported into `index.astro` — matching the commented-out state of `src/pages/index.js`.

## Component breakdown

### `.astro` components (zero JS shipped)

- **BaseLayout.astro** — html shell, head, global stylesheet imports, skip-link, Nav/Social/Email/Footer chrome. Accepts `<slot />`. Replaces `src/components/layout.js`.
- **Head.astro** — `<title>`, meta description, OG tags, canonical URL, favicon, GA4 script (production-only). Replaces `src/components/head.js`.
- **Nav.astro** — fixed top header, desktop links, scroll-hide behavior (small inline `<script>`), resume PDF link, mobile menu trigger. Replaces `src/components/nav.js` minus the mount animation (now CSS-driven).
- **Social.astro** — fixed left sidebar with social icons. Replaces `src/components/social.js`.
- **Email.astro** — fixed right sidebar with email. Replaces `src/components/email.js`.
- **Footer.astro** — replaces `src/components/footer.js`.
- **Hero.astro** — static markup with CSS-driven mount animation (no React). Replaces `src/components/sections/hero.js`.
- **About.astro, Contact.astro, Featured.astro, Projects.astro** — section bodies, mostly static markup.
- **Jobs.astro** — outer shell: heading + layout + scroll-reveal. Renders `<JobsTabs client:visible jobs={...} />` inside.
- **icons/*.astro** — one per SVG. Replaces `src/components/icons/*.js`.

### React islands (hydrated selectively)

| Component | Hydration | Why an island |
|---|---|---|
| `JobsTabs.tsx` | `client:visible` | Tab state, keyboard arrow navigation, focus management |
| `MobileMenu.tsx` | `client:load` | Hamburger toggle, body-scroll lock, outside-click handling |
| `Loader.tsx` | `client:only="react"` | Only mounted on `/`, drives `isLoading` then unmounts |

All three receive their data as serializable props from the parent `.astro` file.
Hooks ported: `usePrefersReducedMotion`, `useScrollDirection`, `useOnClickOutside`.

## Styling architecture

### Token migration

All `theme.mixins.*` from `src/styles/mixins.js` and CSS custom properties from
`src/styles/variables.js` move into `src/styles/global.css` as plain CSS.

Custom properties preserved verbatim:
`--navy`, `--darkNavy`, `--green`, `--orange`, `--orange-tint`, `--slate`,
`--light-slate`, `--lightest-slate`, `--white`, `--lightest-navy`, `--light-navy`,
`--dark-slate`, `--font-sans`, `--font-mono`, `--fz-xs`...`--fz-heading`,
`--nav-height`, `--nav-scroll-height`, `--tab-height`, `--tab-width`,
`--border-radius`, `--transition`, plus shadows.

Theme mixins (`flexCenter`, `flexBetween`, `bigButton`, `smallButton`, `link`,
`inlineLink`, `boxShadow`, `fancyList`, `resetList`) become plain CSS classes in
`global.css` (e.g. `.flex-center`, `.flex-between`, `.button-big`, `.button-small`)
so they can be applied via `class=` instead of `${({ theme }) => theme.mixins.x}`.

### Per-component styles

Each `.astro` component gets a scoped `<style>` block that ports the matching
`styled-components` template literal. Selectors become real CSS; props-driven
styles (`${({ isActive }) => isActive ? ... : ...}`) become conditional classes
applied from the markup.

### Global stylesheet structure

`global.css` order:
1. `@import './fonts.css'` (font-face declarations)
2. CSS reset (modern-normalize or hand-rolled minimal)
3. `:root` custom properties
4. Element defaults (html, body, headings, links, lists, etc.) — direct port of `GlobalStyle.js` body
5. Utility classes (`.flex-center`, `.button-big`, etc.)
6. `@import './transitions.css'`
7. `@import './prism.css'`

## Interactivity & animations

| Effect | Current | New |
|---|---|---|
| Loader on `/` | React component, 2s timer | `Loader.tsx` island `client:only="react"` (closest 1:1 port) |
| Hero intro | `react-transition-group` CSSTransition on mount | CSS animation triggered by `.is-mounted` class added on `DOMContentLoaded` |
| Scroll reveal | ScrollReveal via `sr.reveal(...)` in each component | ScrollReveal initialized once in `BaseLayout.astro` inline `<script>`; data attributes (`data-sr`) mark reveal targets |
| Jobs tabs | React state + keyboard nav | `JobsTabs.tsx` React island — preserved verbatim |
| Nav scroll hide | React + `useScrollDirection` hook | Plain inline `<script>` toggling classes on `<header>` based on scroll position; respects `prefers-reduced-motion` |
| Mobile menu | React (`Menu.js`) | `MobileMenu.tsx` React island |
| Page transitions | `react-transition-group` (inside layout) | Astro `<ViewTransitions />` in `<head>` |
| External link `target="_blank"` | Runtime DOM scan in `layout.js` | Plain HTML: each external `<a>` written with `target="_blank" rel="noopener noreferrer"` directly |

## Analytics (GA4)

In `Head.astro`:

```astro
{import.meta.env.PROD && (
  <>
    <script is:raw async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
    <script is:raw set:html={`
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-XXXXXXXXXX');
    `} />
  </>
)}
```

`is:raw` prevents Astro from parsing the gtag template. The placeholder
`G-XXXXXXXXXX` is documented in the spec and in a code comment — the user will
create their GA4 property and replace it before deploy.

The dead Universal Analytics ID `UA-253312998-1` is removed entirely; Universal
Analytics was shut down by Google in July 2023.

## Deploy (CodeBuild / S3)

`buildspec.yaml` updates:

```yaml
version: 0.2
phases:
  install:
    runtime-versions:
      nodejs: 20                 # was 16
    commands:
      - cd astro-site
      - npm ci
  build:
    commands:
      - npm run build            # astro build → dist/
  post_build:
    commands:
      - aws s3 sync dist/ s3://danielroytel.com/ --delete
      - aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths "/*"
artifacts:
  base-directory: astro-site/dist   # was public
  files:
    - '**/*'
  discard-paths: yes
```

Removed: global `gatsby` install, `gatsby-plugin-s3` install, `touch .npmignore`.
Added: CloudFront invalidation (assumed to be in front of the bucket — if not,
the invalidation line can be dropped).

If CloudFront distribution ID isn't available via env var, this stays a comment
in the buildspec for the user to wire up.

## Cutover plan

Migration is "done" when **all** of these pass:

1. `cd astro-site && npm run build` succeeds with no warnings.
2. `npm run dev` serves all 7 routes without errors: `/`, `/404`, `/archive`,
   `/pensieve/`, `/pensieve/tags/`, `/pensieve/tags/<tag>/`, `/pensieve/<slug>/`.
3. Visual parity confirmed at 1280px, 768px, 360px breakpoints by side-by-side
   browser comparison against the running Gatsby site.
4. All interactive elements verified: Jobs tabs (mouse + keyboard arrow keys),
   mobile menu open/close, scroll-reveal, external link target/rel, resume PDF
   download, anchor-link scrolling.
5. CodeBuild run succeeds and `aws s3 ls s3://danielroytel.com/` shows the new
   `dist/` contents.

### Cutover PR

Single PR that:
- Deletes `src/`, `gatsby-browser.js`, `gatsby-config.js`, `gatsby-node.js`,
  `gatsby-ssr.js`, old `package.json`, old `package-lock.json`, `static/`
- Moves `astro-site/*` to repo root
- Updates `buildspec.yaml` paths (drops the `cd astro-site &&` prefix, changes
  `base-directory` to `dist`)
- Keeps `content/` untouched
- Commit message: `Migrate from Gatsby 3 to Astro 5`

After merge, the next CodeBuild run publishes the Astro site.

## Testing & verification

- **Build:** `npm run build` exits 0; `dist/` contains all 7 HTML files + assets.
- **Lighthouse:** home page ≥ 95 across all four metrics (expected huge improvement from Gatsby).
- **Crawl:** `wget --spider -r -nd http://localhost:4321/` reports no broken links.
- **Sitemap:** `/sitemap-index.xml` resolves.
- **404:** `/this-does-not-exist` returns the custom 404 page.
- **MDX/markdown:** `/pensieve/clickable-cards` renders with shiki-highlighted code blocks.
- **Content parity:** every job, project, post in `content/` appears in the right place.

## Out of scope

- Visual redesign — the look stays 1:1.
- New content — text, jobs, projects unchanged.
- Comment features / search / CMS.
- Re-enabling the commented-out About/Featured/Projects sections on home — preserved as `.astro` files for future use but not imported into `index.astro`.
- Replacing `lodash.kebabCase` with a 5-line helper is in scope; other lodash utilities are not used.
- React 19 — staying on 18 because `@astrojs/react` 4 targets React 18.
