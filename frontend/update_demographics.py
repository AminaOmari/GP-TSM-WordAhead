import re

with open('src/App.jsx', 'r') as f:
    content = f.read()

# Fix the native_language duplicate inputs left from bad diff
bad_native = """                )}
                  value={surveyDemographics.native_language}
                  onChange={(e) => setSurveyDemographics(prev => ({ ...prev, native_language: e.target.value }))}
                  placeholder="e.g. Hebrew, Arabic, Russian"
                />
              </div>"""

content = content.replace(bad_native, "                )}\n              </div>")

# Other Languages
content = content.replace('<label style={{ fontWeight: \'bold\', display: \'block\', marginBottom: \'0.5rem\' }}>Other Languages (besides English and Native)</label>', '<label style={{ fontWeight: \'bold\', display: \'block\', marginBottom: \'0.5rem\' }}>{t(\'demographics.other_languages\')}</label>')

# Years studying English
content = content.replace('<label style={{ fontWeight: \'bold\', display: \'block\', marginBottom: \'0.5rem\' }}>Years Studying English</label>', '<label style={{ fontWeight: \'bold\', display: \'block\', marginBottom: \'0.5rem\' }}>{t(\'demographics.years_studying_english\')}</label>')

# Course Level
content = content.replace('<label style={{ fontWeight: \'bold\', display: \'block\', marginBottom: \'0.5rem\' }}>Course Level</label>', '<label style={{ fontWeight: \'bold\', display: \'block\', marginBottom: \'0.5rem\' }}>{t(\'demographics.course_level\')}</label>')

content = content.replace('<option value="">Select Level</option>', '<option value="">{t(\'demographics.options.select\')}</option>')
content = content.replace('<option value="undergraduate">Undergraduate</option>', '<option value="undergraduate">{t(\'demographics.options.undergrad\')}</option>')
content = content.replace('<option value="graduate">Graduate</option>', '<option value="graduate">{t(\'demographics.options.grad\')}</option>')
content = content.replace('<option value="other">Other</option>', '<option value="other">{t(\'demographics.options.other_course\')}</option>')

# Academic Year
content = content.replace('<label style={{ fontWeight: \'bold\', display: \'block\', marginBottom: \'0.5rem\' }}>Academic Year</label>', '<label style={{ fontWeight: \'bold\', display: \'block\', marginBottom: \'0.5rem\' }}>{t(\'demographics.academic_year\')}</label>')

# Field of Study
content = content.replace('<label style={{ fontWeight: \'bold\', display: \'block\', marginBottom: \'0.5rem\' }}>Field of Study</label>', '<label style={{ fontWeight: \'bold\', display: \'block\', marginBottom: \'0.5rem\' }}>{t(\'demographics.field_of_study\')}</label>')

# Self-Rated English Reading
content = content.replace('<label style={{ fontWeight: \'bold\', display: \'block\', marginBottom: \'0.25rem\' }}>Self-Rated English Reading Proficiency</label>', '<label style={{ fontWeight: \'bold\', display: \'block\', marginBottom: \'0.25rem\' }}>{t(\'demographics.self_rated_english\')}</label>')
content = content.replace('<span style={{ fontSize: \'0.8rem\', color: \'var(--text-secondary)\' }}>Weak (1)</span>', '<span style={{ fontSize: \'0.8rem\', color: \'var(--text-secondary)\' }}>1</span>')
content = content.replace('<span style={{ fontSize: \'0.8rem\', color: \'var(--text-secondary)\' }}>Excellent (5)</span>', '<span style={{ fontSize: \'0.8rem\', color: \'var(--text-secondary)\' }}>10</span>')

# Fix self rated english 1-5 to 1-10
old_sre = "{[1, 2, 3, 4, 5].map((val) => ("
new_sre = "{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => ("
content = content.replace(old_sre, new_sre, 1)

# Frequency of Academic Reading
content = content.replace('<label style={{ fontWeight: \'bold\', display: \'block\', marginBottom: \'0.25rem\' }}>Frequency of Academic Reading in English</label>', '<label style={{ fontWeight: \'bold\', display: \'block\', marginBottom: \'0.25rem\' }}>{t(\'demographics.reads_academic_english\')}</label>')
content = content.replace('<span style={{ fontSize: \'0.8rem\', color: \'var(--text-secondary)\' }}>Rarely (1)</span>', '<span style={{ fontSize: \'0.8rem\', color: \'var(--text-secondary)\' }}>{t(\'survey.freq_anchors.rarely\')}</span>')
content = content.replace('<span style={{ fontSize: \'0.8rem\', color: \'var(--text-secondary)\' }}>Daily (5)</span>', '<span style={{ fontSize: \'0.8rem\', color: \'var(--text-secondary)\' }}>{t(\'survey.freq_anchors.daily\')}</span>')

# Frequency of Translation
content = content.replace('<label style={{ fontWeight: \'bold\', display: \'block\', marginBottom: \'0.25rem\' }}>Frequency of Translation Tool Usage</label>', '<label style={{ fontWeight: \'bold\', display: \'block\', marginBottom: \'0.25rem\' }}>{t(\'demographics.uses_translation_tools\')}</label>')
content = content.replace('<span style={{ fontSize: \'0.8rem\', color: \'var(--text-secondary)\' }}>Always (5)</span>', '<span style={{ fontSize: \'0.8rem\', color: \'var(--text-secondary)\' }}>{t(\'survey.freq_anchors.always\')}</span>')

# Delete prior_topic_exposure from demographics
# It's bounded by "Prior Exposure to Topic" and "Frequency of Academic Reading"
if 'Prior Exposure to Topic' in content:
    content = re.sub(r'<div>\s*<label[^>]*>Prior Exposure to Topic.*?</label>\s*<p[^>]*>.*?</p>.*?</div>\s*</div>\s*<div>\s*<label[^>]*>\{t\(\'demographics.reads_academic_english\'\)', r'<div>\n                <label style={{ fontWeight: \'bold\', display: \'block\', marginBottom: \'0.25rem\' }}>{t(\'demographics.reads_academic_english\')}', content, flags=re.DOTALL)

# Add early attention check
attention_check_block = """              <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '2px dashed var(--border-color)' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>{t('survey.attention.check2')}</label>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>1</span>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    {[1, 2, 3, 4, 5].map((val) => (
                      <label key={`ac_${val}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="demographics_ac"
                          checked={surveyDemographics.ac_early === String(val)}
                          onChange={() => setSurveyDemographics(prev => ({ ...prev, ac_early: String(val) }))}
                          style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                        />
                        <span style={{ fontSize: '0.85rem' }}>{val}</span>
                      </label>
                    ))}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>5</span>
                </div>
              </div>
            </div>"""

content = content.replace('            </div>\n            \n            <button', attention_check_block + '\n            \n            <button')

content = content.replace('Submit Results', '{t(\'demographics.submit\')}')
content = content.replace('onClick={submitExperiment}', 'onClick={() => setExpStep(\'assigned\')}')

# Fix the condition to go to survey_demographics instead of assigned after lextale
content = content.replace("setExpStep('assigned');", "setExpStep('survey_demographics');")

with open('src/App.jsx', 'w') as f:
    f.write(content)

