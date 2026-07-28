import React, { useState } from 'react';
import axios from 'axios';
import './OriginalGPTSM.css';

const SAMPLE_MEDICAL_TEXT = `Patient is a 64-year-old male who presented to the emergency department on Monday morning with acute shortness of breath and mild left-sided chest tightness. Initial electrocardiogram revealed normal sinus rhythm without ischemic changes. Serum troponin levels were within normal limits. Chest radiograph demonstrated mild bilateral basal pulmonary congestion without cardiomegaly. The patient was started on low-dose oral diuretics and observed overnight. Symptoms resolved completely by Tuesday morning, and the patient was discharged with outpatient cardiology follow-up.`;

const OPACITY_COLORS = {
  4: '#000000', // Core / Salient
  3: '#767676',
  2: '#A0A0A0',
  1: '#B9B9B9',
  0: '#D0D0D0', // Supporting detail
};

export default function OriginalGPTSM() {
  const [text, setText] = useState('');
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setError('Please enter or paste a passage of text to skim.');
      return;
    }
    setError('');
    setLoading(true);
    setTokens([]);

    try {
      const response = await axios.post('/api/original/analyze', { text }, { timeout: 120000 });
      if (response.data && response.data.tokens) {
        setTokens(response.data.tokens);
      } else {
        setError('No tokens returned from server.');
      }
    } catch (err) {
      console.error('Error analyzing text with GP-TSM:', err);
      const msg = err.response?.data?.detail || err.message || 'Failed to process request.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSample = () => {
    setText(SAMPLE_MEDICAL_TEXT);
    setError('');
  };

  return (
    <div className="gptsm-original-container">
      {/* Header section */}
      <header className="gptsm-original-header">
        <div className="gptsm-badge">Unmodified Base Algorithm</div>
        <h1>GP-TSM — Text-Skimming Assistant</h1>
        <p className="gptsm-authors">
          Grammar-Preserving Text Saliency Modulation (Gu et al., Harvard University, CHI 2024)
        </p>
        <p className="gptsm-disclaimer">
          This standalone demo runs the pure, unmodified GP-TSM algorithm (full quality <code>llm.py</code> pipeline with <code>MAX_DEPTH=10</code> and <code>N=8</code>). None of WordAhead's Hebrew translation, vocabulary difficulty scoring, or participant experiment logic are active on this page.
        </p>
        <div className="gptsm-links">
          <a
            href="https://github.com/ZiweiGu/GP-TSM"
            target="_blank"
            rel="noopener noreferrer"
            className="gptsm-link-button"
          >
            GitHub Repository
          </a>
          <a
            href="https://www.ziweigu.com/assets/data/gptsm.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="gptsm-link-button secondary"
          >
            Read CHI 2024 Paper (PDF)
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="gptsm-original-main">
        {/* Input Panel */}
        <section className="gptsm-card">
          <div className="gptsm-card-header">
            <h2>Source Text Input</h2>
            <div className="gptsm-card-actions">
              <button
                type="button"
                className="gptsm-btn-secondary"
                onClick={handleLoadSample}
                disabled={loading}
              >
                Load Sample Clinical Note
              </button>
            </div>
          </div>

          <div className="gptsm-textarea-wrapper">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste any document passage here (medical notes, legal briefs, news articles, academic text)..."
              maxLength={1000}
              rows={6}
              disabled={loading}
            />
            <div className="gptsm-char-count">
              {text.length} / 1,000 characters (demo limit per request)
            </div>
          </div>

          {error && <div className="gptsm-error-message">{error}</div>}

          <div className="gptsm-action-bar">
            <button
              type="button"
              className="gptsm-btn-primary"
              onClick={handleAnalyze}
              disabled={loading || !text.trim()}
            >
              {loading ? (
                <>
                  <span className="gptsm-spinner"></span>
                  Processing LLM Compression...
                </>
              ) : (
                'Skim this text'
              )}
            </button>
          </div>
        </section>

        {/* Legend Bar */}
        <section className="gptsm-legend-card">
          <div className="gptsm-legend-title">Saliency De-Emphasis Scale</div>
          <div className="gptsm-legend-items">
            <div className="gptsm-legend-item">
              <span className="gptsm-swatch" style={{ backgroundColor: OPACITY_COLORS[4] }}></span>
              <span>Level 4: Core Meaning (Darkest Black)</span>
            </div>
            <div className="gptsm-legend-item">
              <span className="gptsm-swatch" style={{ backgroundColor: OPACITY_COLORS[3] }}></span>
              <span>Level 3: Important Detail</span>
            </div>
            <div className="gptsm-legend-item">
              <span className="gptsm-swatch" style={{ backgroundColor: OPACITY_COLORS[2] }}></span>
              <span>Level 2: Moderate Detail</span>
            </div>
            <div className="gptsm-legend-item">
              <span className="gptsm-swatch" style={{ backgroundColor: OPACITY_COLORS[1] }}></span>
              <span>Level 1: Minor Detail</span>
            </div>
            <div className="gptsm-legend-item">
              <span className="gptsm-swatch" style={{ backgroundColor: OPACITY_COLORS[0] }}></span>
              <span>Level 0: Supporting Detail (Lightest Gray)</span>
            </div>
          </div>
        </section>

        {/* Output Panel */}
        {tokens.length > 0 && (
          <section className="gptsm-card output-card">
            <h2>GP-TSM Skimmed Rendering</h2>
            <div className="gptsm-rendered-text">
              {tokens.map((tok, idx) => {
                if (tok.text === '\n' || tok.level === -1) {
                  return <br key={idx} />;
                }
                const color = OPACITY_COLORS[tok.level] || OPACITY_COLORS[0];
                return (
                  <span
                    key={idx}
                    style={{ color, transition: 'color 0.2s ease' }}
                    className="gptsm-word-span"
                  >
                    {tok.text}{' '}
                  </span>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Footer License Notice */}
      <footer className="gptsm-original-footer">
        <p>
          Copyright (c) 2024, Ziwei Gu, Ian Arawjo, Kenneth Li, Jonathan K. Kummerfeld, and Elena L. Glassman. Licensed for academic and non-commercial research use only.
        </p>
      </footer>
    </div>
  );
}
