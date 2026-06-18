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

## 🧪 Test Automation & Quality Assurance

WordAhead includes a robust, end-to-end automated testing system to verify the participant flow, counterbalancing routing, and behavioral data pipeline.

### 1. Backend Integration & Permutation Tests (Pytest)
The backend test suite covers participant assignment rules, LexTALE score classifications, counterbalancing permutations, database updates, and Qualtrics CSV generation.

To run the backend tests:
```bash
# From the root directory
source venv/bin/activate
cd backend
pytest
```

### 2. Frontend E2E Participant Flow (Playwright)
The frontend tests simulate the complete E2E participant journey: from consent and vocabulary screening (LexTALE), through demographics, pre-reading topic exposure, reading tasks (WordAhead / Plain), comprehension quizzes, per-task/post-study surveys, and finally the Prolific completion redirect.

To run the E2E browser tests:
```bash
# Install Playwright browser dependencies (first time only)
cd frontend
npx playwright install chromium

# Run the Playwright test suite
npx playwright test
```

### 3. Manual Verification Checklist
Subjective and visual quality aspects (such as Hebrew RTL layouts, color contrast, and GP-TSM text gray-levels) are audited using the [manual_qa_checklist.md](file:///Users/omari/Desktop/VSC/GP-TSM%20WordAhead/manual_qa_checklist.md) file in the workspace root.

---

## 📦 Deployment

The project is pre-configured for **Render** using `render.yaml`. It is specifically optimized for memory-constrained environments, using a single-worker Gunicorn/Uvicorn setup and automated garbage collection.

---

## 🎓 Graduation Project
Developed as part of a Graduation Project in **Information Systems Specializing in AI**.

**Team Members:**
- **Amina Omari**
- **Ossama Ziadat**
- **Smia Idres**

Developed with ❤️ for language learners.
