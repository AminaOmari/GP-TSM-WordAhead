import re

with open('src/App.jsx', 'r') as f:
    content = f.read()

# 1. Add state variables for prior topic exposure
state_vars = "  const [priorExposure1, setPriorExposure1] = useState('4');\n  const [priorExposure2, setPriorExposure2] = useState('4');"
content = content.replace("  const [readingTime1, setReadingTime1] = useState(0);", state_vars + "\n  const [readingTime1, setReadingTime1] = useState(0);")

# 2. Update startReadingSessions
content = content.replace("setExpStep('reading_1');", "setExpStep('pre_reading_1');")

# 3. Update submitPerTaskSurvey to go to pre_reading_2 instead of reading_2
content = content.replace("setExpStep('reading_2');", "setExpStep('pre_reading_2');")

# 4. Add the render blocks for pre_reading_1 and pre_reading_2
pre_reading_render = """      case 'pre_reading_1':
      case 'pre_reading_2':
        const isFirstPre = expStep === 'pre_reading_1';
        return (
          <div className="glass" style={{ maxWidth: '650px', margin: '2rem auto', padding: '2.5rem', textAlign: 'left' }} dir="rtl">
            <h2 style={{ color: 'var(--accent)', marginTop: 0 }}>{t('pre_reading.title')}</h2>
            
            <div style={{ marginTop: '2rem' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '1rem' }}>{t('pre_reading.prior_exposure')}</label>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('survey.anchors.not_familiar')}</span>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  {[1, 2, 3, 4, 5, 6, 7].map((val) => (
                    <label key={val} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
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
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('survey.anchors.very_familiar')}</span>
              </div>
            </div>
            
            <button
              className="btn"
              onClick={() => {
                 setExpStep(isFirstPre ? 'reading_1' : 'reading_2');
                 setStartTime(Date.now());
              }}
              style={{ width: '100%', marginTop: '3rem', padding: '1rem', fontSize: '1.1rem' }}
            >
              {t('pre_reading.continue')}
            </button>
          </div>
        );

"""

# Insert before reading_1
content = content.replace("      case 'reading_1':", pre_reading_render + "      case 'reading_1':")

# 5. Fix the submitDemographics payload and endpoint call
# Let's find submitDemographics - it doesn't exist yet, we just changed onClick to setExpStep('assigned').
# We should probably submit demographics to the backend eventually, or do it at the end.
# Actually, the demographics and attention checks are supposed to go to a new table `participant_meta`.
# The best place to submit it is at `submitExperiment` which is called at the end of the post-study survey.
# Wait, "Use a SEPARATE participant_meta table for demographics + attention checks".
# We should probably save it there. Let's do it at the end of the experiment.

with open('src/App.jsx', 'w') as f:
    f.write(content)

