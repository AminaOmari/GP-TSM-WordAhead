# Deployment Guide: Client-Server Mode (Free Tier)

This guide helps you deploy the GP-TSM WordAhead application to free hosting providers:
- **Backend**: Render (Free Web Service)
- **Frontend**: Vercel (Free Static Site)

## Prerequisites
- GitHub Account
- Accounts on [Render.com](https://render.com) and [Vercel.com](https://vercel.com)

---

## Part 1: Backend Deployment (Render)

1. **Commit your code** to a GitHub repository.
2. Log in to **Render** and click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Render should automatically detect `render.yaml` (Blueprint) if you used `New -> Blueprint`, but if you selected **Web Service**:
   - **Name**: `gp-tsm-backend`
   - **Region**: (Choose closest to you)
   - **Branch**: `main`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r backend/requirements.txt && python -m spacy download en_core_web_sm`
   - **Start Command**: `python backend/main.py`
5. **Environment Variables**:
   - Scroll down to "Environment Variables".
   - You SHOULD add your OpenAI API Key here if you want it hardcoded on server, OR rely on the Client sending it (current implementation relies on Client).
   - The code automatically uses the `PORT` variable provided by Render.

**Note on Free Tier Limits**:
The backend uses `torch` and `transformers`. These are heavy libraries. The free tier (512MB RAM) *might* run out of memory. If deployments fail:
- Update `backend/requirements.txt` to use CPU-only PyTorch versions if possible (advanced).
- Or upgrade to a paid starter plan ($7/mo).

6. **Deploy**.
7. Once deployed, Render will give you a URL (e.g., `https://gp-tsm-backend.onrender.com`). **Copy this URL.**

---

## Part 2: Frontend Deployment (Vercel)

1. Log in to **Vercel** and click **Add New** -> **Project**.
2. Import your GitHub repository.
3. **Configure Project**:
   - **Framework Preset**: Vite
   - **Root Directory**: Click `Edit` and select `frontend`. (This is import!)
4. **Environment Variables**:
   - Add a variable named `VITE_API_URL`.
   - Value: The URL you copied from Render (e.g., `https://gp-tsm-backend.onrender.com`).
     - *Note: Do not add a trailing slash.*
5. **Deploy**.

---

## Part 3: Verify

Open your Vercel URL.
- Enter your OpenAI API Key in the UI.
- Enter text and click "Analyze".
- The frontend will call your Render backend.

## Troubleshooting

- **CORS Issues**: The backend is configured to allow `*` (all origins), so it should work.
- **Backend 500 Errors**: Check the Render logs. It might be an "Out of Memory" (OOM) error due to `torch`.
