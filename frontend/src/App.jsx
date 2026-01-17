import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, Settings, X, Loader2, Play, Activity, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openai_api_key') || '');

  useEffect(() => {
    localStorage.setItem('openai_api_key', apiKey);
  }, [apiKey]);

  const [text, setText] = useState(''); // Start empty
  const [userLevel, setUserLevel] = useState('B1'); // Start at Medium
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedWord, setSelectedWord] = useState(null);
  const [translation, setTranslation] = useState(null);
  const [transLoading, setTransLoading] = useState(false);

  // Dynamic Level Adjustment Logic
  // Heuristic: If user clicks 3 words that are AT or BELOW their current level, 
  // it means they are struggling with "easy" words -> Downgrade Level.
  const [struggleCount, setStruggleCount] = useState(0);

  const handleWordClick = async (token) => {
    // Ignore purely structural tokens or undefined levels
    if (!token.cefr) return;

    const wIdx = CEFR_LEVELS.indexOf(token.cefr);
    const uIdx = CEFR_LEVELS.indexOf(userLevel);

    // Dynamic Learning Logic
    if (wIdx !== -1 && uIdx !== -1) {
      if (wIdx <= uIdx) {
        // User clicked a word that should be easy for them (or equal level)
        // Increment struggle count
        const newCount = struggleCount + 1;
        setStruggleCount(newCount);

        if (newCount >= 3) {
          // Trigger Downgrade if possible
          if (uIdx > 0) {
            const newLevel = CEFR_LEVELS[uIdx - 1];
            setUserLevel(newLevel);
            setStruggleCount(0); // Reset
            // Optional: Toast notification could go here
            console.log(`Dynamic Adjustment: Downgrading user from ${userLevel} to ${newLevel}`);
            alert(`We noticed you're looking up common words. Adjusting simplified level to ${newLevel} for better support.`);
          }
        }
      }
    }

    // Show Translation in Sidebar
    setSelectedWord(token);
    setTransLoading(true);
    setTranslation(null);

    try {
      const res = await axios.post(`${API_URL}/translate`, {
        word: token.text,
        context: text.substring(0, 200),
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
      {/* Header */}
      <header className="glass header-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--accent)', padding: '0.5rem', borderRadius: '8px' }}>
            <Activity color="white" size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>GP-TSM Reader</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Adaptive Reading Assistant</p>
          </div>
        </div>

        <div className="header-controls">
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
      <div className="glass legend-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="word word-hard-important">Hard & Important</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>(Bold Purple)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="word word-hard">Hard</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>(Purple)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="word word-important">Important</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>(Bold Black)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="word word-low">Non-Important</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>(Grey)</span>
        </div>
      </div>

      {/* Main Content: 3-Column Layout */}
      <div className="main-layout">

        {/* Left Panel: Input */}
        <div className="glass input-panel">
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
        <div className="glass content-panel">
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
                // 1. Hard + Important -> Bold Purple (word-hard-important)
                // 2. Hard + Not Important -> Purple (word-hard)
                // 3. Easy + Important -> Bold Black (word-important)
                // 4. Easy + Not Important -> Grey (word-low)

                if (t.isDifficult) {
                  if (t.importance > 0) {
                    className += " word-hard-important";
                  } else {
                    className += " word-hard";
                  }
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
        <div className="glass translation-panel">
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
