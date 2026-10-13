# BlogPost

The article page (/blog/post.html?slug=…): breadcrumb, ruled header with an eyebrow date, and Markdown rendered as `.prose`.

**Markup:** `nav.blog-post__breadcrumb` > `ol` of links (last crumb plain text) · `header.blog-post__header` > `time.blog-post__date`, `h1.blog-post__title`, `.blog-post__author` · `div.prose` with the Marked.js output. Column `post-max` (760px). A 3px `.reading-progress` bar in `brand-blue` runs across the top of the viewport.

- Header opens with 2px `rule-strong`, closes with 1px `rule`. Date is an eyebrow led by the 2rem × 2px `accent-dark` dash.
- Title `post-title` (fluid to 50px, balanced).
- `.prose`: `prose` style (18px / 1.75, `text-primary`); h2/h3/h4 in Space Grotesk 600; links underlined `link`; markers `text-secondary`; quotes get a 3px `accent-dark` left rule, italic `text-secondary`, no tinted box; tables are ruled rows (2px under the header row); code in the `code` family on `bg-tertiary`.
- Long words and pasted URLs wrap instead of widening the page.
- Copy is Gemini-drafted and edited by Mariano in the admin; keep the vos register.
