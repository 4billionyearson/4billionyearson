---
description: >
  Use when writing or editing HTML content for 4 Billion Years On posts.
  Covers typography, layout, headings, paragraphs, blockquotes, tables,
  inline citations [1], and reference lists at the bottom of articles.
---

# HTML Content Specification — 4 Billion Years On

## Site context

**4 Billion Years On** (`4billionyearson.org`) is a dark-themed, data-driven publication covering climate change, renewable energy, artificial intelligence, and biotechnology. Content is scientific but accessible — aimed at students, researchers, journalists, and the general public.

---

## Rendering environment

HTML is pasted into the **Sanity `htmlBody` field** and rendered inside this wrapper:

```html
<div class="prose prose-lg prose-invert max-w-none text-gray-300">
  <!-- your HTML goes here -->
</div>
```

**Important**: `@tailwindcss/typography` is **not installed**. The `prose-*` classes have no effect. The only automatic styles are:

| CSS rule (globals.css) | Effect |
|---|---|
| `.prose ul` | `list-style-type: disc; padding-left: 1.5rem` |
| `.prose ol` | `list-style-type: decimal; padding-left: 1.5rem` |
| `.prose ol li` | `padding-left: 0.25rem` |

Everything else requires **explicit Tailwind utility classes** on the element. `text-gray-300` is inherited from the wrapper — plain `<p>` tags render in that colour without extra classes.

The article's `<h1>` title is rendered by the page component above the body. **Do not include an `<h1>` in the HTML body.** Start sections with `<h2>`.

---

## Fonts

| Role | Font | Tailwind class |
|---|---|---|
| Body paragraphs | Inter | _(inherited from `<body>` — no class needed)_ |
| Body headings (h2, h3, h4) | Inter | _(inherited — do **not** add `font-mono`)_ |
| Post title (h1) | Space Mono | Rendered by the page component, not in htmlBody |
| Monospace / inline data values | Space Mono | `font-mono` |

Inter is the default font for virtually all readable content inside a post. Space Mono is reserved for the site header/navigation, the post title above the body, and inline data/code snippets that benefit from a monospaced look.

---

## Colour palette

| Token | Hex | Usage |
|---|---|---|
| `text-white` | `#FFF5E7` (warm cream) | Headings, bold labels, key values |
| `text-gray-300` | `#D3C8BB` | Body text (inherited from wrapper) |
| `text-gray-400` | `#A99B8D` | Secondary text, table headers |
| `text-gray-500` | `#7A6E63` | Captions, footnotes, reference list |
| `text-blue-400` | `#60a5fa` | Inline links |
| **Category accents** | | Post card border — for content use sparingly |
| AI | `#88DDFC` | Inline highlights for AI posts |
| Renewable Energy | `#D1E368` | Inline highlights for energy posts |
| Climate Change | `#D0A65E` | Inline highlights for climate posts |
| Biotechnology | `#D26742` | Inline highlights for biotech posts |

---

## Element reference

### Headings

The post title is an `<h1>` rendered outside the body. Use `<h2>` for major sections, `<h3>` for sub-sections, `<h4>` for minor headings.

```html
<h2 class="text-3xl font-bold mt-8 mb-4 text-white">Major Section</h2>

<h3 class="text-2xl font-bold mt-6 mb-3 text-white">Sub-section</h3>

<h4 class="text-xl font-semibold mt-5 mb-2 text-white">Minor Heading</h4>
```

---

### Paragraphs

```html
<p class="mb-4 leading-relaxed">Body text here — inherits text-gray-300 from wrapper.</p>
```

---

### Bold and italic

```html
<strong class="font-bold text-white">key term</strong>

<em>italicised phrase</em>
```

---

### Links

Always open in a new tab; include `rel="noopener noreferrer"`.

```html
<a href="https://example.com" class="text-blue-400 underline hover:text-blue-300" target="_blank" rel="noopener noreferrer">
  Link text
</a>
```

---

### Lists

Bullet and numbered lists are automatically styled via globals.css — no extra classes needed on `<ul>` or `<ol>`. Add `class="mb-4"` for spacing after the list.

```html
<!-- Unordered list -->
<ul class="mb-4">
  <li>First item</li>
  <li>Second item</li>
</ul>

<!-- Ordered list -->
<ol class="mb-4">
  <li>First step</li>
  <li>Second step</li>
</ol>
```

---

### Blockquotes

Use for pull quotes and significant cited statements.

```html
<blockquote class="border-l-4 border-gray-600 pl-4 italic my-6 text-gray-400">
  <p>"The concentration of CO₂ in the atmosphere in 2024 was the highest in 800,000 years
  of ice-core records."</p>
  <footer class="text-sm text-gray-500 mt-2 not-italic">
    — NOAA Global Monitoring Laboratory, 2024
  </footer>
</blockquote>
```

---

### Callout / key-finding box

Use for notable statistics, warnings, or editorial highlights.

```html
<div class="bg-gray-800/50 border border-gray-700 rounded-xl p-5 my-6">
  <p class="font-semibold text-white mb-1">Key finding</p>
  <p class="text-gray-300 text-sm leading-relaxed">
    Global average surface temperature in 2024 was 1.55 °C above the pre-industrial
    baseline — the first calendar year to exceed 1.5 °C.
  </p>
</div>
```

---

### Tables

Wrap in a scrollable container so they work on mobile.

```html
<div class="overflow-x-auto my-6">
  <table class="w-full text-sm border-collapse">
    <thead>
      <tr class="border-b border-gray-700">
        <th class="text-left py-2 pr-4 text-gray-400 font-medium">Column A</th>
        <th class="text-left py-2 pr-4 text-gray-400 font-medium">Column B</th>
        <th class="text-left py-2 text-gray-400 font-medium">Column C</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-gray-800/60">
      <tr>
        <td class="py-2 pr-4 text-white font-medium">Row label</td>
        <td class="py-2 pr-4">Value</td>
        <td class="py-2">Note</td>
      </tr>
      <tr>
        <td class="py-2 pr-4 text-white font-medium">Row label</td>
        <td class="py-2 pr-4">Value</td>
        <td class="py-2">Note</td>
      </tr>
    </tbody>
  </table>
</div>
<p class="text-xs text-gray-500 -mt-4 mb-6">Table caption or source note.</p>
```

**Table rules:**
- First column (`text-white font-medium`) carries the row label.
- Data cells inherit `text-gray-300`.
- Always include a source note below large tables.
- For tables with many columns add `class="min-w-[600px]"` to the `<table>` tag.

---

### Images with captions

```html
<figure class="my-8">
  <img src="https://..." alt="Descriptive alt text" class="rounded-lg w-full" width="800" height="450" />
  <figcaption class="text-center text-sm text-gray-500 mt-2">
    Caption text. Source: Organisation Name (Year).
  </figcaption>
</figure>
```

---

### Inline code / data values

```html
<code class="bg-gray-800 text-gray-200 rounded px-1 text-sm font-mono">1.5 °C</code>
```

---

### Horizontal rule

Use between major sections only.

```html
<hr class="border-gray-800 my-10" />
```

---

## Inline citations — `[1]` style

Use superscript citations that link down to the reference list at the bottom. The citation anchor id is `cite-N`; the target anchor id is `ref-N`.

```html
<p class="mb-4 leading-relaxed">
  Arctic sea ice extent in September 2023 reached its second-lowest recorded minimum
  since satellite observations began.<sup id="cite-1"><a href="#ref-1" class="text-blue-400 hover:text-blue-300 no-underline">[1]</a></sup>
  The rate of decline is approximately 13% per decade relative to the 1981–2010 average.<sup id="cite-2"><a href="#ref-2" class="text-blue-400 hover:text-blue-300 no-underline">[2]</a></sup>
</p>
```

---

## Reference list

Place the reference list at the very end of the HTML body, after all article content. Use `<section id="references">` so the page can deep-link to it.

```html
<section class="mt-12 pt-8 border-t border-gray-800" id="references">
  <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">References</h2>
  <ol class="space-y-3 text-sm text-gray-500">

    <li id="ref-1">
      <a href="https://doi.org/10.xxxx/xxxxx" target="_blank" rel="noopener noreferrer"
         class="hover:text-gray-300 transition-colors">
        Fetterer, F. et al. (2023). <em>Sea Ice Index, Version 3.</em>
        National Snow and Ice Data Center. doi:10.7265/N5K072F8
      </a>
    </li>

    <li id="ref-2">
      <a href="https://nsidc.org/arcticseaicenews/" target="_blank" rel="noopener noreferrer"
         class="hover:text-gray-300 transition-colors">
        NSIDC (2023). <em>Arctic Sea Ice News &amp; Analysis.</em>
        National Snow and Ice Data Center.
      </a>
    </li>

  </ol>
</section>
```

**Reference formatting rules:**
- Use **Author, Initials. (Year). _Title_. _Journal_ vol(issue), pages.** for journal articles.
- Use **Organisation (Year). _Report title._ Publisher.** for reports and datasets.
- Always include a DOI link where one exists.
- Wrap journal/report titles in `<em>`.
- Numbered list matches the order citations appear in the text.

---

## Full article skeleton

```html
<!-- ═══ INTRODUCTION ═══ -->
<p class="mb-4 leading-relaxed">
  Opening paragraph. No separate Introduction heading — go straight into the content.
</p>

<!-- ═══ SECTION ═══ -->
<h2 class="text-3xl font-bold mt-8 mb-4 text-white">Section Title</h2>

<p class="mb-4 leading-relaxed">
  Body text with an inline citation.<sup id="cite-1"><a href="#ref-1" class="text-blue-400 hover:text-blue-300 no-underline">[1]</a></sup>
</p>

<ul class="mb-4">
  <li>Point one</li>
  <li>Point two</li>
</ul>

<!-- ═══ CALLOUT ═══ -->
<div class="bg-gray-800/50 border border-gray-700 rounded-xl p-5 my-6">
  <p class="font-semibold text-white mb-1">Key finding</p>
  <p class="text-gray-300 text-sm leading-relaxed">Notable statistic or highlight.</p>
</div>

<!-- ═══ BLOCKQUOTE ═══ -->
<blockquote class="border-l-4 border-gray-600 pl-4 italic my-6 text-gray-400">
  <p>"Direct quote from an expert or document."</p>
  <footer class="text-sm text-gray-500 mt-2 not-italic">— Source Name, Year</footer>
</blockquote>

<!-- ═══ TABLE ═══ -->
<div class="overflow-x-auto my-6">
  <table class="w-full text-sm border-collapse">
    <thead>
      <tr class="border-b border-gray-700">
        <th class="text-left py-2 pr-4 text-gray-400 font-medium">Header</th>
        <th class="text-left py-2 text-gray-400 font-medium">Header</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-gray-800/60">
      <tr>
        <td class="py-2 pr-4 text-white font-medium">Label</td>
        <td class="py-2">Value</td>
      </tr>
    </tbody>
  </table>
</div>

<!-- ═══ REFERENCES ═══ (always last) -->
<section class="mt-12 pt-8 border-t border-gray-800" id="references">
  <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">References</h2>
  <ol class="space-y-3 text-sm text-gray-500">
    <li id="ref-1">
      <a href="https://doi.org/..." target="_blank" rel="noopener noreferrer"
         class="hover:text-gray-300 transition-colors">
        Author, A. (Year). <em>Title.</em> Publisher / Journal.
      </a>
    </li>
  </ol>
</section>
```

---

## Style rules summary

| Do | Don't |
|---|---|
| Start body sections with `<h2>` | Include an `<h1>` — the page renders the title above |
| Use `text-white` for headings and key labels | Use `text-gray-300` on headings (too faint) |
| Wrap tables in `<div class="overflow-x-auto">` | Put bare `<table>` — breaks on mobile |
| Link every `[N]` citation to `#ref-N` | Use footnotes without a matching reference list entry |
| Use `target="_blank" rel="noopener noreferrer"` on external links | Omit `rel` — security requirement |
| Keep callout boxes to one per major section | Overuse callouts — reserve for genuinely notable findings |
| Format DOIs as full `https://doi.org/` URLs | Use bare doi: strings without a hyperlink |
| Write journal titles in `<em>` tags | Leave journal titles unformatted |
