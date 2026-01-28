# OnSeguros Website

Insurance agency website for OnSeguros, featuring a blog system and admin panel for content management.

## Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript (no frameworks)
- **Styling**: Custom CSS with CSS variables for theming
- **Backend**: Supabase (PostgreSQL database, authentication)
- **Blog API**: Netlify Functions
- **Hosting**: DreamHost
- **CDN and DNS record tracking**: Cloudflare
- **Deployment**: GitHub Actions

## Project Structure

```
/
├── admin/              # Admin panel for blog management
├── assets/             # Images, icons, CSS, JS
├── blog/               # Blog listing and post pages
├── components/         # Reusable HTML components (header, footer)
├── faq/                # FAQ page
├── legal/              # Legal pages (privacy, terms)
├── scripts/            # Build scripts (sitemap generation)
└── index.html          # Main landing page
```

## Key Features

- **Blog System**: Markdown-based blog with admin panel
- **Dark Mode**: Automatic theme switching based on system preference
- **SEO Optimized**: Structured data, meta tags, sitemap
- **Accessibility**: WCAG AA compliant, keyboard navigation
- **Newsletter**: Supabase-powered email subscriptions
- **Contact Forms**: Formspree integration

## Development

### Prerequisites

- Node.js 20+
- Git

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

### GitHub Secrets Required

Set these in repository settings:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `API_BASE_URL`
- `GET_POSTS_API_URL`
- `GET_POST_API_URL`
- `PUBLISH_API_URL`
- `UPDATE_API_URL`
- `DELETE_API_URL`
- `BLOG_BASE_URL`

## Admin Panel

Access at `/admin/` (requires Supabase authentication).

Features:
- Create, edit, delete blog posts
- Markdown editor with live preview
- SEO metadata management
- Character count for titles and descriptions

## Scripts

```bash
# Generate sitemap
npm run sitemap
```

## Important Notes

- `config.json` is gitignored and generated during deployment
- Blog content is stored in Supabase, not in the repository
- The sitemap auto-updates daily via GitHub Actions
- All forms use Formspree for submissions
- Newsletter subscriptions go directly to Supabase

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ JavaScript required
- CSS Grid and Custom Properties required

## Dependencies

External libraries loaded via CDN:
- Marked.js (Markdown parsing)
- Supabase JS Client
- Font: Inter and Space Grotesk (Google Fonts)

No build step or package installation required for basic development.
