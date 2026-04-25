import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, Settings, X, Loader2, Play, Activity, Info, Upload, Trash2, StopCircle, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = ''; // Relative to the domain serving the app
const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

const Flashcard = ({ word, data, onRemove }) => {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className={`flashcard-container ${flipped ? 'is-flipped' : ''}`}
      onClick={() => setFlipped(!flipped)}
    >
      <div className="flashcard-inner">
        <div className="flashcard-front">
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(word); }}
            style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '5px' }}
          >
            <X size={16} />
          </button>
          <div className="flashcard-word">{word}</div>
          <div className="flashcard-meta">CEFR Level: <strong>{data.cefr}</strong></div>
          <div className="flashcard-hint">Click to see translation</div>
        </div>
        <div className="flashcard-back">
          <div className="flashcard-translation">
            {data.translation?.translation || '...'}
            {data.translation?.transliteration && (
              <span style={{ fontSize: '0.9em', color: '#94a3b8', marginLeft: '0.3rem', fontWeight: 'normal' }}>
                ({data.translation.transliteration})
              </span>
            )}
          </div>
          {data.translation?.root && data.translation.root !== "N/A" && !data.translation.root.toLowerCase().includes("loanword") && (
            <div className="flashcard-meta" style={{ marginTop: '0.5rem' }}>
              Root: <strong style={{
                fontSize: data.translation.root.length > 5 ? '0.9em' : 'inherit',
                letterSpacing: '0.05em'
              }}>{data.translation.root}</strong>
              {data.translation?.root_meaning && (
                <div style={{ fontSize: '0.9em', color: '#64748b', marginTop: '0.2rem' }}>
                  {data.translation.root_meaning}
                </div>
              )}
            </div>
          )}
          <div className="flashcard-hint">Click to flip back</div>
        </div>
      </div>
    </div>
  );
};


function App() {
  const [text, setText] = useState(''); // Start empty
  const [userLevel, setUserLevel] = useState('B2'); // Start at Higher Intermediate
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedWord, setSelectedWord] = useState(null);
  const [translation, setTranslation] = useState(null);
  const [transLoading, setTransLoading] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [skimmingLevel, setSkimmingLevel] = useState(0); // 0 = Show All, higher = More Condensed
  const [abortController, setAbortController] = useState(null);
  const [fileLimitError, setFileLimitError] = useState('');
  const [showHowToUse, setShowHowToUse] = useState(false);
  const [learnedStatus, setLearnedStatus] = useState(false);
  const [notification, setNotification] = useState('');

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

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
    const cleanWord = word.toLowerCase().replace(/[.,:;?!"()]/g, '');
    setLearnedWords(prev => ({ ...prev, [cleanWord]: true }));
    // Immediately update current tokens so highlighting disappears right away
    setTokens(prev => prev.map(token => {
      const tokenClean = token.text.toLowerCase().replace(/[.,:;?!"()]/g, '');
      if (tokenClean === cleanWord) {
        return { ...token, isDifficult: false, isLearned: true };
      }
      return token;
    }));
    setReviewList(prev => {
      const { [cleanWord]: removed, ...rest } = prev;
      return rest;
    });
  };

  const addToReview = (word, details) => {
    setReviewList(prev => ({ ...prev, [word.toLowerCase()]: details }));
    showNotification(`"${word}" added to your study list.`);
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

    if (wIdx !== -1 && uIdx !== -1 && wIdx >= uIdx) {
      const newCount = struggleCount + 1;
      setStruggleCount(newCount);
      if (newCount >= 3 && uIdx > 0) {
        const newLevel = CEFR_LEVELS[uIdx - 1];
        setUserLevel(newLevel);
        setStruggleCount(0);
        showNotification(`We noticed you're looking up hard words. Adjusting level to ${newLevel} for better support.`);
      }
    }

    setSelectedWord(token);
    setTransLoading(true);
    setTranslation(null);

    try {
      const sentences = text.match(/[^.!?]*[.!?]/g) || [text];
      const relevantSentence = sentences.find(s =>
        s.toLowerCase().includes(token.text.toLowerCase())
      ) || text.substring(0, 300);

      const res = await axios.post(`${API_URL}/api/translate`, {
        word: token.text,
        context: relevantSentence
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
      showNotification("Please enter some text to analyze.");
      return;
    }

    const controller = new AbortController();
    setAbortController(controller);
    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/api/analyze`, {
        text,
        user_level: userLevel
      }, { signal: controller.signal });
      const processedTokens = res.data.tokens.map(token => {
        const cleanWord = token.text.toLowerCase().replace(/[.,:;?!"()]/g, '');
        if (learnedWords[cleanWord]) {
          return { ...token, isDifficult: false, isLearned: true };
        }
        return token;
      });
      setTokens(processedTokens);
    } catch (err) {
      if (axios.isCancel(err)) {
        console.log("Analysis cancelled by user");
      } else {
        console.error(err);
        const msg = err.response?.data?.detail || err.message || "Unknown error";
        showNotification(`Analysis failed: ${msg}`);
      }
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  };

  const handleStopAnalysis = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setFileLimitError("File is too large. Max size is 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      if (content.length > 50000) {
        setFileLimitError("Text is too long. Max characters: 50,000.");
        return;
      }
      setText(content);
      setFileLimitError('');
    };
    reader.readAsText(file);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="glass header-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/WordAheadLogo.png" alt="WordAhead Logo" style={{ height: '50px', width: '100px', objectFit: 'contain', borderRadius: '8px' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>WordAhead</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Adaptive Reading Assistant</p>
          </div>
        </div>

        <div className="header-controls">
          <button className="btn" onClick={() => setShowHowToUse(true)} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--bg-secondary)', color: 'var(--accent)' }}>
            <HelpCircle size={18} /> How to Use
          </button>
          <button className="btn" onClick={() => setShowDashboard(true)} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--bg-secondary)', color: 'var(--accent)' }}>
            <Settings size={18} /> My Progress
          </button>
          <div className="glass" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Language Level:</span>
            <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{userLevel}</span>
          </div>
        </div>
      </header>

      {notification && (
        <div style={{
          position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--accent)', color: 'white', padding: '0.75rem 1.5rem',
          borderRadius: '8px', zIndex: 9999, fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          {notification}
        </div>
      )}


      {/* Categories Legend */}
      <div className="glass legend-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderRight: '1px solid #e2e8f0', paddingRight: '1.5rem', marginRight: '0.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Condensation (Skimming)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <span style={{ fontSize: '0.7rem' }}>Detailed</span>
              <input
                type="range" min="0" max="3" step="1"
                value={skimmingLevel}
                onChange={(e) => setSkimmingLevel(parseInt(e.target.value))}
                style={{ width: '120px', accentColor: 'var(--accent)' }}
              />
              <span style={{ fontSize: '0.7rem' }}>Skimmed</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
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
      </div>

      {/* Main Content: 3-Column Layout */}
      <div className="main-layout">

        <div className="glass input-panel">
          <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontSize: '1.2rem' }}>
            <BookOpen size={18} /> Input
          </h2>

          <div style={{ marginBottom: '1rem' }}>
            <label className="btn" style={{ background: 'var(--bg-secondary)', color: 'var(--accent)', border: '1px dashed var(--accent)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', fontSize: '0.85rem' }}>
              <Upload size={16} /> Upload Text File
              <input type="file" accept=".txt" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.3rem' }}>
              Max size: 5MB / 50k chars
            </p>
            {fileLimitError && <p style={{ fontSize: '0.7rem', color: '#dc2626', textAlign: 'center', marginTop: '0.3rem' }}>{fileLimitError}</p>}
          </div>

          <textarea
            className="input"
            rows={20}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text here..."
            style={{ resize: 'vertical', fontFamily: 'monospace', marginBottom: '1rem', fontSize: '0.9rem', minHeight: '300px' }}
          />

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn" onClick={handleAnalyze} disabled={loading} style={{ flex: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }}>
              {loading ? <Loader2 className="loader" style={{ width: 16, height: 16 }} /> : <Play size={16} />}
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
            {loading && (
              <button className="btn" onClick={handleStopAnalysis} style={{ flex: 1, background: '#dc2626', padding: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }} title="Stop Analysis">
                <StopCircle size={18} />
              </button>
            )}
          </div>

          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', fontStyle: 'italic' }}>
              Ready to process. Enter text and click Analyze.
            </p>
          </div>
        </div>

        {/* Middle Panel: Output */}
        <div className="glass content-panel">
          <h2 style={{ marginTop: 0, marginBottom: '1.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9', color: 'var(--text-secondary)', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Output
          </h2>
          {tokens.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80%', color: 'var(--text-secondary)' }}>
              <p>Analysis results will appear here.</p>
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
                    animate={{
                      opacity: t.importance < skimmingLevel ? 0.1 : 1,
                      scale: 1
                    }}
                    transition={{
                      delay: i * 0.001,
                      opacity: { duration: 0.3 }
                    }}
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
          <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontSize: '1.1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
            <Activity size={18} /> Translation
          </h2>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '-0.3rem', marginBottom: '1rem' }}>English → Hebrew</p>

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

                {translation && !translation.error && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    {translation.part_of_speech && (
                      <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                        {translation.part_of_speech}
                      </span>
                    )}
                    {/*
                    // Temporarily hiding "Confidence" badge
                    translation.confidence && (
                      <span style={{
                        background: translation.confidence === 'High' ? '#f0fdf4' : translation.confidence === 'Low' ? '#fef2f2' : '#fefce8',
                        color: translation.confidence === 'High' ? '#166534' : translation.confidence === 'Low' ? '#991b1b' : '#854d0e',
                        padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem'
                      }}>
                        Confidence: {translation.confidence}
                      </span>
                    )
                    */}
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <button
                    className="btn"
                    style={{ background: '#22c55e', fontSize: '0.9rem', padding: '0.5rem' }}
                    onClick={() => {
                      markLearned(selectedWord.text);
                      setLearnedStatus(true);
                      setTimeout(() => setLearnedStatus(false), 2000);
                    }}
                  >
                    {learnedStatus ? "✓ Learned!" : "Mark Learned"}
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
                        <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                          {translation.translation}
                          {translation.transliteration && (
                            <span style={{ fontSize: '1rem', color: '#94a3b8', marginLeft: '0.5rem', fontWeight: 'normal' }}>
                              ({translation.transliteration})
                            </span>
                          )}
                        </div>
                      </div>

                      {translation.root && translation.root !== "N/A" && !translation.root.toLowerCase().includes("loanword") && (
                        <div>
                          <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>Root (Shoresh)</h4>
                          <div style={{
                            fontSize: translation.root.length > 5 ? '1rem' : '1.2rem',
                            fontFamily: 'serif',
                            letterSpacing: '0.05em'
                          }}>{translation.root}</div>
                          {translation.root_meaning && (
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                              {translation.root_meaning}
                            </div>
                          )}
                          {/* 
                          // Temporarily hiding root source indicators ("AI estimate" and "Verified")
                          translation.root_source && (
                            <span style={{
                              fontSize: '0.7rem',
                              background: translation.root_source === 'Wiktionary' ? '#f0fdf4' : '#fefce8',
                              color: translation.root_source === 'Wiktionary' ? '#166534' : '#854d0e',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              marginTop: '0.3rem',
                              display: 'inline-block'
                            }}>
                              {translation.root_source === 'Wiktionary' ? '✓ Verified' : 'AI estimate'}
                            </span>
                          )
                          */}
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
                  <h3 style={{ borderBottom: '2px solid #f59e0b', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    Study List
                    <span style={{ fontSize: '0.8rem', background: '#f59e0b', color: 'white', padding: '0.1rem 0.6rem', borderRadius: '12px' }}>
                      {Object.keys(reviewList).length}
                    </span>
                  </h3>
                  {Object.keys(reviewList).length === 0 ? (
                    <p style={{ color: '#64748b', textAlign: 'center', marginTop: '2rem' }}>No words saved for review yet.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', maxHeight: '50vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
                      {Object.entries(reviewList).map(([word, data]) => (
                        <Flashcard
                          key={word}
                          word={word}
                          data={data}
                          onRemove={removeFromReview}
                        />
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

      {/* How to Use Modal */}
      <AnimatePresence>
        {showHowToUse && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowHowToUse(false)}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
            }}
          >
            <motion.div
              className="glass"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto',
                background: 'white', padding: '2.5rem', position: 'relative'
              }}
            >
              <button
                className="close-btn"
                onClick={() => setShowHowToUse(false)}
                style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}
              >
                <X size={24} />
              </button>

              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{ background: 'var(--accent)', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <HelpCircle color="white" size={30} />
                </div>
                <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Welcome to WordAhead</h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Your personal Hebrew reading assistant</p>
              </div>

              <div className="tutorial-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <section>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--accent)', marginBottom: '0.5rem' }}>1. Analysis & Input</h3>
                  <p style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                    Paste text or upload a <strong>.txt</strong> file. Click <strong>Analyze</strong> to highlight difficult words and calculate importance levels tailored to your level.
                  </p>
                </section>

                <section>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--accent)', marginBottom: '0.5rem' }}>2. Understanding Colors</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', fontSize: '0.85rem' }}>
                    <div style={{ border: '1px solid #f1f5f9', padding: '0.5rem', borderRadius: '6px' }}>
                      <strong style={{ color: '#7c3aed' }}>Purple:</strong> Hard words for your level.
                    </div>
                    <div style={{ border: '1px solid #f1f5f9', padding: '0.5rem', borderRadius: '6px' }}>
                      <strong>Bold:</strong> Important for general meaning.
                    </div>
                    <div style={{ border: '1px solid #f1f5f9', padding: '0.5rem', borderRadius: '6px' }}>
                      <span style={{ color: '#94a3b8' }}>Grey:</span> Common/Easy words.
                    </div>
                    <div style={{ border: '1px solid #f1f5f9', padding: '0.5rem', borderRadius: '6px' }}>
                      <strong style={{ color: '#7c3aed' }}>Bold Purple:</strong> Critical words to learn first!
                    </div>
                  </div>
                </section>

                <section>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--accent)', marginBottom: '0.5rem' }}>3. The Skimming Slider</h3>
                  <p style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                    Use the <strong>Condensation</strong> bar to fade out less important words. Moving it to the right helps you focus only on the core meaning of the text.
                  </p>
                </section>

                <section>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--accent)', marginBottom: '0.5rem' }}>4. Interactive Translation</h3>
                  <p style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                    Click any word to see its <strong>Hebrew Root (שורש)</strong>, translation, and example.
                    Mark words as <strong>Learned</strong> to stop them from being highlighted in future texts.
                  </p>
                </section>
              </div>

              <button
                className="btn"
                onClick={() => setShowHowToUse(false)}
                style={{ width: '100%', marginTop: '2rem', padding: '1rem' }}
              >
                Got it, let's go!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
