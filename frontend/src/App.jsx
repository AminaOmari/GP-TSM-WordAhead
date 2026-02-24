import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, Settings, X, Loader2, Play, Activity, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = ''; // Relative to the domain serving the app
const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

function App() {
  const [text, setText] = useState(''); // Start empty
  const [userLevel, setUserLevel] = useState('B1'); // Start at Medium
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedWord, setSelectedWord] = useState(null);
  const [translation, setTranslation] = useState(null);
  const [transLoading, setTransLoading] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  // Persistence State
  const [learnedWords, setLearnedWords] = useState(() => {
    const saved = localStorage.getItem('learned_words');
    return saved ? JSON.parse(saved) : {};
  });
  const [reviewList, setReviewList] = useState(() => {
    const saved = localStorage.getItem('review_list');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('learned_words', JSON.stringify(learnedWords));
  }, [learnedWords]);

  useEffect(() => {
    localStorage.setItem('review_list', JSON.stringify(reviewList));
  }, [reviewList]);

  const markLearned = (word) => {
    setLearnedWords(prev => ({ ...prev, [word.toLowerCase()]: true }));
    // Remove from review if it was there
    setReviewList(prev => {
      const { [word.toLowerCase()]: removed, ...rest } = prev;
      return rest;
    });
    alert(`"${word}" marked as learned! It won't be highlighted as hard anymore.`);
  };

  const addToReview = (word, details) => {
    setReviewList(prev => ({ ...prev, [word.toLowerCase()]: details }));
    alert(`"${word}" added to your study list.`);
  };

  const removeFromReview = (word) => {
    setReviewList(prev => {
      const { [word.toLowerCase()]: removed, ...rest } = prev;
      return rest;
    });
  };

  // Dynamic Level Adjustment Logic
  const [struggleCount, setStruggleCount] = useState(0);

  const handleWordClick = async (token) => {
    if (!token.cefr) return;

    const wIdx = CEFR_LEVELS.indexOf(token.cefr);
    const uIdx = CEFR_LEVELS.indexOf(userLevel);

    if (wIdx !== -1 && uIdx !== -1) {
      if (wIdx <= uIdx) {
        const newCount = struggleCount + 1;
        setStruggleCount(newCount);
        if (newCount >= 3) {
          if (uIdx > 0) {
            const newLevel = CEFR_LEVELS[uIdx - 1];
            setUserLevel(newLevel);
            setStruggleCount(0);
            alert(`We noticed you're looking up common words. Adjusting simplified level to ${newLevel} for better support.`);
          }
        }
      }
    }

    setSelectedWord(token);
    setTransLoading(true);
    setTranslation(null);

    try {
      const res = await axios.post(`${API_URL}/api/translate`, {
        word: token.text,
        context: text.substring(0, 200)
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
    if (!text.trim()) {
      alert("Please enter some text to analyze.");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/analyze`, {
        text,
        user_level: userLevel
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
      <header className="glass header-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--accent)', padding: '0.5rem', borderRadius: '8px' }}>
            <Activity color="white" size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>WordAhead</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Adaptive Reading Assistant</p>
          </div>
        </div>

        <div className="header-controls">
          <button className="btn" onClick={() => setShowDashboard(true)} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--bg-secondary)', color: 'var(--accent)' }}>
            <Settings size={18} /> My Progress
          </button>
          <div className="glass" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Current Profile:</span>
            <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{userLevel}</span>
          </div>
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
                // 4. Easy + Not Important -> "Progressive Fading" Grey (word-low / word-fade-X)

                // Importance usually ranges from 0 to 4 (depending on depth)
                // 0 = least important (removed early), 4 = most important (kept till end)

                const isLearned = learnedWords[t.text.toLowerCase().replace(/[.,:;?!"()]/g, '')];

                if (t.isDifficult && !isLearned) {
                  // HARD WORDS (Purple)
                  if (t.importance > 2) { // Assuming >2 is "Significant" importance
                    className += " word-hard-important";
                  } else {
                    className += " word-hard";
                  }
                } else if (t.importance >= 3) {
                  // IMPORTANT WORDS (Bold Black) - Easy but Critical
                  className += " word-important";
                } else {
                  // NOT IMPORTANT (Greys) - Easy and less critical
                  // Use importance level to determine shade of grey
                  // importance 0 -> lightest (word-low)
                  // importance 1 -> slightly darker (word-fade-1)
                  // importance 2 -> darker still (word-fade-2)
                  if (t.importance === 2) className += " word-fade-2";
                  else if (t.importance === 1) className += " word-fade-1";
                  else className += " word-low"; // importance 0
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

                {/* Action Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <button
                    className="btn"
                    style={{ background: '#22c55e', fontSize: '0.9rem', padding: '0.5rem' }}
                    onClick={() => markLearned(selectedWord.text)}
                  >
                    Mark Learned
                  </button>
                  <button
                    className="btn"
                    style={{ background: '#f59e0b', fontSize: '0.9rem', padding: '0.5rem' }}
                    onClick={() => addToReview(selectedWord.text, { translation, cefr: selectedWord.cefr })}
                  >
                    Review Later
                  </button>
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

      {/* Dashboard Modal */}
      <AnimatePresence>
        {showDashboard && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDashboard(false)}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
            }}
          >
            <motion.div
              className="glass"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '90%', maxWidth: '800px', maxHeight: '80vh', overflow: 'hidden',
                display: 'flex', flexDirection: 'column', background: 'white', padding: '2rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ margin: 0 }}>My Learning Progress</h2>
                <button className="close-btn" onClick={() => setShowDashboard(false)}><X size={24} /></button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', overflowY: 'auto' }}>
                {/* Review Section */}
                <div>
                  <h3 style={{ borderBottom: '2px solid #f59e0b', paddingBottom: '0.5rem' }}>Study List ({Object.keys(reviewList).length})</h3>
                  {Object.keys(reviewList).length === 0 ? <p style={{ color: '#64748b' }}>No words saved for review yet.</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {Object.entries(reviewList).map(([word, data]) => (
                        <div key={word} className="glass" style={{ padding: '1rem', position: 'relative' }}>
                          <button
                            onClick={() => removeFromReview(word)}
                            style={{ position: 'absolute', top: '5px', right: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                          >
                            <X size={14} />
                          </button>
                          <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--accent)' }}>{word}</div>
                          <div style={{ fontSize: '0.9rem', color: '#0f172a' }}>{data.translation?.translation || '...'}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '5px' }}>Level: {data.cefr}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Learned Section */}
                <div>
                  <h3 style={{ borderBottom: '2px solid #22c55e', paddingBottom: '0.5rem' }}>Mastered Words ({Object.keys(learnedWords).length})</h3>
                  {Object.keys(learnedWords).length === 0 ? <p style={{ color: '#64748b' }}>None yet. Mark words to see them here!</p> : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {Object.keys(learnedWords).map(word => (
                        <span key={word} style={{ background: '#f0fdf4', color: '#166534', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.9rem', border: '1px solid #bbf7d0' }}>
                          {word}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
