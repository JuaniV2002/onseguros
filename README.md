# OnSeguros Website

Insurance agency website for OnSeguros, featuring a blog and faq system and admin panel for content management.

## Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript (no frameworks)
- **Styling**: Custom CSS with CSS variables for theming
- **Backend**: Supabase (PostgreSQL database, authentication)
- **Blog API**, **FAQ API** and **Subscribers API**: Supabase Edge Functions
- **Hosting**: DreamHost
- **CDN and DNS record tracking**: Cloudflare
- **Deployment**: GitHub Actions

## Project Structure

```
/
├── admin/              # Admin panel for blog and faq management
├── assets/             # Images, icons, CSS, JS
├── blog/               # Blog listing and post pages
├── components/         # Reusable HTML components (header, footer)
├── faq/                # FAQ page
├── legal/              # Legal pages (privacy, terms, accesibility)
├── scripts/            # Build scripts (sitemap generation)
└── index.html          # Main landing page
```

## Key Features

- **Blog System**: Markdown-based blog with admin panel
- **FAQ Section**: Searchable FAQ with admin management
- **Subscribers Management**: Email subscription handling with admin panel
- **Responsive Design**: Mobile-first, accessible layout
- **Dark Mode**: Automatic theme switching based on system preference
- **SEO Optimized**: Structured data, meta tags, sitemap
- **Accessibility**: ARIA roles and keyboard navigation
- **Newsletter**: Supabase-powered email subscriptions
- **Contact Forms**: Formspree integration

## Development

### Configuration

The site uses environment variables loaded from `config.json` (gitignored). Required keys:

```json
{
  "SUPABASE_URL": "your-supabase-url",
  "SUPABASE_ANON_KEY": "your-supabase-anon-key",
  "API_BASE_URL": "https://onseguros-newsletter.netlify.app/api",
  "GET_POSTS_API_URL": "https://onseguros-newsletter.netlify.app/api/get-posts",
  "GET_POST_API_URL": "https://onseguros-newsletter.netlify.app/api/get-post",
  "PUBLISH_API_URL": "https://onseguros-newsletter.netlify.app/api/publish-post",
  "UPDATE_API_URL": "https://onseguros-newsletter.netlify.app/api/update-post",
  "DELETE_API_URL": "https://onseguros-newsletter.netlify.app/api/delete-post",
  "BLOG_BASE_URL": "https://www.onseguros.net/blog/post.html"
}
```

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
- Quote form use Formspree for submissions
- Newsletter subscriptions go directly to Supabase

## Dependencies

External libraries loaded via CDN:
- Marked.js (Markdown parsing)
- Supabase JS Client
- Font: Inter and Space Grotesk (Google Fonts)

No build step or package installation required for basic development.
