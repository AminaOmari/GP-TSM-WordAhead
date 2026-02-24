# WordAhead: Adaptive Reading Assistant 🚀

**WordAhead** is an intelligent, full-stack web application designed to help English language learners (specifically Hebrew speakers) tackle authentic texts. It uses the **GP-TSM (Grammatical Paraphrasing for Text Simplification and Modeling)** algorithm to provide a personalized, adaptive learning experience.

---

## 🌟 Key Features

### 1. Intelligent Text Analysis
- **Difficulty Estimation**: Automatically assigns CEFR levels (A1-C2) to every word in the text.
- **Semantic Importance**: Uses AI to determine which words are critical for understanding the main message.
- **Visual Scaffolding**: Color-codes text to guide the student's attention:
  - **Bold Purple**: Hard & Important (High Priority).
  - **Purple**: Hard but less critical.
  - **Bold Black**: Common but critical words.
  - **Faded Grey**: Non-essential "filler" vocabulary.

### 2. Adaptive Learning Profile
- **Click-Based Adjustment**: The app monitors word lookups. If a student struggles with "easy" words, it automatically lowers the difficulty profile (e.g., from B1 to A2) to offer more support.
- **Knowledge Retention**: When a student marks a word as **"Learned"**, the app remembers it permanently. Those words will never be highlighted as "Hard" again, creating a truly personalized reading experience.

### 3. Linguistic Support
- **Context-Aware Translation**: Provides Hebrew translations based on the surrounding sentence meaning using GPT-4o-mini.
- **Morphological Roots**: Extracts the Hebrew **Shoresh (Root)** of translated words to help students build deeper linguistic connections.
- **Vocabulary Dashboard**: A dedicated space to manage "Study Lists" and track "Mastered Words" across sessions.

---

## 🛠 Technology Stack

### Backend
- **FastAPI**: High-performance Python framework for the API.
- **OpenAI API (GPT-4o-mini)**: For contextual translation and linguistic analysis.
- **spaCy**: For NLP tasks like tokenization and lemmatization.
- **Sentence-Transformers**: Used for semantic importance scoring.
- **Wordfreq**: For Zipf-scale frequency analysis to estimate CEFR levels.

### Frontend
- **React**: Modern component-based UI.
- **Framer Motion**: For smooth micro-animations and transitions.
- **Lucide React**: For elegant iconography.
- **Tailwind CSS**: For responsive, premium design.

---

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js & npm

### Local Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/AminaOmari/GP-TSM-WordAhead.git
   cd GP-TSM-WordAhead
   ```

2. **Run the Setup Script**:
   We've included a helper script to start both the backend and frontend simultaneously for development:
   ```bash
   chmod +x start.sh
   ./start.sh
   ```

### Environment Variables
To run the analysis and translation, you must provide your OpenAI API key in a `.env` file or in your environment:
```env
OPENAI_API_KEY=your_secret_key_here
```

---

## 📦 Deployment

This project is optimized for deployment as a **Unified Web Service** on **Render**. For detailed instructions on how to deploy this yourself, see [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## 🎓 Graduation Project Context
This project was developed as a graduation project focusing on the intersection of **Artificial Intelligence** and **Language Pedagogy**. It demonstrates proficiency in:
- Full-stack system architecture.
- Advanced NLP algorithm implementation (GP-TSM).
- Adaptive user modeling and profile persistence.
- Secure API management and cloud deployment.

---

Developed with ❤️ for language learners.
