# Vercel + Render — Login Fix Checklist

If login fails on **rimido-eqms.vercel.app** (frontend) when calling **remidio-eqms-backend.onrender.com** (backend), check the following.

---

## 1. Vercel (Frontend) — Environment Variable

The frontend must call your **Render backend URL**, not localhost.

1. In **Vercel** → your project → **Settings** → **Environment Variables**
2. Add:
   - **Name:** `NEXT_PUBLIC_API_URL`
   - **Value:** `https://remidio-eqms-backend.onrender.com`
   - No trailing slash, no `/api`
3. **Redeploy** the frontend (Deployments → ⋮ → Redeploy) so the new variable is applied.

---

## 2. Render (Backend) — Environment Variables

The backend must allow your Vercel domain in CORS and use the production database.

1. In **Render** → your backend service → **Environment**
2. Ensure these are set:

   | Key | Value |
   |-----|--------|
   | `NODE_ENV` | `production` |
   | `FRONTEND_URL` | `https://rimido-eqms.vercel.app` |
   | `JWT_SECRET` | A long random string (e.g. 32+ chars) |
   | `DATABASE_URL` | Your production PostgreSQL URL (from Render or Neon) |

3. **Important:** If your Vercel URL is different (e.g. `remidio-eqms.vercel.app`), set `FRONTEND_URL` to that exact URL, including `https://`.
4. Save and let Render redeploy.

---

## 3. Production Database — Admin User

The **admin user must exist in the production database** (the one `DATABASE_URL` points to on Render). It is not created automatically.

### Option A: Using Neon / Supabase SQL editor

1. Open your production database (Neon dashboard, Supabase SQL editor, or Render’s PostgreSQL tab).
2. Run migrations if you haven’t (see Option B below).
3. Insert the admin user with a **correct bcrypt hash** for `Admin123!`:

```sql
-- Insert admin user (password: Admin123!)
INSERT INTO users (id, email, password_hash, first_name, last_name, employee_id, is_active, is_locked, failed_login_attempts, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin@remidio.com',
  '$2a$12$E.duNWjTApHVCcckss1jROudusvU0xjQp.0mwyx/Kp/.pYgu7rt6O',
  'Admin',
  'User',
  'EMP001',
  true,
  false,
  0,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  is_active = true,
  is_locked = false,
  failed_login_attempts = 0;

-- Assign Quality Manager role (adjust role name if different)
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email = 'admin@remidio.com' AND r.name = 'Quality Manager'
ON CONFLICT (user_id, role_id) DO NOTHING;
```

### Option B: Run migrations on production first

If the `users` or `roles` table doesn’t exist yet:

1. From your **local machine**, set `DATABASE_URL` in `.env` to the **production** PostgreSQL URL (same as on Render).
2. Run:
   ```bash
   cd backend
   npm run migrate
   ```
3. Then run the SQL above in your production database to create the admin user.

---

## 4. Verify Backend and CORS

1. **Health check:**  
   Open in browser:  
   `https://remidio-eqms-backend.onrender.com/health`  
   You should see something like: `{"status":"ok","timestamp":"..."}`.

2. **Login from browser:**  
   On your Vercel site, open DevTools (F12) → **Network**. Try to log in with:
   - Email: `admin@remidio.com`
   - Password: `Admin123!`

   Check the request to `.../api/auth/login`:
   - If it goes to `remidio-eqms-backend.onrender.com` → API URL is correct.
   - If status is **4xx/5xx**, check the **Response** tab for the backend error message.
   - If the request is **blocked** or **CORS error** → double-check `FRONTEND_URL` on Render (exact Vercel URL, including `https://`).

---

## 5. Common Issues

| Symptom | Fix |
|--------|-----|
| Request goes to `localhost:3001` | Set `NEXT_PUBLIC_API_URL` on Vercel and redeploy. |
| CORS error in browser | Set `FRONTEND_URL` on Render to your exact Vercel URL (e.g. `https://rimido-eqms.vercel.app`). Backend now allows `*.vercel.app`; redeploy backend after pulling latest code. |
| “Invalid credentials” | Admin user missing or wrong password in **production** DB. Run the SQL above against the DB used by Render. |
| “User not found” / 500 | Run migrations on production DB and create the admin user (Option B then Option A). |
| Render backend sleeps (free tier) | First request after idle can take 30–60 s; retry login once. |

---

## 6. Quick Test After Changes

1. Vercel: `NEXT_PUBLIC_API_URL` = `https://remidio-eqms-backend.onrender.com` → Redeploy.
2. Render: `FRONTEND_URL` = `https://rimido-eqms.vercel.app` (or your real Vercel URL) → Save/Redeploy.
3. Production DB: migrations run + admin user SQL run.
4. Wait 1–2 minutes, then try login again with `admin@remidio.com` / `Admin123!`.

If it still fails, use the Network tab and backend logs on Render to see the exact error (CORS, 401, 500, etc.) and we can fix that next.
