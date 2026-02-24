# Deployment Guide: Unified Render Deployment

This guide helps you deploy the **WordAhead** application (GP-TSM adaptive reader) to Render as a single, unified web service.

## Prerequisites
- GitHub Account with your code pushed.
- Account on [Render.com](https://render.com).
- OpenAI API Key.

---

## Unified Deployment Steps (Render)

1.  Log in to **Render** and click **New +** -> **Web Service**.
2.  Connect your GitHub repository.
3.  **Configure Project**:
    - **Name**: `wordahead-app` (or your choice).
    - **Region**: (Choose closest to you).
    - **Branch**: `main`.
    - **Runtime**: `Python 3`.
    - **Build Command**: `./build.sh`
    - **Start Command**: `python backend/main.py`
4.  **Environment Variables**:
    - Scroll down to "Environment Variables" or click "Advanced".
    - Click **Add Environment Variable**.
    - **Key**: `OPENAI_API_KEY`
    - **Value**: *[Your Secret OpenAI Key from platform.openai.com]*
5.  **Deploy**.

---

## What Happens Under the Hood?

Instead of using two different platforms, Render now handles everything:
1.  The `build.sh` script runs `npm run build` inside the `frontend` folder.
2.  It then installs the Python requirements and downloads the AI models.
3.  The FastAPI backend is configured to serve the resulting static files from the `frontend/dist` folder.
4.  All API calls are handled on the same domain.

## Troubleshooting

- **First Load Delay**: Since this is on Render's Free Tier, the server will "sleep" after 15 minutes of inactivity. When you first visit the URL, it may take ~50 seconds to boot up.
- **Out of Memory**: AI models are heavy. If the build fails or crashes, check the Render logs. We use a CPU-optimized version of `torch` and the `all-MiniLM-L6-v2` model to stay within the 512MB free RAM limit.
- **API Key Error**: If you see a "401" error in the app, it means the `OPENAI_API_KEY` in your Render Environment settings is incorrect or your OpenAI account has $0 balance.
