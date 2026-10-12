# OnSeguros Website

Full-featured insurance agency website with AI-powered quote assistance, content management system, and claims handling. Includes admin panel for blog, FAQ, and subscribers. Quote and claim requests are sent to the agency via WhatsApp. 

## Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript (no frameworks)
- **Styling**: Custom CSS with CSS variables for theming
- **Backend**: Supabase (PostgreSQL database, authentication)
- **Blog API**, **FAQ API**, and **Subscribers API**: Supabase Edge Functions
- **Hosting**: DreamHost
- **CDN and DNS record tracking**: Cloudflare
- **Deployment**: GitHub Actions

## Project Structure

```
/
├── admin/              # Admin panel (blog, faq, subscribers)
├── assets/             # Images, icons, CSS, JS
├── blog/               # Blog listing and post pages
├── agente/             # AI quote assistant agent
├── components/         # Reusable HTML components (header, footer)
├── faq/                # FAQ page
├── legal/              # Legal pages (privacy, terms, accesibility)
├── siniestros/         # Car crash/claims form
├── scripts/            # Build scripts (sitemap generation)
└── index.html          # Main landing page
```

## Key Features

- **Blog System**: Markdown-based blog with admin panel
- **FAQ Section**: Searchable FAQ with admin management
- **Subscribers Management**: Email subscription handling with admin panel
- **AI Quote Assistant**: LLM-powered agent helping clients get insurance quotes
- **Claims/Siniestros Form**: Car accident form; submit opens WhatsApp with a formatted message (photos are attached in the chat)
- **Responsive Design**: Mobile-first, accessible layout
- **Dark Mode**: Automatic theme switching based on system preference
- **SEO Optimized**: Structured data, meta tags, sitemap
- **Accessibility**: ARIA roles and keyboard navigation
- **Newsletter**: Supabase-powered email subscriptions

## Development

### Configuration

The site uses environment variables loaded from `config.json` (gitignored).

These values are injected during deployment via GitHub Secrets.

## Deployment

Automatic deployment to DreamHost on push to `master` branch.

The workflow:
1. Generates `config.json` from GitHub Secrets
2. Deploys to DreamHost
3. Available at https://www.onseguros.net

## Admin Panel

Access at `/admin/` (requires Supabase authentication).

Features:
- Create, edit, delete blog posts and faq entries
- Markdown editor with live preview
- SEO metadata management
- Character count for titles and descriptions

## Important Notes

- `config.json` is gitignored and generated during deployment
- Blog content and faq entries are stored in Supabase, not in the repository
- The sitemap auto-updates daily via GitHub Actions
- The landing newsletter form uses Formspree; quote and claim flows open WhatsApp instead
- Newsletter subscriptions go directly to Supabase

## Dependencies

External libraries loaded via CDN:
- Marked.js (Markdown parsing)
- Supabase JS Client
- Font: Inter and Space Grotesk (Google Fonts)

No build step or package installation required for basic development.
