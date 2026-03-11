---
description: Deploy changes to Lovable Cloud via GitHub
---

# Deploy to Lovable Cloud

This workflow pushes code changes to GitHub, which triggers automatic deployment to Lovable Cloud (including Supabase Edge Functions).

## Steps

### 1. Check current status
```bash
git status
```

### 2. Stage all changes
```bash
git add .
```

### 3. Commit with descriptive message
```bash
git commit -m "type: description"
```

**Commit types**: `feat`, `fix`, `security`, `refactor`, `docs`, `chore`

### 4. Push to GitHub
// turbo
```bash
git push origin main
```

This triggers Lovable Cloud's automatic deployment, which handles:
- Frontend build and deployment
- Supabase Edge Function deployment
- Environment variable injection

## Verify Deployment

1. Check Lovable dashboard for deployment status
2. Test Edge Functions via the app or curl:
   ```bash
   curl -X POST https://fupwpcqmyykfiuakjxxc.supabase.co/functions/v1/check-subscription \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json"
   ```

## Rollback (if needed)

```bash
git revert HEAD
git push origin main
```
