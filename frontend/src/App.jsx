import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { t, setLocale } from './i18n';
import { BookOpen, Settings, X, Loader2, Play, Activity, Info, Upload, Trash2, StopCircle, HelpCircle, History, Clock, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = ''; // Relative to the domain serving the app
const CONSENT_DIR = 'ltr'; // Configurable layout direction for consent screen ('ltr' or 'rtl')
const CONSENT_LOCALE = 'en'; // Configurable locale for consent screen ('en' or 'he')
const CEFR_LEVELS = ["B1", "B2"];
const ALL_CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const checkIsDifficult = (wordCefr, targetLevel) => {
  if (!wordCefr) return false;
  const wIdx = ALL_CEFR_LEVELS.indexOf(wordCefr);
  const uIdx = ALL_CEFR_LEVELS.indexOf(targetLevel);
  if (wIdx === -1 || uIdx === -1) return false;
  return wIdx > uIdx;
};

const getHistoryEntryStats = (entry, learnedWords) => {
  let tokens = [];
  if (entry.analysis_results) {
    try {
      tokens = typeof entry.analysis_results === 'string'
        ? JSON.parse(entry.analysis_results)
        : entry.analysis_results;
    } catch (e) {
      console.error("Failed to parse analysis_results", e);
    }
  }

  // Fallback if no tokens
  if (!tokens || tokens.length === 0) {
    const rawText = entry.raw_text || '';
    const rawWords = rawText.split(/\s+/).filter(Boolean);
    const rawSentences = rawText.match(/[^.!?]*[.!?]/g) || [rawText];
    const sCount = Math.max(1, rawSentences.filter(s => s.trim().length > 0).length);
    const avgLen = rawWords.length / sCount;

    return {
      detailed: {
        words: entry.total_words || rawWords.length,
        difficult: entry.difficult_words || 0,
        diffPercentage: entry.total_words > 0 ? (entry.difficult_words / entry.total_words) * 100 : 0,
        sentences: sCount,
        avgSentenceLength: avgLen
      },
      skimmed: {
        words: entry.skimmed_words || 0,
        difficult: entry.skimmed_difficult_words || 0,
        diffPercentage: entry.skimmed_words > 0 ? (entry.skimmed_difficult_words / entry.skimmed_words) * 100 : 0,
        sentences: sCount,
        avgSentenceLength: entry.skimmed_words / sCount
      }
    };
  }

  // Helper to check if token is difficult, taking learned words into account
  const isTokenDifficult = (t) => {
    const isDiff = checkIsDifficult(t.cefr, entry.user_level);
    if (!isDiff) return false;
    const cleanWord = t.text.toLowerCase().replace(/[.,:;?!"()]/g, '');
    return !learnedWords[cleanWord];
  };

  // Group tokens into sentences
  const sentencesList = [];
  let currentSentence = [];
  tokens.forEach(t => {
    if (t.text === '\n') return;
    currentSentence.push(t);
    if (/[.!?]/.test(t.text)) {
      sentencesList.push(currentSentence);
      currentSentence = [];
    }
  });
  if (currentSentence.length > 0) {
    sentencesList.push(currentSentence);
  }

  // Calculate detailed
  let detailedWords = 0;
  let detailedDifficult = 0;
  let detailedSentences = 0;

  sentencesList.forEach(s => {
    const sWords = s.length;
    if (sWords > 0) {
      detailedWords += sWords;
      detailedSentences++;
      detailedDifficult += s.filter(t => isTokenDifficult(t)).length;
    }
  });

  // Calculate skimmed (importance >= 3)
  let skimmedWords = 0;
  let skimmedDifficult = 0;
  let skimmedSentences = 0;

  sentencesList.forEach(s => {
    const sSkimmedWords = s.filter(t => t.importance >= 3).length;
    if (sSkimmedWords > 0) {
      skimmedWords += sSkimmedWords;
      skimmedSentences++;
      skimmedDifficult += s.filter(t => t.importance >= 3 && isTokenDifficult(t)).length;
    }
  });

  return {
    detailed: {
      words: detailedWords,
      difficult: detailedDifficult,
      diffPercentage: detailedWords > 0 ? (detailedDifficult / detailedWords) * 100 : 0,
      sentences: detailedSentences,
      avgSentenceLength: detailedSentences > 0 ? (detailedWords / detailedSentences) : 0
    },
    skimmed: {
      words: skimmedWords,
      difficult: skimmedDifficult,
      diffPercentage: skimmedWords > 0 ? (skimmedDifficult / skimmedWords) * 100 : 0,
      sentences: skimmedSentences,
      avgSentenceLength: skimmedSentences > 0 ? (skimmedWords / skimmedSentences) : 0
    }
  };
};

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


const LEXTALE_ITEMS = [
  // 3 warm-up items
  { word: "platery", correct: 0, isPractice: true },
  { word: "denial", correct: 1, isPractice: true },
  { word: "generic", correct: 1, isPractice: true },
  // 60 scored items
  { word: "mensible", correct: 0 },
  { word: "scornful", correct: 1 },
  { word: "stoutly", correct: 1 },
  { word: "ablaze", correct: 1 },
  { word: "kermshaw", correct: 0 },
  { word: "moonlit", correct: 1 },
  { word: "lofty", correct: 1 },
  { word: "hurricane", correct: 1 },
  { word: "flaw", correct: 1 },
  { word: "alberation", correct: 0 },
  { word: "unkempt", correct: 1 },
  { word: "breeding", correct: 1 },
  { word: "festivity", correct: 1 },
  { word: "screech", correct: 1 },
  { word: "savoury", correct: 1 },
  { word: "plaudate", correct: 0 },
  { word: "shin", correct: 1 },
  { word: "fluid", correct: 1 },
  { word: "spaunch", correct: 0 },
  { word: "allied", correct: 1 },
  { word: "slain", correct: 1 },
  { word: "recipient", correct: 1 },
  { word: "exprate", correct: 0 },
  { word: "eloquence", correct: 1 },
  { word: "cleanliness", correct: 1 },
  { word: "dispatch", correct: 1 },
  { word: "rebondicate", correct: 0 },
  { word: "ingenious", correct: 1 },
  { word: "bewitch", correct: 1 },
  { word: "skave", correct: 0 },
  { word: "plaintively", correct: 1 },
  { word: "kilp", correct: 0 },
  { word: "interfate", correct: 0 },
  { word: "hasty", correct: 1 },
  { word: "lengthy", correct: 1 },
  { word: "fray", correct: 1 },
  { word: "crumper", correct: 0 },
  { word: "upkeep", correct: 1 },
  { word: "majestic", correct: 1 },
  { word: "magrity", correct: 0 },
  { word: "nourishment", correct: 1 },
  { word: "abergy", correct: 0 },
  { word: "proom", correct: 0 },
  { word: "turmoil", correct: 1 },
  { word: "carbohydrate", correct: 1 },
  { word: "scholar", correct: 1 },
  { word: "turtle", correct: 1 },
  { word: "fellick", correct: 0 },
  { word: "destription", correct: 0 },
  { word: "cylinder", correct: 1 },
  { word: "censorship", correct: 1 },
  { word: "celestial", correct: 1 },
  { word: "rascal", correct: 1 },
  { word: "purrage", correct: 0 },
  { word: "pulsh", correct: 0 },
  { word: "muddy", correct: 1 },
  { word: "quirty", correct: 0 },
  { word: "pudour", correct: 0 },
  { word: "listless", correct: 1 },
  { word: "wrought", correct: 1 }
];

const PER_TASK_QUESTIONS = {
  blockA: [
    { id: "pt_a1", label: t('survey.blocks.a1', "How would you rate your overall experience reading this text?"), leftAnchor: t('survey.anchors.very_poor'), rightAnchor: t('survey.anchors.very_good') },
    { id: "pt_a2", label: t('survey.blocks.a2', "How mentally demanding was the task?"), leftAnchor: t('survey.anchors.very_low'), rightAnchor: t('survey.anchors.very_high'), lowerIsBetter: true },
    { id: "pt_a3", label: t('survey.blocks.a3', "How physically demanding was the task?"), leftAnchor: t('survey.anchors.very_low'), rightAnchor: t('survey.anchors.very_high'), lowerIsBetter: true },
    { id: "pt_a4", label: t('survey.blocks.a4', "How hurried or rushed was the pace of the task?"), leftAnchor: t('survey.anchors.very_low'), rightAnchor: t('survey.anchors.very_high'), lowerIsBetter: true },
    { id: "pt_a5", label: t('survey.blocks.a5', "How successful do you think you were in accomplishing the task?"), leftAnchor: t('survey.anchors.not_successful'), rightAnchor: t('survey.anchors.very_successful') },
    { id: "pt_a6", label: t('survey.blocks.a6', "How hard did you have to work to accomplish your performance?"), leftAnchor: t('survey.anchors.very_low'), rightAnchor: t('survey.anchors.very_high'), lowerIsBetter: true },
    { id: "pt_a7", label: t('survey.blocks.a7', "How insecure, discouraged, irritated, stressed, or annoyed were you during the task?"), leftAnchor: t('survey.anchors.very_low'), rightAnchor: t('survey.anchors.very_high'), lowerIsBetter: true },
    { id: "pt_a8", label: t('survey.blocks.a8', "I could recognize the key points in the passage."), leftAnchor: t('survey.anchors.strongly_disagree'), rightAnchor: t('survey.anchors.strongly_agree') },
    { id: "pt_a9", label: t('survey.blocks.a9', "I could recognize how the key points are supported by additional detail in the passage."), leftAnchor: t('survey.anchors.strongly_disagree'), rightAnchor: t('survey.anchors.strongly_agree') }
  ],
  blockB: [
    { id: "pt_b10", label: t('survey.blocks.b10', "The system's choice of what to gray out and what to keep at full weight made sense to me."), leftAnchor: t('survey.anchors.strongly_disagree'), rightAnchor: t('survey.anchors.strongly_agree') },
    { id: "pt_b11", label: t('survey.blocks.b11', "I think I know why certain words were lighter than others."), leftAnchor: t('survey.anchors.strongly_disagree'), rightAnchor: t('survey.anchors.strongly_agree') },
    { id: "pt_b12", label: t('survey.blocks.b12', "I found it helpful that certain words were lighter than others."), leftAnchor: t('survey.anchors.strongly_disagree'), rightAnchor: t('survey.anchors.strongly_agree') },
    { id: "pt_b13", label: t('survey.blocks.b13', "The different levels of gray helped me see the relationships between parts of sentences."), leftAnchor: t('survey.anchors.strongly_disagree'), rightAnchor: t('survey.anchors.strongly_agree') },
    { id: "pt_b14", label: t('survey.blocks.b14', "I understood why some words were highlighted."), leftAnchor: t('survey.anchors.strongly_disagree'), rightAnchor: t('survey.anchors.strongly_agree') },
    { id: "pt_b15", label: t('survey.blocks.b15', "The translations helped without interrupting my reading."), leftAnchor: t('survey.anchors.strongly_disagree'), rightAnchor: t('survey.anchors.strongly_agree') },
    { id: "pt_b16", label: t('survey.blocks.b16', "The highlighted words matched the words I found difficult."), leftAnchor: t('survey.anchors.strongly_disagree'), rightAnchor: t('survey.anchors.strongly_agree') },
    { id: "pt_b17", label: t('survey.blocks.b17', "I would use this system when reading academic English."), leftAnchor: t('survey.anchors.strongly_disagree'), rightAnchor: t('survey.anchors.strongly_agree') },
    { id: "pt_b18", label: t('survey.blocks.b18', "The system made me too dependent on translation."), leftAnchor: t('survey.anchors.strongly_disagree'), rightAnchor: t('survey.anchors.strongly_agree'), lowerIsBetter: true }
  ],
  blockC: [
    { id: "pt_c19", label: t('survey.blocks.c19', "The shortened (skimmed) version preserved enough of the meaning."), leftAnchor: t('survey.anchors.strongly_disagree'), rightAnchor: t('survey.anchors.strongly_agree') }
  ]
};

const LikertScale = ({ id, label, value, onChange, leftAnchor, rightAnchor }) => {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', lineHeight: '1.5' }}>{label}</h4>
      <div className="likert-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="likert-anchor likert-left" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', width: '80px', textAlign: 'right' }}>{leftAnchor}</span>
        <div className="likert-options" style={{ display: 'flex', gap: '1rem' }}>
          {[1, 2, 3, 4, 5, 6, 7].map((val) => (
            <label key={val} className="likert-option-label" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name={id}
                checked={value === val}
                onChange={() => onChange(val)}
                style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
              />
              <span style={{ fontSize: '0.85rem' }}>{val}</span>
            </label>
          ))}
        </div>
        <span className="likert-anchor likert-right" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', width: '80px', textAlign: 'left' }}>{rightAnchor}</span>
      </div>
    </div>
  );
};

const PerTaskSurvey = ({ condition, textFormat, onSubmit }) => {
  const [responses, setResponses] = useState({});

  const showBlockB = condition === 'wordahead';
  const showBlockC = textFormat === 'TS';

  const questions = [
    ...PER_TASK_QUESTIONS.blockA,
    ...(showBlockB ? PER_TASK_QUESTIONS.blockB : []),
    ...(showBlockC ? PER_TASK_QUESTIONS.blockC : [])
  ];

  const allQuestions = questions;

  const allAnswered = allQuestions.every(q => responses[q.id] !== undefined);

  return (
    <div className="glass" style={{ maxWidth: '800px', margin: '2rem auto', padding: '2.5rem', textAlign: 'left' }}>
      <h2 style={{ color: 'var(--accent)', marginTop: 0 }}>{t('survey.per_task_title')}</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{t('survey.per_task_desc')}</p>
      
      {questions.map(q => (
        <LikertScale
          key={q.id}
          id={q.id}
          label={q.label}
          value={responses[q.id]}
          onChange={(val) => setResponses(prev => ({ ...prev, [q.id]: val }))}
          leftAnchor={q.leftAnchor}
          rightAnchor={q.rightAnchor}
        />
      ))}
      
      <button
        className="btn"
        disabled={!allAnswered}
        onClick={() => onSubmit(responses)}
        style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', marginTop: '1rem' }}
      >
        {t('survey.submit')}
      </button>
    </div>
  );
};

const PostStudySurvey = ({ conditionsSeen, onSubmit }) => {
  const [responses, setResponses] = useState({});
  const [ranking, setRanking] = useState('');
  const [openText1, setOpenText1] = useState('');
  const [openText2, setOpenText2] = useState('');

  const likertQuestions = [];
  conditionsSeen.forEach((cond) => {
    likertQuestions.push({
      id: `ps_use_${cond.condition}`,
      label: t('survey.post.use_system').replace('[XXX]', cond.label),
      leftAnchor: t('survey.anchors.strongly_disagree'),
      rightAnchor: t('survey.anchors.strongly_agree')
    });
  });

  const allLikertAnswered = likertQuestions.every(q => responses[q.id] !== undefined);
  const isValid = allLikertAnswered && ranking !== '';

  const handleSubmit = () => {
    onSubmit({
      responses,
      open_text_responses: {
        "ps_open1": openText1,
        "ps_open2": openText2
      },
      ranking: {
        "most_helpful": ranking
      }
    });
  };

  return (
    <div className="glass" style={{ maxWidth: '800px', margin: '2rem auto', padding: '2.5rem', textAlign: 'left' }}>
      <h2 style={{ color: 'var(--accent)', marginTop: 0 }}>{t('survey.post_study_title')}</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{t('survey.post_study_desc')}</p>
      
      <div style={{ marginBottom: '2.5rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', lineHeight: '1.5' }}>{t('survey.post.ranking')}</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
            <input type="radio" name="ranking" checked={ranking === 'first'} onChange={() => setRanking('first')} style={{ accentColor: 'var(--accent)' }} />
            <span>{t('survey.options.first_passage')}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
            <input type="radio" name="ranking" checked={ranking === 'second'} onChange={() => setRanking('second')} style={{ accentColor: 'var(--accent)' }} />
            <span>{t('survey.options.second_passage')}</span>
          </label>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', lineHeight: '1.5' }}>{t('survey.post.like_most', 'What did you like most about the version you found most helpful?')}</h4>
        <textarea
          className="input"
          value={openText1}
          onChange={(e) => setOpenText1(e.target.value)}
          rows="3"
          style={{ width: '100%', resize: 'vertical' }}
        />
      </div>

      <div style={{ marginBottom: '2.5rem' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', lineHeight: '1.5' }}>{t('survey.post.missing_features', 'Were there any features missing that you\'d like to see?')}</h4>
        <textarea
          className="input"
          value={openText2}
          onChange={(e) => setOpenText2(e.target.value)}
          rows="3"
          style={{ width: '100%', resize: 'vertical' }}
        />
      </div>

      {likertQuestions.map(q => (
        <LikertScale
          key={q.id}
          id={q.id}
          label={q.label}
          value={responses[q.id]}
          onChange={(val) => setResponses(prev => ({ ...prev, [q.id]: val }))}
          leftAnchor={q.leftAnchor}
          rightAnchor={q.rightAnchor}
        />
      ))}
      
      <button
        className="btn"
        disabled={!isValid}
        onClick={handleSubmit}
        style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', marginTop: '1rem' }}
      >
        Submit Feedback & Continue
      </button>
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
  const [fontSize, setFontSize] = useState(1.1);
  const [experimentMode, setExperimentMode] = useState(true);
  const [activeTab, setActiveTab] = useState('words'); // 'words' or 'history'
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [cardViewModes, setCardViewModes] = useState({});

  // --- Experiment Flow States ---
  const [inExperiment, setInExperiment] = useState(true);
  const [prolificId, setProlificId] = useState('');
  const [expStep, setExpStep] = useState('consent'); // 'consent', 'lextale', 'assigned', 'reading_1', 'quiz_1', 'reading_2', 'quiz_2', 'survey_sus', 'survey_nasa', 'survey_wa', 'survey_demographics', 'completed'
  const [lextaleAnswers, setLextaleAnswers] = useState({});
  const [lextaleCurrentIdx, setLextaleCurrentIdx] = useState(0);
  const [lextaleScore, setLextaleScore] = useState(0);
  const [expCondition, setExpCondition] = useState(null);
  const [expTexts, setExpTexts] = useState(null);
  const [readingStartTime, setReadingStartTime] = useState(0);
  const [hoverEvents, setHoverEvents] = useState([]);
  const [hoverEvents1, setHoverEvents1] = useState([]);
  const [hoverEvents2, setHoverEvents2] = useState([]);
  const [clickEvents1, setClickEvents1] = useState([]);
  const [clickEvents2, setClickEvents2] = useState([]);
  const [clickEvents, setClickEvents] = useState([]);
  const [priorExposure1, setPriorExposure1] = useState('4');
  const [priorExposure2, setPriorExposure2] = useState('4');
  const [readingTime1, setReadingTime1] = useState(0);
  const [readingTime2, setReadingTime2] = useState(0);
  const [quizAnswers1, setQuizAnswers1] = useState(new Array(6).fill(undefined));
  const [quizAnswers2, setQuizAnswers2] = useState(new Array(6).fill(undefined));
  const [quiz1Results, setQuiz1Results] = useState([]);
  const [quiz2Results, setQuiz2Results] = useState([]);
  const [perTaskSurvey1, setPerTaskSurvey1] = useState({});
  const [perTaskSurvey2, setPerTaskSurvey2] = useState({});
  const [postStudySurvey, setPostStudySurvey] = useState({ responses: {}, open_text_responses: {}, ranking: {} });
  const [surveyDemographics, setSurveyDemographics] = useState({
    age: '',
    gender: '',
    native_language: '',
    other_languages: '',
    years_studying_english: '',
    course_level: '',
    self_rated_english: '',
    academic_year: '',
    field_of_study: '',
    frequency_academic_english: '3',
    use_translation_tools: '3',
    ac_early: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [hoverTooltip, setHoverTooltip] = useState(null);
  const hoverTimers = React.useRef({});

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  // Persistence State for Standalone mode
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

  useEffect(() => {
    if (showDashboard) {
      fetchHistory();
    }
  }, [showDashboard]);

  // Check URL parameters for Prolific entry on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('PROLIFIC_PID');
    if (pid) {
      setProlificId(pid);
      setInExperiment(true);
      setExperimentMode(true);
      setExpStep('consent');
    }
  }, []);

  useEffect(() => {
    if (expStep === 'consent') {
      setLocale(CONSENT_LOCALE);
    } else {
      setLocale('en');
    }
  }, [expStep]);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/history`);
      setHistory(res.data);
    } catch (err) {
      console.error(err);
      showNotification("Failed to fetch reading history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDeleteHistory = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/history/${id}`);
      showNotification("Reading history entry deleted.");
      fetchHistory();
    } catch (err) {
      console.error(err);
      showNotification("Failed to delete history entry.");
    }
  };

  const handleLoadHistory = (entry) => {
    setText(entry.raw_text);
    let normalizedLevel = 'B2';
    if (entry.user_level === 'B1' || entry.user_level === 'A1' || entry.user_level === 'A2') {
      normalizedLevel = 'B1';
    }
    setUserLevel(normalizedLevel);
    setShowDashboard(false);

    if (entry.analysis_results) {
      try {
        const parsedTokens = typeof entry.analysis_results === 'string'
          ? JSON.parse(entry.analysis_results)
          : entry.analysis_results;
        
        const processed = parsedTokens.map(token => {
          const isDifficult = checkIsDifficult(token.cefr, normalizedLevel);
          const cleanWord = token.text.toLowerCase().replace(/[.,:;?!"()]/g, '');
          const isLearned = learnedWords[cleanWord];
          return {
            ...token,
            isDifficult: isDifficult && !isLearned,
            isLearned: isLearned
          };
        });
        setTokens(processed);
      } catch (e) {
        console.error("Failed to parse cached analysis results:", e);
        handleAnalyze(entry.raw_text, normalizedLevel);
      }
    } else {
      handleAnalyze(entry.raw_text, normalizedLevel);
    }
  };

  const handleLevelChange = (newLevel) => {
    setUserLevel(newLevel);
    if (tokens.length > 0) {
      setTokens(prev => prev.map(token => {
        const isDifficult = checkIsDifficult(token.cefr, newLevel);
        const cleanWord = token.text.toLowerCase().replace(/[.,:;?!"()]/g, '');
        const isLearned = learnedWords[cleanWord];
        return {
          ...token,
          isDifficult: isDifficult && !isLearned,
          isLearned: isLearned
        };
      }));
    }
  };

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
    if (experimentMode && currentReadingCondition === 'plain') return; // Disable hover translations in plain mode

    const uIdx = CEFR_LEVELS.indexOf(userLevel);
    const cleanWord = token.text.toLowerCase().replace(/[.,:;?!"()]/g, '');
    const isLearned = learnedWords[cleanWord];

    // Trigger level down ONLY on GREY words (importance < 3 and not difficult)
    if (!experimentMode && !token.isDifficult && !isLearned && uIdx > 0) {
      const newCount = struggleCount + 1;
      setStruggleCount(newCount);
      if (newCount >= 3) {
        const newLevel = CEFR_LEVELS[uIdx - 1];
        setUserLevel(newLevel);
        setStruggleCount(0);
        showNotification(`We noticed you're looking up words that should be familiar. Adjusting level to ${newLevel} for better support.`);
        setTokens(prev => prev.map(t => {
          const isDifficult = checkIsDifficult(t.cefr, newLevel);
          const clean = t.text.toLowerCase().replace(/[.,:;?!"()]/g, '');
          const learned = learnedWords[clean];
          return {
            ...t,
            isDifficult: isDifficult && !learned,
            isLearned: learned
          };
        }));
      }
    }


    const eventData = {
      word: token.text,
      timestamp: Date.now()
    };
    setClickEvents(prev => [...prev, eventData]);

    setSelectedWord(token);
    setTransLoading(true);
    setTranslation(null);

    try {
      const textToUse = experimentMode ? currentTextData.text : text;
      const sentences = textToUse.match(/[^.!?]*[.!?]/g) || [textToUse];
      const relevantSentence = sentences.find(s =>
        s.toLowerCase().includes(token.text.toLowerCase())
      ) || textToUse.substring(0, 300);

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

  const handleAnalyze = async (textToAnalyze, overrideLevel) => {
    const targetText = typeof textToAnalyze === 'string' ? textToAnalyze : text;
    const targetLevel = typeof overrideLevel === 'string' ? overrideLevel : userLevel;
    if (!targetText.trim()) {
      showNotification("Please enter some text to analyze.");
      return;
    }

    const controller = new AbortController();
    setAbortController(controller);
    setLoading(true);
    setTokens([]); // Clear previous tokens from sight immediately

    try {
      const res = await axios.post(`${API_URL}/api/analyze`, {
        text: targetText,
        user_level: targetLevel
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

  // --- Experiment Event Logging Helpers ---
  const logExperimentEvent = async (eventType, payload) => {
    try {
      await axios.post(`${API_URL}/api/experiment/log_event`, {
        session_id: prolificId,
        event_type: eventType,
        payload
      });
    } catch (err) {
      console.error(`Failed to log experiment event ${eventType}:`, err);
    }
  };

  const handleLexTaleAnswer = async (answer) => {
    const updatedAnswers = { ...lextaleAnswers, [lextaleCurrentIdx]: answer };
    setLextaleAnswers(updatedAnswers);

    if (lextaleCurrentIdx + 1 < LEXTALE_ITEMS.length) {
      setLextaleCurrentIdx(lextaleCurrentIdx + 1);
    } else {
      // LexTALE completed. Calculate score
      let correctReal = 0;
      let correctNon = 0;
      
      for (let i = 3; i < LEXTALE_ITEMS.length; i++) {
        const item = LEXTALE_ITEMS[i];
        const isCorrect = (updatedAnswers[i] === item.correct);
        if (item.correct === 1) {
          if (isCorrect) correctReal++;
        } else {
          if (isCorrect) correctNon++;
        }
      }
      
      const computedScore = (correctReal / 40 * 100 + correctNon / 20 * 100) / 2;
      setLextaleScore(computedScore);

      setLoading(true);
      try {
        // Send to backend condition assignment
        const assignRes = await axios.post(`${API_URL}/api/experiment/assign`, {
          prolific_pid: prolificId,
          lextale_score: computedScore
        });
        setExpCondition(assignRes.data);
        
        await logExperimentEvent("lextale_completed", { score: computedScore, cefr_level: assignRes.data.cefr_level });
        setExpStep('early_attention_check');
      } catch (err) {
        console.error(err);
        showNotification("Failed to submit vocabulary test screening.");
      } finally {
        setLoading(false);
      }
    }
  };

  const startReadingSessions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/experiment/session/${prolificId}`);
      setExpTexts(res.data.texts);
      
      const firstTextId = res.data.assignment.text_order[0];
      const textData = res.data.texts[firstTextId];
      
      setExpStep('pre_reading_1');
      await loadExperimentText(firstTextId, textData.text, res.data.assignment.cefr_level);
    } catch (err) {
      console.error(err);
      showNotification("Failed to fetch reading session configuration.");
    } finally {
      setLoading(false);
    }
  };

  const loadExperimentText = async (textId, textContent, userLevel) => {
    setLoading(true);
    setTokens([]);
    setSelectedWord(null);
    setTranslation(null);
    try {
      const res = await axios.post(`${API_URL}/api/analyze`, {
        text: textContent,
        user_level: userLevel
      });
      setTokens(res.data.tokens);
      setReadingStartTime(Date.now());
      
      await axios.post(`${API_URL}/api/experiment/log_event`, {
        session_id: prolificId,
        event_type: "reading_start",
        payload: { text_id: textId, timestamp: Date.now() }
      });
    } catch (err) {
      console.error(err);
      showNotification("Failed to load text analysis.");
    } finally {
      setLoading(false);
    }
  };

  const finishReadingSession = async () => {
    const duration = Date.now() - readingStartTime;
    const textId = expCondition.text_order[expStep === 'reading_1' ? 0 : 1];

    await axios.post(`${API_URL}/api/experiment/log_event`, {
      session_id: prolificId,
      event_type: "reading_end",
      payload: { text_id: textId, duration_ms: duration, timestamp: Date.now() }
    });

    if (expStep === 'reading_1') {
      setReadingTime1(duration);
      setHoverEvents1(hoverEvents);
      setClickEvents1(clickEvents);
      setHoverEvents([]);
      setClickEvents([]);
      setExpStep('quiz_1');
    } else {
      setReadingTime2(duration);
      setHoverEvents2(hoverEvents);
      setClickEvents2(clickEvents);
      setHoverEvents([]);
      setClickEvents([]);
      setExpStep('quiz_2');
    }
  };

  const handleWordMouseEnter = (e, token) => {
    if (!experimentMode || currentReadingCondition !== 'wordahead') return;
    if (!token.cefr) return;
    
    const wordText = token.text.toLowerCase().replace(/[.,:;?!"()]/g, '');
    hoverTimers.current[wordText] = {
      start: Date.now(),
      target: e.currentTarget
    };
    
    const timerId = setTimeout(async () => {
      if (hoverTimers.current[wordText]) {
        try {
          const textToUse = currentTextData.text;
          const sentences = textToUse.match(/[^.!?]*[.!?]/g) || [textToUse];
          const relevantSentence = sentences.find(s =>
            s.toLowerCase().includes(token.text.toLowerCase())
          ) || textToUse.substring(0, 300);

          const res = await axios.post(`${API_URL}/api/translate`, {
            word: token.text,
            context: relevantSentence
          });
          
          if (hoverTimers.current[wordText]) {
            const rect = hoverTimers.current[wordText].target.getBoundingClientRect();
            setHoverTooltip({
              word: token.text,
              translation: res.data.translation,
              transliteration: res.data.transliteration,
              x: rect.left + window.scrollX,
              y: rect.top + window.scrollY - 10
            });
            hoverTimers.current[wordText].translation_shown = true;
          }
        } catch (err) {
          console.error(err);
        }
      }
    }, 150);
    
    hoverTimers.current[wordText].timerId = timerId;
  };

  const handleWordMouseLeave = async (token) => {
    if (!experimentMode || currentReadingCondition !== 'wordahead') return;
    if (!token.cefr) return;
    
    const wordText = token.text.toLowerCase().replace(/[.,:;?!"()]/g, '');
    const hoverInfo = hoverTimers.current[wordText];
    if (hoverInfo) {
      clearTimeout(hoverInfo.timerId);
      const dwellMs = Date.now() - hoverInfo.start;
      
      if (dwellMs >= 150) {
        const eventData = {
          word: token.text,
          timestamp: Date.now(),
          dwell_ms: dwellMs,
          translation_shown: !!hoverInfo.translation_shown
        };
        
        setHoverEvents(prev => [...prev, eventData]);
        
        try {
          await axios.post(`${API_URL}/api/experiment/log_event`, {
            session_id: prolificId,
            event_type: "hover",
            payload: eventData
          });
        } catch (err) {
          console.error("Failed to log hover event:", err);
        }
      }
      
      delete hoverTimers.current[wordText];
    }
    setHoverTooltip(null);
  };

  const handleQuizSelect = (idx, oIdx) => {
    if (expStep === 'quiz_1') {
      setQuizAnswers1(prev => {
        const next = [...prev];
        next[idx] = oIdx;
        return next;
      });
    } else {
      setQuizAnswers2(prev => {
        const next = [...prev];
        next[idx] = oIdx;
        return next;
      });
    }
  };

  const getQuizQuestions = (textId, isFirstQuiz) => {
    if (!expTexts || !expTexts[textId]) return [];
    const realMcqs = expTexts[textId].mcqs || [];
    
    const alertnessQuestion = isFirstQuiz ? {
      id: "alertness_1",
      question: t('quiz.alertness1.question', "This is an alertness check. To show you are reading carefully, please choose the second option (Option B) below."),
      options: [
        t('quiz.alertness1.opt0', "Option A"),
        t('quiz.alertness1.opt1', "Option B"),
        t('quiz.alertness1.opt2', "Option C"),
        t('quiz.alertness1.opt3', "Option D")
      ],
      correct: 1, // Option B
      isAlertness: true
    } : {
      id: "alertness_2",
      question: t('quiz.alertness2.question', "Attention check: please select the fourth option (Option D) from the choices below to confirm you are paying attention."),
      options: [
        t('quiz.alertness2.opt0', "Option A"),
        t('quiz.alertness2.opt1', "Option B"),
        t('quiz.alertness2.opt2', "Option C"),
        t('quiz.alertness2.opt3', "Option D")
      ],
      correct: 3, // Option D
      isAlertness: true
    };
    
    const combined = [...realMcqs];
    combined.splice(2, 0, alertnessQuestion);
    return combined;
  };

  const submitQuiz = async () => {
    const isFirst = expStep === 'quiz_1';
    const textId = expCondition.text_order[isFirst ? 0 : 1];
    const combinedQuestions = getQuizQuestions(textId, isFirst);
    const answers = isFirst ? quizAnswers1 : quizAnswers2;
    
    const results = combinedQuestions.map((q, idx) => ({
      question_id: q.id,
      selected: answers[idx] !== undefined ? q.options[answers[idx]] : "",
      correct: answers[idx] === q.correct,
      is_alertness: !!q.isAlertness
    }));

    if (isFirst) {
      setQuiz1Results(results);
      await logExperimentEvent("quiz_completed", { text_id: textId, results });
      setExpStep('per_task_survey_1');
    } else {
      setQuiz2Results(results);
      await logExperimentEvent("quiz_completed", { text_id: textId, results });
      setExpStep('per_task_survey_2');
    }
  };

  const submitPerTaskSurvey = async (surveyData) => {
    const isFirst = expStep === 'per_task_survey_1';
    const textId = expCondition.text_order[isFirst ? 0 : 1];
    const condition = isFirst
      ? (expCondition.sequence === 'A' ? 'plain' : 'wordahead')
      : (expCondition.sequence === 'A' ? 'wordahead' : 'plain');
      
    let conditionStr = condition;
    if (expCondition.text_format === 'TF' && condition === 'plain') conditionStr = 'TF';
    if (expCondition.text_format === 'TF' && condition === 'wordahead') conditionStr = 'TF_WA';
    if (expCondition.text_format === 'TS' && condition === 'plain') conditionStr = 'TS';
    if (expCondition.text_format === 'TS' && condition === 'wordahead') conditionStr = 'TS_WA';

    const payload = {
      prolific_pid: prolificId,
      survey_type: "per_task",
      condition: conditionStr,
      text_id: textId,
      sequence_position: isFirst ? 1 : 2,
      responses: surveyData,
      open_text_responses: {},
      ranking: {}
    };

    try {
      await axios.post(`${API_URL}/api/survey`, payload);
      await logExperimentEvent(`per_task_survey_${isFirst ? 1 : 2}_completed`, payload);
      
      if (isFirst) {
        setPerTaskSurvey1(surveyData);
        const textId2 = expCondition.text_order[1];
        const textData2 = expTexts[textId2];
        setExpStep('pre_reading_2');
        await loadExperimentText(textId2, textData2.text, expCondition.cefr_level);
      } else {
        setPerTaskSurvey2(surveyData);
        setExpStep('post_study_survey');
      }
    } catch (err) {
      console.error(err);
      showNotification("Failed to save survey. Please try again.");
    }
  };

  const submitPostStudySurvey = async (surveyData) => {
    const payload = {
      prolific_pid: prolificId,
      survey_type: "post_study",
      condition: null,
      text_id: null,
      sequence_position: null,
      responses: surveyData.responses,
      open_text_responses: surveyData.open_text_responses,
      ranking: surveyData.ranking
    };

    try {
      await axios.post(`${API_URL}/api/survey`, payload);
      await logExperimentEvent("post_study_survey_completed", payload);
      setPostStudySurvey(surveyData);
      setExpStep('survey_demographics');
    } catch (err) {
      console.error(err);
      showNotification("Failed to save survey. Please try again.");
    }
  };

  const submitExperiment = async (postStudyData = postStudySurvey) => {
    setIsSubmitting(true);
    const payload = {
      prolific_pid: prolificId,
      lextale_score: lextaleScore,
      cefr_level: expCondition.cefr_level,
      text_format: expCondition.text_format,
      sequence: expCondition.sequence,
      text_pair: expCondition.text_pair,
      readings: [
        {
          text_id: expCondition.text_order[0],
          condition: expCondition.sequence === 'A' ? 'plain' : 'wordahead',
          reading_time_ms: readingTime1,
          hover_events: hoverEvents1,
          click_events: clickEvents1,
          click_count: clickEvents1.length,
          unique_words_translated: Array.from(new Set([
            ...hoverEvents1.filter(e => e.translation_shown).map(e => e.word.toLowerCase()),
            ...clickEvents1.map(e => e.word.toLowerCase())
          ])).length,
          comprehension: quiz1Results
        },
        {
          text_id: expCondition.text_order[1],
          condition: expCondition.sequence === 'A' ? 'wordahead' : 'plain',
          reading_time_ms: readingTime2,
          hover_events: hoverEvents2,
          click_events: clickEvents2,
          click_count: clickEvents2.length,
          unique_words_translated: Array.from(new Set([
            ...hoverEvents2.filter(e => e.translation_shown).map(e => e.word.toLowerCase()),
            ...clickEvents2.map(e => e.word.toLowerCase())
          ])).length,
          comprehension: quiz2Results
        }
      ],
      surveys: {
        per_task_1: perTaskSurvey1,
        per_task_2: perTaskSurvey2,
        post_study: postStudyData,
        demographics: surveyDemographics
      }
    };

    try {
      const res = await axios.post(`${API_URL}/api/experiment/submit`, payload);
      setSubmitResult(res.data);
      setExpStep('completed');
    } catch (err) {
      console.error(err);
      showNotification("Failed to submit experiment data to server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentReadingCondition = expCondition
    ? (expStep === 'reading_1'
        ? (expCondition.sequence === 'A' ? 'plain' : 'wordahead')
        : (expCondition.sequence === 'A' ? 'wordahead' : 'plain'))
    : '';

  const currentTextId = expCondition
    ? (expStep === 'reading_1' || expStep === 'quiz_1'
        ? expCondition.text_order[0]
        : expCondition.text_order[1])
    : '';

  const currentTextData = expTexts && currentTextId ? expTexts[currentTextId] : null;
  const currentQuizAnswers = expStep === 'quiz_1' ? quizAnswers1 : quizAnswers2;

  // --- Render Experiment Steps ---
  const renderExperimentFlow = () => {
    switch (expStep) {
      case 'consent':
        return (
          <div className="glass" style={{ maxWidth: '600px', margin: '2rem auto', padding: '2.5rem', textAlign: 'left' }}>
            <h2 style={{ color: 'var(--accent)', marginTop: 0 }}>Research Consent Form</h2>
            <p>Welcome to the WordAhead Academic Reading Experiment!</p>
            <p>This study evaluates the effectiveness of an adaptive, structure-aware reading assistant designed to help English language learners read authentic academic texts. By participating, you will complete a short English vocabulary test, read two academic texts, and answer a few questions about your reading experience.</p>
            <p>All data collected will be completely anonymous and used solely for academic research. You may withdraw at any time.</p>
            <div style={{ margin: '2rem 0' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Prolific Participant ID</label>
              <input
                type="text"
                className="input"
                value={prolificId}
                onChange={(e) => setProlificId(e.target.value)}
                placeholder="Enter your Prolific ID"
                disabled={!!new URLSearchParams(window.location.search).get('PROLIFIC_PID')}
                style={{ fontSize: '1.1rem' }}
              />
            </div>
            <button
              className="btn"
              disabled={!prolificId.trim()}
              onClick={() => {
                logExperimentEvent("consent_agreed", {});
                setExpStep('lextale');
              }}
              style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
            >
              I Consent & Agree to Participate
            </button>
          </div>
        );

      case 'lextale':
        return (
          <div className="glass" style={{ maxWidth: '600px', margin: '2rem auto', padding: '2.5rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              <span style={{ fontWeight: 'bold' }}>English Vocabulary Test (LexTALE)</span>
              <span>{lextaleCurrentIdx + 1} of {LEXTALE_ITEMS.length}</span>
            </div>
            
            {lextaleCurrentIdx === 0 && (
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'left', fontSize: '0.9rem', lineHeight: '1.5', borderLeft: '3px solid var(--accent)' }}>
                <strong>Instructions:</strong> This test consists of 63 items. The first 3 items are practice. For each item, decide if it is a real English word. If it is a real English word (even if you are not 100% sure of its meaning), click <strong>YES</strong>. If it is not a real English word, click <strong>NO</strong>. Please respond as accurately as possible.
              </div>
            )}
            
            <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '2rem 0' }}>
              <span style={{ fontSize: '3rem', fontWeight: 'bold', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
                {LEXTALE_ITEMS[lextaleCurrentIdx].word}
              </span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', margin: '2rem 0' }}>
              <button
                className="btn"
                style={{ background: '#22c55e', padding: '1.25rem', fontSize: '1.2rem' }}
                onClick={() => handleLexTaleAnswer(1)}
              >
                YES (Real Word)
              </button>
              <button
                className="btn"
                style={{ background: '#ef4444', padding: '1.25rem', fontSize: '1.2rem' }}
                onClick={() => handleLexTaleAnswer(0)}
              >
                NO (Not a Word)
              </button>
            </div>
          </div>
        );

      case 'early_attention_check':
        return (
          <div className="glass" style={{ maxWidth: '600px', margin: '2rem auto', padding: '2.5rem', textAlign: 'left' }}>
            <h2 style={{ color: 'var(--accent)', marginTop: 0 }}>System Check</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              Before proceeding to the reading phase, please complete this quick system validation.
            </p>
            <div style={{ margin: '2rem 0' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '1rem' }}>
                {t('survey.attention.check2')}
              </label>
              <div className="likert-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="likert-anchor likert-left" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>1</span>
                <div className="likert-options" style={{ display: 'flex', gap: '1rem' }}>
                  {[1, 2, 3, 4, 5].map((val) => (
                    <label key={`ac_${val}`} className="likert-option-label" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="early_ac"
                        checked={surveyDemographics.ac_early === String(val)}
                        onChange={() => setSurveyDemographics(prev => ({ ...prev, ac_early: String(val) }))}
                        style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                      />
                      <span style={{ fontSize: '0.85rem' }}>{val}</span>
                    </label>
                  ))}
                </div>
                <span className="likert-anchor likert-right" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>5</span>
              </div>
            </div>
            <button
              className="btn"
              disabled={!surveyDemographics.ac_early}
              onClick={() => setExpStep('assigned')}
              style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', marginTop: '2rem' }}
            >
              Continue
            </button>
          </div>
        );

      case 'assigned':
        if (expCondition?.cefr_level === 'exclude' && !expCondition?.is_pilot) {
          return (
            <div className="glass" style={{ maxWidth: '600px', margin: '4rem auto', padding: '3rem', textAlign: 'center' }}>
              <h2 style={{ color: '#ef4444', marginTop: 0 }}>Exclusion Notice</h2>
              <p style={{ fontSize: '1.1rem', lineHeight: '1.6', margin: '2rem 0' }}>
                Thank you for your interest. Based on your vocabulary screening test score of <strong>{lextaleScore.toFixed(1)}%</strong>, you do not meet the eligibility criteria for this study.
              </p>
              <button
                className="btn"
                onClick={() => window.location.href = `https://app.prolific.co/submissions/complete?cc=not_eligible`}
                style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}
              >
                Return to Prolific
              </button>
            </div>
          );
        }
        return (
          <div className="glass" style={{ maxWidth: '600px', margin: '2rem auto', padding: '2.5rem', textAlign: 'left' }}>
            <h2 style={{ color: 'var(--accent)', marginTop: 0 }}>Screening Complete!</h2>
            <p>Your screening score is <strong>{lextaleScore.toFixed(1)}%</strong>, which assigns you to <strong>Pool: {expCondition?.cefr_level}</strong>.</p>
            <p>In the next phase, you will read two English academic texts. Depending on the counterbalancing sequence, one text will be read in plain format, and the other will include WordAhead highlights and hover translations.</p>
            <p>After each text, you will answer 5 multiple-choice questions about the content. Please read at your normal pace.</p>
            <button
              className="btn"
              onClick={startReadingSessions}
              style={{ width: '100%', marginTop: '2rem', padding: '1rem', fontSize: '1.1rem' }}
            >
              Start Reading Phase
            </button>
          </div>
        );

      case 'pre_reading_1':
      case 'pre_reading_2': {
        const isFirstPre = expStep === 'pre_reading_1';
        const textId = expCondition?.text_order?.[isFirstPre ? 0 : 1];
        const textTitle = expTexts?.[textId]?.title || "";
        return (
          <div className="glass" style={{ maxWidth: '650px', margin: '2rem auto', padding: '2.5rem', textAlign: 'left' }} dir="ltr">
            <h2 style={{ color: 'var(--accent)', marginTop: 0 }}>{t('pre_reading.title')}</h2>
            
            <div style={{ marginTop: '2rem' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '1rem' }}>
                {t('pre_reading.prior_exposure', { title: textTitle })}
              </label>
              <div className="likert-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="likert-anchor likert-left" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('survey.anchors.not_familiar')}</span>
                <div className="likert-options" style={{ display: 'flex', gap: '1rem' }}>
                  {[1, 2, 3, 4, 5, 6, 7].map((val) => (
                    <label key={val} className="likert-option-label" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name={`pre_reading_exposure_${isFirstPre ? '1' : '2'}`}
                        checked={(isFirstPre ? priorExposure1 : priorExposure2) === String(val)}
                        onChange={() => isFirstPre ? setPriorExposure1(String(val)) : setPriorExposure2(String(val))}
                        style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                      />
                      <span style={{ fontSize: '0.85rem' }}>{val}</span>
                    </label>
                  ))}
                </div>
                <span className="likert-anchor likert-right" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('survey.anchors.very_familiar')}</span>
              </div>
            </div>
            
            <button
              className="btn"
              onClick={() => {
                 setExpStep(isFirstPre ? 'reading_1' : 'reading_2');
                 setReadingStartTime(Date.now());
              }}
              style={{ width: '100%', marginTop: '3rem', padding: '1rem', fontSize: '1.1rem' }}
            >
              {t('pre_reading.continue')}
            </button>
          </div>
        );
      }

      case 'reading_1':
      case 'reading_2':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: currentReadingCondition === 'wordahead' ? '1200px' : '800px', margin: '2rem auto', textAlign: 'left', width: '90%' }} dir="ltr">
            <div className="glass" style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--accent)' }}>Reading Session - Text {expStep === 'reading_1' ? '1' : '2'} of 2</h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Format: {expCondition.text_format === 'TF' ? 'Full Text' : 'Skimmed Text'} | Mode: {currentReadingCondition === 'plain' ? 'Plain Reading' : 'WordAhead Assistance'}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Text Size:</span>
                <input
                  type="range" min="0.9" max="1.6" step="0.1"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseFloat(e.target.value))}
                  style={{ width: '80px', accentColor: 'var(--accent)' }}
                />
              </div>
            </div>
            
            <div className={`reading-layout-grid ${currentReadingCondition === 'wordahead' ? 'wordahead-layout' : ''}`}>
              <div className="glass content-panel" style={{ padding: '2.5rem', background: 'white' }}>
                <h2 style={{ marginTop: 0, borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                  {currentTextData?.title}
                </h2>
                {loading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                    <Loader2 className="loader" style={{ width: '48px', height: '48px' }} />
                  </div>
                ) : (
                  <div style={{ lineHeight: '2.0', fontSize: `${fontSize}rem`, margin: '2rem 0' }}>
                    {tokens.map((t, i) => {
                      if (t.text === '\n') return <br key={i} />;
                      
                      let className = "word";
                      if (currentReadingCondition === 'plain') {
                        className += " word-experiment";
                      } else {
                        if (t.isDifficult) {
                          if (t.importance > 2) className += " word-difficult-important";
                          else className += " word-difficult";
                        } else if (t.importance >= 3) {
                          className += " word-important";
                        } else {
                          if (t.importance === 2) className += " word-fade-2";
                          else if (t.importance === 1) className += " word-fade-1";
                          else className += " word-low";
                        }
                      }
                      
                      if (expCondition.text_format === 'TS' && t.importance < 3) {
                        return null;
                      }
                      
                      return (
                        <span
                          key={i}
                          className={className}
                          onClick={() => handleWordClick(t)}
                          onPointerEnter={(e) => {
                            if (e.pointerType !== 'touch') {
                              handleWordMouseEnter(e, t);
                            }
                          }}
                          onPointerLeave={(e) => {
                            if (e.pointerType !== 'touch') {
                              handleWordMouseLeave(t);
                            }
                          }}
                          style={{ cursor: currentReadingCondition === 'wordahead' ? 'pointer' : 'default' }}
                        >
                          {t.text}{" "}
                        </span>
                      );
                    })}
                  </div>
                )}
                
                <button
                  className="btn"
                  onClick={finishReadingSession}
                  style={{ display: 'block', width: '100%', padding: '1rem', fontSize: '1.1rem', marginTop: '2rem' }}
                >
                  Continue to Comprehension Questions
                </button>
              </div>
              
              {currentReadingCondition === 'wordahead' && (
                <div className={`glass translation-panel ${selectedWord ? 'has-selection' : ''}`} style={{ height: 'fit-content', background: 'white', position: 'sticky', top: '1rem' }}>
                  <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Translation</span>
                    {selectedWord && (
                      <button className="close-btn" onClick={() => setSelectedWord(null)} style={{ position: 'static', fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}>
                        <X size={18} />
                      </button>
                    )}
                  </h3>
                  {!selectedWord ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem', fontSize: '0.9rem' }}>
                      Hover over or click a highlighted word to see its translation here.
                    </p>
                  ) : (
                    <div>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: 'var(--accent)' }}>{selectedWord.text}</h4>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.8rem' }}>
                        <span style={{ background: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>CEFR: {selectedWord.cefr}</span>
                        <span style={{ background: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Imp: {selectedWord.importance}</span>
                      </div>
                      {transLoading ? (
                        <Loader2 className="loader" style={{ margin: '1rem auto', display: 'block' }} />
                      ) : translation ? (
                        translation.error ? (
                          <div style={{ color: '#991b1b', background: '#fee2e2', padding: '0.5rem', borderRadius: '4px' }}>{translation.error}</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                {translation.translation}
                              </div>
                              {translation.transliteration && (
                                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>({translation.transliteration})</span>
                              )}
                            </div>
                            {translation.root && translation.root !== 'N/A' && (
                              <div>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Root (Shoresh):</span>
                                <div style={{ fontSize: '1.1rem', fontFamily: 'serif', fontWeight: 'bold' }}>{translation.root}</div>
                              </div>
                            )}
                            {translation.example && (
                              <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                "{translation.example}"
                              </div>
                            )}
                          </div>
                        )
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>
            {hoverTooltip && (
              <div style={{
                position: 'absolute',
                left: `${hoverTooltip.x}px`,
                top: `${hoverTooltip.y}px`,
                background: '#1e293b',
                color: '#ffffff',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                zIndex: 1000,
                boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
                transform: 'translate(-50%, -100%)',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                direction: 'rtl',
                fontFamily: 'sans-serif'
              }}>
                <div style={{ fontWeight: 'bold' }}>{hoverTooltip.translation}</div>
              </div>
            )}
          </div>
        );

      case 'quiz_1':
      case 'quiz_2': {
        const quizQuestions = getQuizQuestions(currentTextId, expStep === 'quiz_1');
        return (
          <div className="glass" style={{ maxWidth: '700px', margin: '2rem auto', padding: '2.5rem', textAlign: 'left' }} dir="ltr">
            <h2 style={{ color: 'var(--accent)', marginTop: 0 }}>Comprehension Questions</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Please answer the following questions about the text you just read.</p>
            
            {quizQuestions.map((q, idx) => {
              const selectedOption = currentQuizAnswers[idx];
              return (
                <div key={q.id} style={{ marginBottom: '2rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', lineHeight: '1.5' }}>
                    {idx + 1}. {q.question}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {q.options.map((opt, oIdx) => (
                      <label
                        key={oIdx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem 1rem',
                          borderRadius: '8px',
                          border: selectedOption === oIdx ? '2px solid var(--accent)' : '1px solid #e2e8f0',
                          background: selectedOption === oIdx ? 'rgba(124,58,237,0.05)' : 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <input
                          type="radio"
                          name={`question_${q.id}`}
                          checked={selectedOption === oIdx}
                          onChange={() => handleQuizSelect(idx, oIdx)}
                          style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
            
            <button
              className="btn"
              disabled={currentQuizAnswers.length < 6 || currentQuizAnswers.includes(undefined)}
              onClick={submitQuiz}
              style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', marginTop: '1rem' }}
            >
              Submit Answers & Continue
            </button>
          </div>
        );
      }

      case 'per_task_survey_1':
      case 'per_task_survey_2': {
        const isFirst = expStep === 'per_task_survey_1';
        const condition = isFirst
          ? (expCondition.sequence === 'A' ? 'plain' : 'wordahead')
          : (expCondition.sequence === 'A' ? 'wordahead' : 'plain');
        return (
          <PerTaskSurvey 
            key={expStep}
            condition={condition} 
            textFormat={expCondition.text_format} 
            onSubmit={submitPerTaskSurvey} 
          />
        );
      }

      case 'post_study_survey': {
        const conditionsSeen = [
          { label: "The first passage you read", condition: expCondition.sequence === 'A' ? 'plain' : 'wordahead' },
          { label: "The second passage you read", condition: expCondition.sequence === 'A' ? 'wordahead' : 'plain' }
        ];
        return (
          <PostStudySurvey 
            conditionsSeen={conditionsSeen} 
            onSubmit={submitPostStudySurvey} 
          />
        );
      }

      case 'survey_demographics':
        return (
          <div className="glass" style={{ maxWidth: '650px', margin: '2rem auto', padding: '2.5rem', textAlign: 'left' }}>
            <h2 style={{ color: 'var(--accent)', marginTop: 0 }}>{t('demographics.title')}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{t('demographics.desc')}</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>{t('demographics.age')}</label>
                <select
                  className="input"
                  value={surveyDemographics.age}
                  onChange={(e) => setSurveyDemographics(prev => ({ ...prev, age: e.target.value }))}
                >
                  <option value="">{t('demographics.options.select')}</option>
                  <option value="under_18">{t('demographics.options.under_18')}</option>
                  <option value="18_24">{t('demographics.options.18_24')}</option>
                  <option value="25_34">{t('demographics.options.25_34')}</option>
                  <option value="35_44">{t('demographics.options.35_44')}</option>
                  <option value="45_54">{t('demographics.options.45_54')}</option>
                  <option value="55_plus">{t('demographics.options.55_plus')}</option>
                </select>
              </div>

              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>{t('demographics.gender')}</label>
                <select
                  className="input"
                  value={surveyDemographics.gender}
                  onChange={(e) => setSurveyDemographics(prev => ({ ...prev, gender: e.target.value }))}
                >
                  <option value="">{t('demographics.options.select')}</option>
                  <option value="male">{t('demographics.options.male')}</option>
                  <option value="female">{t('demographics.options.female')}</option>
                  <option value="non_binary">{t('demographics.options.non_binary')}</option>
                  <option value="prefer_not_to_say">{t('demographics.options.prefer_not')}</option>
                </select>
              </div>

              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>{t('demographics.native_language')}</label>
                <select
                  className="input"
                  value={surveyDemographics.native_language === 'Hebrew' ? 'Hebrew' : (surveyDemographics.native_language === '' ? '' : 'Other')}
                  onChange={(e) => setSurveyDemographics(prev => ({ ...prev, native_language: e.target.value === 'Other' ? ' ' : e.target.value }))}
                  style={{ marginBottom: '0.5rem' }}
                >
                  <option value="">{t('demographics.options.select')}</option>
                  <option value="Hebrew">{t('demographics.options.hebrew')}</option>
                  <option value="Other">{t('demographics.options.other')}</option>
                </select>
                {surveyDemographics.native_language !== 'Hebrew' && surveyDemographics.native_language !== '' && (
                  <input
                    type="text"
                    className="input"
                    value={surveyDemographics.native_language.trim()}
                    onChange={(e) => setSurveyDemographics(prev => ({ ...prev, native_language: e.target.value }))}
                    placeholder={t('demographics.options.other')}
                  />
                )}
              </div>

              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Other Languages</label>
                <input
                  type="text"
                  className="input"
                  value={surveyDemographics.other_languages}
                  onChange={(e) => setSurveyDemographics(prev => ({ ...prev, other_languages: e.target.value }))}
                  placeholder="e.g. English, French, Spanish"
                />
              </div>

              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>{t('demographics.years_studying_english')}</label>
                <input
                  type="number"
                  className="input"
                  value={surveyDemographics.years_studying_english}
                  onChange={(e) => setSurveyDemographics(prev => ({ ...prev, years_studying_english: e.target.value }))}
                  placeholder="e.g. 8"
                />
              </div>

              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>{t('demographics.course_level')}</label>
                <select
                  className="input"
                  value={surveyDemographics.course_level}
                  onChange={(e) => setSurveyDemographics(prev => ({ ...prev, course_level: e.target.value }))}
                >
                  <option value="">Select Course Level</option>
                  <option value="undergrad">Undergraduate</option>
                  <option value="grad">Graduate</option>
                  <option value="other">{t('demographics.options.other_course')}</option>
                </select>
              </div>

              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>{t('demographics.academic_year')}</label>
                <input
                  type="text"
                  className="input"
                  value={surveyDemographics.academic_year}
                  onChange={(e) => setSurveyDemographics(prev => ({ ...prev, academic_year: e.target.value }))}
                  placeholder="e.g. 1st Year, 2nd Year, etc."
                />
              </div>

              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>{t('demographics.field_of_study')}</label>
                <input
                  type="text"
                  className="input"
                  value={surveyDemographics.field_of_study}
                  onChange={(e) => setSurveyDemographics(prev => ({ ...prev, field_of_study: e.target.value }))}
                  placeholder="e.g. Computer Science, Medicine"
                />
              </div>

              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>Self-Rated English Level</label>
                <div className="likert-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="likert-anchor likert-left" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Beginner (1)</span>
                  <div className="likert-options" style={{ display: 'flex', gap: '1rem' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                      <label key={val} className="likert-option-label" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="demographics_level"
                          checked={surveyDemographics.self_rated_english === String(val)}
                          onChange={() => setSurveyDemographics(prev => ({ ...prev, self_rated_english: String(val) }))}
                          style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                        />
                        <span style={{ fontSize: '0.85rem' }}>{val}</span>
                      </label>
                    ))}
                  </div>
                  <span className="likert-anchor likert-right" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Fluent (5)</span>
                </div>
              </div>

              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>{t('demographics.reads_academic_english')}</label>
                <div className="likert-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="likert-anchor likert-left" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('survey.freq_anchors.rarely')}</span>
                  <div className="likert-options" style={{ display: 'flex', gap: '1rem' }}>
                    {[1, 2, 3, 4, 5].map((val) => (
                      <label key={val} className="likert-option-label" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="demographics_freq"
                          checked={surveyDemographics.frequency_academic_english === String(val)}
                          onChange={() => setSurveyDemographics(prev => ({ ...prev, frequency_academic_english: String(val) }))}
                          style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                        />
                        <span style={{ fontSize: '0.85rem' }}>{val}</span>
                      </label>
                    ))}
                  </div>
                  <span className="likert-anchor likert-right" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('survey.freq_anchors.daily')}</span>
                </div>
              </div>

              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>{t('demographics.uses_translation_tools')}</label>
                <div className="likert-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="likert-anchor likert-left" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('survey.freq_anchors.rarely')}</span>
                  <div className="likert-options" style={{ display: 'flex', gap: '1rem' }}>
                    {[1, 2, 3, 4, 5].map((val) => (
                      <label key={val} className="likert-option-label" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="demographics_translation"
                          checked={surveyDemographics.use_translation_tools === String(val)}
                          onChange={() => setSurveyDemographics(prev => ({ ...prev, use_translation_tools: String(val) }))}
                          style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                        />
                        <span style={{ fontSize: '0.85rem' }}>{val}</span>
                      </label>
                    ))}
                  </div>
                  <span className="likert-anchor likert-right" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('survey.freq_anchors.always')}</span>
                </div>
              </div>
            </div>
            
            <button
              className="btn"
              disabled={
                isSubmitting ||
                !surveyDemographics.age ||
                !surveyDemographics.native_language.trim() ||
                !surveyDemographics.years_studying_english.trim() ||
                !surveyDemographics.course_level ||
                !surveyDemographics.self_rated_english ||
                !surveyDemographics.academic_year.trim() ||
                !surveyDemographics.field_of_study.trim()
              }
              onClick={() => submitExperiment()}
              style={{ width: '100%', padding: '1.2rem', fontSize: '1.2rem', marginTop: '3rem', background: 'var(--accent)' }}
            >
              {isSubmitting ? 'Submitting Responses...' : 'Complete Experiment & ' + t('demographics.submit')}
            </button>
          </div>
        );

      case 'completed': {
        const isPilot = expCondition?.is_pilot;
        return (
          <div className="glass" style={{ maxWidth: '600px', margin: '4rem auto', padding: '3.5rem', textAlign: 'center' }}>
            {isPilot ? (
              <>
                <h2 style={{ color: 'var(--accent)', marginTop: 0 }}>Pilot / Demo Completed!</h2>
                <p style={{ fontSize: '1.1rem', lineHeight: '1.6', margin: '2rem 0' }}>
                  You have completed the pilot run of the experiment. Your responses have been successfully logged.
                </p>
              </>
            ) : (
              <>
                <h2 style={{ color: '#22c55e', marginTop: 0 }}>Experiment Completed Successfully!</h2>
                <p style={{ fontSize: '1.1rem', lineHeight: '1.6', margin: '2rem 0' }}>
                  Thank you very much for your time and contribution to our research study. Your responses have been saved and synchronized with Qualtrics.
                </p>
              </>
            )}
            {submitResult?.qualtrics_sync?.success ? (
              <p style={{ color: '#166534', background: '#f0fdf4', padding: '0.75rem', borderRadius: '6px', fontSize: '0.9rem', marginBottom: '2rem' }}>
                ✓ Server sync status: Data uploaded successfully.
              </p>
            ) : (
              <p style={{ color: '#854d0e', background: '#fefce8', padding: '0.75rem', borderRadius: '6px', fontSize: '0.9rem', marginBottom: '2rem' }}>
                ℹ Server sync status: Logged locally. (Dry-run mode / API offline)
              </p>
            )}
            {isPilot ? (
              <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>
                  Since this is a pilot session, the Prolific redirect is optional:
                </p>
                <a
                  href="https://app.prolific.co/submissions/complete?cc=C10BDQBR"
                  style={{ color: 'var(--accent)', textDecoration: 'underline', fontWeight: 'bold', fontSize: '1rem' }}
                >
                  Optional Prolific Redirect (C10BDQBR)
                </a>
              </div>
            ) : (
              <a
                className="btn"
                href="https://app.prolific.co/submissions/complete?cc=C10BDQBR"
                style={{ display: 'inline-block', textDecoration: 'none', padding: '1rem 2.5rem', fontSize: '1.1rem', background: 'var(--accent)', color: '#ffffff' }}
              >
                Redirect to Prolific to Complete
              </a>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  if (inExperiment && expStep) {
    return (
      <div className="app-container" dir={expStep === 'consent' ? CONSENT_DIR : 'ltr'}>
        {/* Sticky Header inside Experiment Flow */}
        <div className="top-sticky-wrapper" style={{ position: 'sticky', top: '1rem', zIndex: 100, marginBottom: '2rem' }}>
          <div style={{ position: 'absolute', top: '-1rem', left: '-1rem', right: '-1rem', bottom: '-1rem', background: 'var(--bg-primary)', zIndex: -1 }}></div>
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
              {expStep !== 'consent' && (
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  cursor: 'pointer',
                  background: 'rgba(124, 58, 237, 0.15)',
                  padding: '0.55rem 0.9rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  border: '1px solid var(--accent)',
                  color: 'var(--text-primary)',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 0 12px rgba(124, 58, 237, 0.15)'
                }}>
                  <input
                    type="checkbox"
                    checked={experimentMode}
                    onChange={(e) => {
                      setExperimentMode(e.target.checked);
                      if (!e.target.checked) {
                        setInExperiment(false);
                        setExpStep('');
                      }
                    }}
                    style={{
                      cursor: 'pointer',
                      accentColor: 'var(--accent)',
                      width: '15px',
                      height: '15px'
                    }}
                  />
                  <span>Plain Text Mode</span>
                </label>
              )}
            </div>
          </header>
        </div>

        {notification && (
          <div className="notification-toast" style={{
            position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
            background: '#1e293b', color: 'white', padding: '0.75rem 1.5rem',
            borderRadius: '8px', zIndex: 9999, fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}>
            {notification}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, width: '100%' }}>
          {renderExperimentFlow()}
        </div>

        {(expStep === 'consent' || expStep === 'lextale') && (
          <button
            onClick={() => {
              setInExperiment(false);
              setExperimentMode(false);
              setExpStep('');
            }}
            className="skip-test-btn"
            style={{
              position: 'fixed',
              bottom: '1.5rem',
              right: '1.5rem',
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--text-secondary)',
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              cursor: 'pointer',
              zIndex: 1000,
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.15)';
              e.target.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.08)';
              e.target.style.color = 'var(--text-secondary)';
            }}
          >
            Skip test →
          </button>
        )}
      </div>
    );
  }

  // --- Normal App Rendering (Fallback) ---
  return (
    <div className="app-container" dir="ltr">
      <div className="top-sticky-wrapper" style={{ position: 'sticky', top: '1rem', zIndex: 100, marginBottom: '2rem' }}>
        <div style={{ position: 'absolute', top: '-1rem', left: '-1rem', right: '-1rem', bottom: '-1rem', background: 'var(--bg-primary)', zIndex: -1 }}></div>
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
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              cursor: 'pointer',
              background: experimentMode ? 'rgba(124, 58, 237, 0.15)' : 'var(--bg-secondary)',
              padding: '0.55rem 0.9rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              border: experimentMode ? '1px solid var(--accent)' : '1px solid rgba(0, 0, 0, 0.08)',
              color: 'var(--text-primary)',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              boxShadow: experimentMode ? '0 0 12px rgba(124, 58, 237, 0.15)' : 'none'
            }}>
              <input
                type="checkbox"
                checked={experimentMode}
                onChange={(e) => {
                  setExperimentMode(e.target.checked);
                  if (e.target.checked) {
                    setInExperiment(true);
                    setExpStep('consent');
                  } else {
                    setInExperiment(false);
                    setExpStep('');
                  }
                }}
                style={{
                  cursor: 'pointer',
                  accentColor: 'var(--accent)',
                  width: '15px',
                  height: '15px'
                }}
              />
              <span>Plain Text Mode</span>
            </label>

            <button className="btn" onClick={() => setShowHowToUse(true)} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
              <HelpCircle size={18} /> How to Use
            </button>
            <button className="btn" onClick={() => setShowDashboard(true)} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
              <Settings size={18} /> My Progress
            </button>
            <div className="glass" style={{ padding: '0.2rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.2rem', borderRadius: '10px' }}>
              <button
                onClick={() => handleLevelChange('B1')}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: userLevel === 'B1' ? 'var(--accent)' : 'transparent',
                  color: userLevel === 'B1' ? 'white' : 'var(--text-secondary)',
                  fontWeight: userLevel === 'B1' ? 'bold' : '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '0.85rem'
                }}
              >
                B1
              </button>
              <button
                onClick={() => handleLevelChange('B2')}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: userLevel === 'B2' ? 'var(--accent)' : 'transparent',
                  color: userLevel === 'B2' ? 'white' : 'var(--text-secondary)',
                  fontWeight: userLevel === 'B2' ? 'bold' : '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '0.85rem'
                }}
              >
                B2
              </button>
            </div>
          </div>
        </header>

        {notification && (
          <div className="notification-toast" style={{
            position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
            background: '#1e293b', color: 'white', padding: '0.75rem 1.5rem',
            borderRadius: '8px', zIndex: 9999, fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}>
            {notification}
          </div>
        )}


        {/* Categories Legend */}
        <div className="glass legend-container" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderRight: '1px solid #e2e8f0', paddingRight: '1.5rem', marginRight: '0.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Condensation (Skimming)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <span style={{ fontSize: '0.7rem' }}>Detailed</span>
                <input
                  type="range" min="0" max="3" step="1"
                  value={skimmingLevel}
                  onChange={(e) => setSkimmingLevel(parseInt(e.target.value))}
                  style={{ width: '120px', accentColor: 'var(--text-secondary)' }}
                />
                <span style={{ fontSize: '0.7rem' }}>Skimmed</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', paddingLeft: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Text Size</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <span style={{ fontSize: '0.7rem' }}>A</span>
              <input
                type="range" min="0.8" max="1.5" step="0.1"
                value={fontSize}
                onChange={(e) => setFontSize(parseFloat(e.target.value))}
                style={{ width: '100px', accentColor: 'var(--text-secondary)' }}
              />
              <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>A</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="word word-difficult-important">Difficult & Important</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>(Bold Purple)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="word word-difficult">Difficult</span>
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
      </div>

      {/* Main Content: 3-Column Layout */}
      <div className="main-layout">

        <div className="glass input-panel">
          <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontSize: '1.2rem' }}>
            <BookOpen size={18} /> Input
          </h2>

          <div style={{ marginBottom: '1rem' }}>
            <label className="btn" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px dashed var(--text-secondary)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', fontSize: '0.85rem' }}>
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
            <div style={{ lineHeight: '2.0', fontSize: `${fontSize}rem` }}>
              {tokens.map((t, i) => {
                if (t.text === '\n') return <br key={i} />;

                let className = "word";
                const isLearned = learnedWords[t.text.toLowerCase().replace(/[.,:;?!"()]/g, '')];

                if (t.isDifficult && !isLearned) {
                  // DIFFICULT WORDS (Purple)
                  if (t.importance > 2) {
                    className += " word-difficult-important";
                  } else {
                    className += " word-difficult";
                  }
                } else if (t.importance >= 3) {
                  // IMPORTANT WORDS (Bold Black) - Easy but Critical
                  className += " word-important";
                } else {
                  // NOT IMPORTANT (Greys) - Easy and less critical
                  if (t.importance === 2) className += " word-fade-2";
                  else if (t.importance === 1) className += " word-fade-1";
                  else className += " word-low"; // importance 0
                }

                // Filter tokens by skimming level
                if (t.importance < skimmingLevel) {
                  return null;
                }

                return (
                  <motion.span
                    key={i}
                    className={className}
                    onClick={() => handleWordClick(t)}
                    animate={{
                      opacity: 1,
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
        <div className={`glass translation-panel ${selectedWord ? 'has-selection' : ''}`}>
          <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontSize: '1.1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
            <img src="/WordAheadLogo.png" alt="WordAhead Logo" style={{ height: '20px', objectFit: 'contain' }} /> Translation
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
                  <h3 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>{selectedWord.text}</h3>
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
                        </div>
                      )}

                      {translation.example && (
                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid #cbd5e1' }}>
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
              className="glass modal-content-card"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '90%', maxWidth: '800px', maxHeight: '80vh', overflow: 'hidden',
                display: 'flex', flexDirection: 'column', background: 'white', padding: '2rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>My Learning Progress</h2>
                <button className="close-btn" onClick={() => setShowDashboard(false)}><X size={24} /></button>
              </div>

              {/* Tab Navigation */}
              <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem', paddingBottom: '0.25rem' }}>
                <button
                  onClick={() => setActiveTab('words')}
                  style={{
                    background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer',
                    fontSize: '0.95rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    color: activeTab === 'words' ? 'var(--accent)' : 'var(--text-secondary)',
                    borderBottom: activeTab === 'words' ? '2px solid var(--accent)' : '2px solid transparent',
                    marginBottom: '-5px',
                    transition: 'all 0.2s'
                  }}
                >
                  <BookOpen size={18} />
                  Vocabulary Progress
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  style={{
                    background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer',
                    fontSize: '0.95rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    color: activeTab === 'history' ? 'var(--accent)' : 'var(--text-secondary)',
                    borderBottom: activeTab === 'history' ? '2px solid var(--accent)' : '2px solid transparent',
                    marginBottom: '-5px',
                    transition: 'all 0.2s'
                  }}
                >
                  <History size={18} />
                  Reading History
                </button>
              </div>

              {activeTab === 'words' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', overflowY: 'auto', flex: 1 }}>
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
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '50vh', overflowY: 'auto' }}>
                        {Object.keys(learnedWords).map(word => (
                          <span key={word} style={{ background: '#f0fdf4', color: '#166534', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.9rem', border: '1px solid #bbf7d0' }}>
                            {word}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* History Tab */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
                  {/* Search Bar */}
                  {!historyLoading && history.length > 0 && (
                    <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                      <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                        <Search size={18} />
                      </span>
                      <input
                        type="text"
                        placeholder="Search saved texts by keywords or level..."
                        value={historySearchQuery}
                        onChange={(e) => setHistorySearchQuery(e.target.value)}
                        style={{
                          padding: '0.75rem 1rem 0.75rem 2.5rem',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          width: '100%',
                          fontSize: '0.95rem',
                          outline: 'none',
                          background: '#f8fafc',
                          color: 'var(--text-primary)',
                          transition: 'all 0.2s'
                        }}
                      />
                      {historySearchQuery && (
                        <button
                          onClick={() => setHistorySearchQuery('')}
                          style={{
                            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', padding: '4px'
                          }}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  )}

                  {historyLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '1rem', color: 'var(--text-secondary)' }}>
                      <Loader2 className="animate-spin" size={32} />
                      <span>Loading your reading history...</span>
                    </div>
                  ) : history.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                      <History size={48} style={{ opacity: 0.3 }} />
                      <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '500' }}>Your history is empty</p>
                      <p style={{ margin: 0, fontSize: '0.9rem', maxWidth: '300px' }}>Analyze Hebrew texts using the input panel to automatically save them here!</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {(() => {
                        const filteredHistory = history.filter(entry => {
                          const query = historySearchQuery.toLowerCase().trim();
                          if (!query) return true;
                          return (
                            (entry.raw_text && entry.raw_text.toLowerCase().includes(query)) ||
                            (entry.text_preview && entry.text_preview.toLowerCase().includes(query)) ||
                            (entry.user_level && entry.user_level.toLowerCase().includes(query))
                          );
                        });

                        if (filteredHistory.length === 0) {
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '1rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                              <p style={{ margin: 0, fontSize: '1rem', fontWeight: '500' }}>No matching history entries found</p>
                              <p style={{ margin: 0, fontSize: '0.85rem' }}>Try searching for a different keyword or level.</p>
                            </div>
                          );
                        }

                        return filteredHistory.map((entry) => {
                          const date = new Date(entry.created_at + " UTC");
                          const formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                          
                          // Calculate stats dynamically
                          const stats = getHistoryEntryStats(entry, learnedWords);
                          const currentMode = cardViewModes[entry.id] || 'detailed';
                          const activeStats = currentMode === 'detailed' ? stats.detailed : stats.skimmed;

                          return (
                            <div
                              key={entry.id}
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                padding: '1.25rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem',
                                transition: 'all 0.2s ease-in-out',
                                position: 'relative'
                              }}
                              className="history-card"
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                                  <span style={{ background: '#7c3aed', color: 'white', fontSize: '0.75rem', fontWeight: 'bold', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                                    Level: {entry.user_level}
                                  </span>
                                  <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.75rem', fontWeight: '600', padding: '0.2rem 0.5rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Clock size={12} />
                                    {formattedDate}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleDeleteHistory(entry.id)}
                                  style={{
                                    background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444',
                                    padding: '4px', borderRadius: '6px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                  }}
                                  title="Delete from history"
                                  className="delete-history-btn"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>

                              <p
                                style={{
                                  margin: 0,
                                  fontSize: '1rem',
                                  color: 'var(--text-primary)',
                                  fontWeight: '500',
                                  direction: 'ltr',
                                  textAlign: 'left',
                                  lineHeight: '1.5',
                                  fontFamily: 'inherit',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  padding: '0.25rem 0'
                                }}
                              >
                                {entry.text_preview}
                              </p>

                              {/* Toggle Pill and Reload Button Row */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                                <div style={{ display: 'flex', background: '#cbd5e1', padding: '2px', borderRadius: '8px', width: 'fit-content' }}>
                                  <button
                                    onClick={() => setCardViewModes(prev => ({ ...prev, [entry.id]: 'detailed' }))}
                                    style={{
                                      padding: '0.3rem 0.75rem',
                                      fontSize: '0.75rem',
                                      fontWeight: '700',
                                      borderRadius: '6px',
                                      border: 'none',
                                      background: currentMode === 'detailed' ? 'white' : 'transparent',
                                      color: currentMode === 'detailed' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                      cursor: 'pointer',
                                      boxShadow: currentMode === 'detailed' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    Detailed
                                  </button>
                                  <button
                                    onClick={() => setCardViewModes(prev => ({ ...prev, [entry.id]: 'skimmed' }))}
                                    style={{
                                      padding: '0.3rem 0.75rem',
                                      fontSize: '0.75rem',
                                      fontWeight: '700',
                                      borderRadius: '6px',
                                      border: 'none',
                                      background: currentMode === 'skimmed' ? 'white' : 'transparent',
                                      color: currentMode === 'skimmed' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                      cursor: 'pointer',
                                      boxShadow: currentMode === 'skimmed' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    Skimmed
                                  </button>
                                </div>

                                <button
                                  onClick={() => handleLoadHistory(entry)}
                                  className="btn"
                                  style={{
                                    padding: '0.4rem 1rem',
                                    fontSize: '0.8rem',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.35rem'
                                  }}
                                >
                                  <Play size={12} fill="white" />
                                  Reload
                                </button>
                              </div>

                              {/* Responsive Stats Grid */}
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                                gap: '0.5rem',
                                marginTop: '0.25rem'
                              }}>
                                {/* Words count */}
                                <div style={{ background: 'white', padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Words</div>
                                  <div style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>{activeStats.words}</div>
                                </div>
                                {/* Difficult count */}
                                <div style={{ background: 'white', padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Difficult</div>
                                  <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#9333ea', marginTop: '2px' }}>{activeStats.difficult}</div>
                                </div>
                                {/* Percentage of difficult words */}
                                <div style={{ background: 'white', padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Difficult %</div>
                                  <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#7c3aed', marginTop: '2px' }}>{activeStats.diffPercentage.toFixed(1)}%</div>
                                </div>
                                {/* Sentence count */}
                                <div style={{ background: 'white', padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Sentences</div>
                                  <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{activeStats.sentences}</div>
                                </div>
                                {/* Average sentence length */}
                                <div style={{ background: 'white', padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Avg. Length</div>
                                  <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0284c7', marginTop: '2px' }}>{activeStats.avgSentenceLength.toFixed(1)}</div>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              )}
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
              className="glass modal-content-card"
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
                <div style={{ background: '#1e293b', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <HelpCircle color="white" size={30} />
                </div>
                <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Welcome to WordAhead</h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Your personal Hebrew reading assistant</p>
              </div>

              <div className="tutorial-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <section>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>1. Analysis & Input</h3>
                  <p style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                    Paste text or upload a <strong>.txt</strong> file. Click <strong>Analyze</strong> to highlight difficult words and calculate importance levels tailored to your level.
                  </p>
                </section>

                <section>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>2. Understanding Colors</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', fontSize: '0.85rem' }}>
                    <div style={{ border: '1px solid #f1f5f9', padding: '0.5rem', borderRadius: '6px' }}>
                      <strong style={{ color: '#7c3aed' }}>Purple:</strong> Difficult words for your level.
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
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>3. The Skimming Slider</h3>
                  <p style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                    Use the <strong>Condensation</strong> bar to hide less important words. Moving it to the right helps you focus only on the core meaning of the text.
                  </p>
                </section>

                <section>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>4. Interactive Translation</h3>
                  <p style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                    Click any word to see its <strong>Hebrew Root (שורש)</strong>, translation, and example.
                    Mark words as <strong>Learned</strong> to stop them from being highlighted in future texts.
                  </p>
                </section>
              </div>

              <button
                className="btn"
                onClick={() => setShowHowToUse(false)}
                style={{ width: '100%', marginTop: '2rem', padding: '1rem', background: 'var(--text-primary)', color: 'white' }}
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
