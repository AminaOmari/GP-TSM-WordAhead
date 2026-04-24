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
- **Difficulty Profile**: Empirically maps CEFR levels (A1-C2) using the **EFLLex dataset** (15,000+ words), with Zipf-frequency interpolation as a fallback for out-of-vocabulary terms.

### 3. Professional Hebrew Morphology
- **High-Precision Roots (שורש)**: Uses the **Wiktionary API** as the authoritative primary source for Hebrew morphology, falling back to **GPT-4o** reasoning for unmapped words.
- **Context-Aware Translation**: Provides translations that respect the specific meaning of polysemous words in their current context.
- **Empirical Validation**: Benchmarks accuracy against human-annotated Gold Standard datasets.

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

### Running the Evaluation Suite (Empirical Validation)
WordAhead includes built-in academic evaluation scripts to measure the accuracy of its models:

1. **CEFR Classification Validation**:
   Tests the difficulty engine against the EFLLex dataset (Accuracy, Cohen's Kappa).
   ```bash
   cd backend
   python validate_efllex.py EFLLex.tsv
   ```
2. **Context-Aware Translation & Morphology Validation**:
   Tests the LLM against a curated Gold Standard dataset (50 edge-case sentences).
   ```bash
   cd backend
   python validate_translation.py
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
