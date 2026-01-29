# Remidio eQMS — Run Always & Free Hosting

## Part 1: Run locally and keep it running (even after closing terminal)

Use **PM2** so the backend and frontend keep running when you close CMD/PowerShell.

### One-time setup

1. **Install dependencies** (from project root):
   ```bash
   npm install
   cd backend && npm install && cd ..
   cd frontend && npm install && cd ..
   ```
   PM2 is installed at the root when you run `npm install`.

2. **Ensure PostgreSQL is running** and your `.env` has the correct `DB_*` and `JWT_SECRET`.

3. **Run database migration** (if not done already):
   ```bash
   npm run migrate
   ```

### Start the app (keeps running after you close the terminal)

From the project root (`E:\remidio\eqms`):

```bash
npm run start:pm2
```

This starts:
- **Backend** on http://localhost:3001  
- **Frontend** on http://localhost:3000  

You can close the terminal/CMD — both will keep running.

### Useful PM2 commands

| Command | Description |
|--------|-------------|
| `npm run status:pm2` | Show status of backend and frontend |
| `npm run logs:pm2` | Stream logs from both apps |
| `npm run stop:pm2` | Stop both apps |
| `npm run restart:pm2` | Restart both apps |

### Optional: start PM2 on Windows login

1. Start the app once: `npm run start:pm2`
2. Save the process list: `pm2 save`
3. Generate startup script: `pm2 startup`
4. Run the command it prints (e.g. run as Administrator if it says so).

After that, PM2 will start your apps again after a reboot.

---

## Part 2: Host the website online (free)

You can host the eQMS for free using:

- **Frontend** → Vercel (free)  
- **Backend** → Railway or Render (free tier)  
- **Database** → Neon or Supabase (free PostgreSQL)

### Step 1: Push code to GitHub

1. Create a new repo on https://github.com/new  
2. Push your project:
   ```bash
   git init
   git add .
   git commit -m "Initial eQMS"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

### Step 2: Free PostgreSQL database (Neon)

1. Go to https://neon.tech and sign up (free).  
2. Create a new project and copy the **connection string** (e.g. `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`).  
3. Keep this for the backend env as `DATABASE_URL` (and optionally `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` if your app uses them).

### Step 3: Deploy backend (Railway — free tier)

1. Go to https://railway.app and sign up with GitHub.  
2. **New Project** → **Deploy from GitHub repo** → select your repo.  
3. Set **Root Directory** to `backend`.  
4. Under **Variables**, add:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = (Neon connection string from Step 2)
   - `JWT_SECRET` = (generate a long random string)
   - `FRONTEND_URL` = (you’ll set this after deploying the frontend, e.g. `https://your-app.vercel.app`)
   - `PORT` = `3001` (if required)
5. In **Settings** → **Build**:  
   Build command: `npm install && npm run build`  
   Start command: `npm start`  
   (Adjust if Railway suggests different.)  
6. Deploy. Copy the public URL (e.g. `https://your-backend.up.railway.app`).

### Step 4: Deploy frontend (Vercel — free)

1. Go to https://vercel.com and sign up with GitHub.  
2. **Add New** → **Project** → import your repo.  
3. Set **Root Directory** to `frontend`.  
4. **Environment Variables**:
   - `NEXT_PUBLIC_API_URL` = your backend URL from Step 3 (e.g. `https://your-backend.up.railway.app`)  
   No leading slash, no `/api`.  
5. Deploy. Vercel will give you a URL like `https://your-app.vercel.app`.

### Step 5: Point backend to frontend

1. In **Railway** (backend) → **Variables**:  
   Set `FRONTEND_URL` = `https://your-app.vercel.app` (your Vercel URL).  
2. Redeploy the backend so the new variable is applied.

### Step 6: Run migrations on the hosted database

From your PC (with Neon URL in `.env` or in the command):

```bash
cd backend
# Set DATABASE_URL to your Neon URL, then:
npm run migrate
```

Or use Railway’s “Run command” / one-off job if it supports running `npm run migrate` with the same `DATABASE_URL`.

### Step 7: Create admin user

Use your backend’s health URL to confirm it’s up, then create the first user (e.g. via SQL on Neon’s SQL editor using the same instructions as in SETUP.md, or a small script that calls your register endpoint if you add one).

---

## Summary

| Goal | What to do |
|------|------------|
| **Run locally and keep running after closing terminal** | Use `npm run start:pm2` from project root; then you can close CMD. Use `npm run stop:pm2` to stop. |
| **Host the website for free** | Use GitHub + Neon (DB) + Railway (backend) + Vercel (frontend) as above. |

If you tell me your OS (e.g. Windows 11) and whether you use GitHub already, I can adapt the commands (e.g. exact PowerShell steps) for you.
