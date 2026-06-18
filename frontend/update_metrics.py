import re

with open('src/App.jsx', 'r') as f:
    content = f.read()

# Add state variables
state_vars = "  const [clickEvents1, setClickEvents1] = useState([]);\n  const [clickEvents2, setClickEvents2] = useState([]);\n  const [clickEvents, setClickEvents] = useState([]);"
content = content.replace("  const [hoverEvents2, setHoverEvents2] = useState([]);", "  const [hoverEvents2, setHoverEvents2] = useState([]);\n" + state_vars)

# Save click events
content = content.replace("setHoverEvents1(hoverEvents);", "setHoverEvents1(hoverEvents);\n      setClickEvents1(clickEvents);")
content = content.replace("setHoverEvents2(hoverEvents);", "setHoverEvents2(hoverEvents);\n      setClickEvents2(clickEvents);")

content = content.replace("setHoverEvents([]);", "setHoverEvents([]);\n      setClickEvents([]);")

# Add click tracking
click_tracking = """
    const eventData = {
      word: token.text,
      timestamp: Date.now()
    };
    setClickEvents(prev => [...prev, eventData]);
"""
content = content.replace("    setSelectedWord(token);\n    setTransLoading(true);", click_tracking + "\n    setSelectedWord(token);\n    setTransLoading(true);")

# Update Payload to compute aggregates and pass raw events
payload_replace = """          hover_events: hoverEvents1,
          click_events: clickEvents1,
          click_count: clickEvents1.length,
          unique_words_translated: Array.from(new Set([
            ...hoverEvents1.filter(e => e.translation_shown).map(e => e.word.toLowerCase()),
            ...clickEvents1.map(e => e.word.toLowerCase())
          ])).length,
          comprehension: quiz1Results"""
content = content.replace("          hover_events: hoverEvents1,\n          comprehension: quiz1Results", payload_replace)

payload_replace_2 = """          hover_events: hoverEvents2,
          click_events: clickEvents2,
          click_count: clickEvents2.length,
          unique_words_translated: Array.from(new Set([
            ...hoverEvents2.filter(e => e.translation_shown).map(e => e.word.toLowerCase()),
            ...clickEvents2.map(e => e.word.toLowerCase())
          ])).length,
          comprehension: quiz2Results"""
content = content.replace("          hover_events: hoverEvents2,\n          comprehension: quiz2Results", payload_replace_2)

# Fix demographics survey saving place: since demographics is now shown BEFORE reading,
# We shouldn't put it in submitExperiment which is called at the END.
# Wait, NO. Demographics data is collected at `survey_demographics` and stored in `surveyDemographics`.
# Then it just waits in state until `submitExperiment` which is called by the button in `completed`?
# Actually, the user asked: "Storage: use a SEPARATE participant_meta table for demographics + attention checks".
# `submitExperiment` is called right after `post_study_survey` since I changed `survey_demographics` position.
# Let's verify where `submitExperiment` is called.
# In `PostStudySurvey` submit, it calls `onSubmit` which maps to `handlePostStudySurveySubmit`.

with open('src/App.jsx', 'w') as f:
    f.write(content)

