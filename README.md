# WordAhead: Adaptive Reading Assistant 🚀

**WordAhead** is an intelligent, full-stack web application designed to help English language learners (specifically Hebrew speakers) tackle authentic texts. It is "dressed" directly on the **GP-TSM (Grammatical Paraphrasing for Text Simplification and Modeling)** algorithm, providing a personalized, adaptive reading experience that maps the core structure of complex sentences.

---

## 🌟 Key Features

### 1. Structure Mapping (GP-TSM Core)
- **Logical Skeleton**: Uses the GP-TSM algorithm to reveal the core subject-verb-object structure of any text.
- **Condensation (Skimming)**: A dynamic slider allows users to "fade out" non-essential details, focusing solely on the structural backbone of the argument.
- **Importance Attributes**: Words are assigned a structural importance level (0-4) based on their presence in various stages of the GP-TSM shortening process.

### 2. Intelligent Highlighting & CEFR
- **Personalized Scaffolding**: Color-codes text specifically for the user's level:
  - **Bold Purple**: Hard & Important (Top Priority words).
  - **Purple**: Difficult words for the current level.
  - **Bold Black**: Important logical connectors or keywords.
  - **Faded Grey**: Contextual "noise" (dates, filler adjectives).
- **Difficulty Profile**: Automatically estimates CEFR levels (A1-C2) for every word using Zipf-frequency analysis.

### 3. Professional Hebrew Morphology
- **High-Precision Roots (שורש)**: Powered by **GPT-4o**, following the strict standards of the **Academy of the Hebrew Language (האקדמיה ללשון העברית)**.
- **Morphological Guard-Rails**: Includes internal Python verification to strip prefixes/suffixes and validate root accuracy, even for "weak" roots (*Gezarot*).
- **Context-Aware Translation**: Provides translations that respect the specific meaning of words in their current context.

### 4. Adaptive Learning & Persistence
- **Auto-Level Adjust**: The app monitors lookups; if a student struggles with common words, it lowers the support profile dynamically.
- **Knowledge Retention**: Marked "Learned" words are remembered via `localStorage` and will never be highlighted as "Hard" again.
- **Study Mode**: A dedicated dashboard to track study lists and flashcards for review.

---

## 🛠 Technology Stack

### Backend
- **FastAPI**: High-performance Python framework.
- **OpenAI GPT-4o**: Upgraded for superior linguistic precision and morphological reasoning.
- **Lightweight NLP Engine**: Optimized for **Render (512MB RAM)**. Replaces heavy spaCy/Torch models with a custom regex-based phrase splitter to maintain speed and reliability on low-memory instances.
- **Wordfreq**: For accurate Zipf-scale frequency analysis.

### Frontend
- **React**: Modern component-based UI.
- **Framer Motion**: Smooth micro-animations for the condensation slider and sidebar transitions.
- **Lucide React**: Elegant iconography.
- **Glassmorphism Design**: A premium, clean aesthetic focused on readability.

---

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js & npm
- OpenAI API Key

### Local Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/AminaOmari/GP-TSM-WordAhead.git
   cd GP-TSM-WordAhead
   ```

2. **Run the Integrated Start Script**:
   This will boot both the FastAPI backend and the React frontend:
   ```bash
   chmod +x start.sh
   ./start.sh
   ```

---

## 📦 Deployment

The project is pre-configured for **Render** using `render.yaml`. It is specifically optimized for memory-constrained environments, using a single-worker Gunicorn/Uvicorn setup and automated garbage collection.

---

## 🎓 Graduation Project
Developed as part of a Graduation Project in **Educational Technology & AI**.

**Team Members:**
- **Amina O**
- **Ossama Z**
- **Smia I**

Developed with ❤️ for language learners.
