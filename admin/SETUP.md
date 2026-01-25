# OnSeguros Admin CMS - Setup Guide

## Setup Progress

- [x] ~~Add `publish-post.js` function to Netlify~~
- [x] ~~Configure environment variables in Netlify~~
- [ ] Create admin user in Supabase
- [ ] Test the admin panel

---

## Remaining Steps

### 1. Create Admin User in Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com) → Project `tgokvwuiiglioegxgcpu`

2. Navigate to **Authentication** → **Users**

3. Click **Add User** → **Create New User**
   - Email: Your dad's email (e.g., `mariano@onseguros.com.ar`)
   - Password: Choose a strong password
   - ✅ Check **"Auto Confirm User"**

4. Click **Create User**

### 2. Test the Admin Panel

1. Deploy the changes (push to master)
2. Go to `https://www.onseguros.com.ar/admin/`
3. Log in with the credentials you just created
4. Try publishing a test post

---

## How It Works

### Publishing Flow

1. Your dad logs in at `https://www.onseguros.com.ar/admin/`
2. Writes the blog post using the markdown editor
3. Clicks "Publicar Artículo"
4. The system:
   - Validates the form
   - Sends data to the Netlify function
   - Creates a new `.md` file in `blog/posts/`
   - Updates `posts.json` with the new entry
   - Commits to GitHub
5. GitHub Actions automatically deploys to DreamHost
6. Newsletter sends if configured

---

## Troubleshooting

### "No autorizado" error
- Check that the user exists in Supabase Authentication
- Make sure you checked "Auto Confirm User" when creating

### "Error al publicar" 
- Check Netlify function logs in your Netlify dashboard
- Verify `GITHUB_TOKEN` has correct permissions
- Make sure `GITHUB_OWNER` and `GITHUB_REPO` are correct in the function

### Posts not appearing on blog
- Check GitHub Actions workflow ran successfully
- Verify the commit was pushed to the `master` branch

---

## Admin Features

| Feature | Description |
|---------|-------------|
| Live Preview | See how the post will look while writing |
| Markdown Toolbar | Quick buttons for H2, H3, bold, italic, lists |
| Keyboard Shortcuts | Ctrl+B for bold, Ctrl+I for italic |
| Character Counts | Track title (100) and description (160) length |
| Auto-slug | Creates URL-friendly slugs from titles |
| Validation | Ensures minimum content length before publishing |
