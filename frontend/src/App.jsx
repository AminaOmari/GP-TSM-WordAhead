import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, Settings, X, Loader2, Play, Activity, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

function App() {
  const [apiKey, setApiKey] = useState('');
  const [text, setText] = useState(''); // Start empty
  const [userLevel, setUserLevel] = useState('B1'); // Start at Medium
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedWord, setSelectedWord] = useState(null);
  const [translation, setTranslation] = useState(null);
  const [transLoading, setTransLoading] = useState(false);

  // Dynamic Level Adjustment Logic
  const handleWordClick = async (token) => {
    // Ignore purely structural tokens if needed, but assuming user clicks meaningful words
    if (!token.cefr) return;

    // Adjust Level
    const wIdx = CEFR_LEVELS.indexOf(token.cefr);
    const uIdx = CEFR_LEVELS.indexOf(userLevel);

    // If word level < current user level, downgrade logic could go here

    // Show Translation in Sidebar
    setSelectedWord(token);
    setTransLoading(true);
    setTranslation(null);

    try {
      const res = await axios.post(`${API_URL}/translate`, {
        word: token.text,
        context: text.substring(0, 200), // simplistic context
        api_key: apiKey
      });
      setTranslation(res.data);
    } catch (err) {
      console.error(err);
      setTranslation({ error: "Failed to fetch translation." });
    } finally {
      setTransLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!apiKey) {
      alert("Please enter an OpenAI API Key.");
      return;
    }
    if (!text.trim()) {
      alert("Please enter some text to analyze.");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/analyze`, {
        text,
        user_level: userLevel,
        api_key: apiKey
      });
      setTokens(res.data.tokens);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || err.message || "Unknown error";
      alert(`Analysis failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="glass" style={{ padding: '1.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--accent)', padding: '0.5rem', borderRadius: '8px' }}>
            <Activity color="white" size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>GP-TSM Reader</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Adaptive Reading Assistant</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input
            type="password"
            placeholder="OpenAI API Key"
            className="input"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={{ width: '200px' }}
          />
          <select
            className="input"
            value={userLevel}
            onChange={(e) => setUserLevel(e.target.value)}
            style={{ width: '100px' }}
          >
            {CEFR_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </header>

      {/* Categories Legend */}
      <div className="glass" style={{ padding: '1rem', marginBottom: '2rem', display: 'flex', gap: '2rem', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="word word-hard">Hard Word</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>(Purple)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="word word-important">Important Word</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>(Bold Black)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="word word-low">Non-Important</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>(Grey)</span>
        </div>
      </div>

      {/* Main Content: 3-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr 300px', gap: '1.5rem', alignItems: 'start' }}>

        {/* Left Panel: Input */}
        <div className="glass" style={{ padding: '1rem', height: 'fit-content', position: 'sticky', top: '1rem' }}>
          <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontSize: '1.2rem' }}>
            <BookOpen size={18} /> Input
          </h2>
          <textarea
            className="input"
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text here..."
            style={{ resize: 'vertical', fontFamily: 'monospace', marginBottom: '1rem', fontSize: '0.9rem' }}
          />
          <button className="btn" onClick={handleAnalyze} style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }}>
            {loading ? <Loader2 className="loader" style={{ width: 16, height: 16 }} /> : <Play size={16} />}
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>

        {/* Middle Panel: Output */}
        <div className="glass" style={{ padding: '2rem', minHeight: '600px', background: 'white' }}>
          {tokens.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
              <p>Ready to process. Enter text and click Analyze.</p>
            </div>
          ) : (
            <div style={{ lineHeight: '2.0', fontSize: '1.2rem' }}>
              {tokens.map((t, i) => {
                if (t.text === '\n') return <br key={i} />;

                let className = "word";

                // Logic based on requirements:
                // 1. Hard Word -> Purple (word-hard)
                // 2. Important (GP-TSM > 0) -> Bold Black (word-important)
                // 3. Non-Important (GP-TSM 0) -> Grey (word-low)

                if (t.isDifficult) {
                  className += " word-hard";
                } else if (t.importance > 0) {
                  className += " word-important";
                } else {
                  className += " word-low";
                }

                return (
                  <motion.span
                    key={i}
                    className={className}
                    onClick={() => handleWordClick(t)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.001 }}
                    whileHover={{ scale: 1.05 }}
                    title={t.cefr ? `Level: ${t.cefr} | Imp: ${t.importance}` : null}
                  >
                    {t.text}{" "}
                  </motion.span>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Panel: Translation Sidebar */}
        <div className="glass" style={{ padding: '1.5rem', height: 'fit-content', minHeight: '300px', position: 'sticky', top: '1rem', background: 'white' }}>
          <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontSize: '1.2rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
            <Activity size={18} /> Word Details
          </h2>

          <AnimatePresence mode="wait">
            {!selectedWord ? (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}
              >
                <p>Click on a word to see its translation and details here.</p>
              </motion.div>
            ) : (
              <motion.div
                key={selectedWord.text}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--accent)' }}>{selectedWord.text}</h3>
                  <button className="close-btn" onClick={() => setSelectedWord(null)} style={{ position: 'static', fontSize: '1.2rem' }}><X size={18} /></button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <span style={{ background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    CEFR: <strong>{selectedWord.cefr || 'N/A'}</strong>
                  </span>
                  <span style={{ background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Importance: <strong>{selectedWord.importance}</strong>
                  </span>
                </div>

                {transLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                    <Loader2 className="loader" style={{ width: '32px', height: '32px' }} />
                  </div>
                ) : translation ? (
                  translation.error ? (
                    <div style={{ padding: '1rem', background: '#fee2e2', borderRadius: '8px', color: '#991b1b' }}>
                      {translation.error}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <div>
                        <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>Translation</h4>
                        <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{translation.translation}</div>
                      </div>

                      {translation.root && (
                        <div>
                          <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>Root (Shoresh)</h4>
                          <div style={{ fontSize: '1.2rem', fontFamily: 'serif' }}>{translation.root}</div>
                        </div>
                      )}

                      {translation.example && (
                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid var(--accent)' }}>
                          <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>Example</h4>
                          <p style={{ fontStyle: 'italic', margin: 0, color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: '1.5' }}>"{translation.example}"</p>
                        </div>
                      )}
                    </div>
                  )
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default App;
