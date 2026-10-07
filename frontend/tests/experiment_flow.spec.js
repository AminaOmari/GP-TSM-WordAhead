import { test, expect } from '@playwright/test';

test.describe('WordAhead Participant Flow E2E', () => {
  test('Walk through complete participant flow with Sequence B and TS format', async ({ page }) => {
    // Log console logs, errors, and requests
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    page.on('request', req => console.log('REQ:', req.method(), req.url()));
    page.on('response', res => console.log('RES:', res.status(), res.url()));
    
    // 1. Mock API calls to isolate from backend database and configuration changes
    const mockAssignment = {
      prolific_pid: "test_pid_pw",
      lextale_score: 75.0,
      cefr_level: "B2",
      text_format: "TS",  // Skimmed Text format (Block C should render)
      sequence: "B",     // Sequence B (Trial 1 = wordahead, Trial 2 = plain)
      text_pair: "b2_pair1",
      text_order: ["b2p1_santiago_skimmed", "b2p1_numeracy"]
    };

    const mockTextSession = {
      assignment: mockAssignment,
      texts: {
        b2p1_santiago_skimmed: {
          title: "Mock Passage A3",
          text: "This is a mock academic reading passage to test the WordAhead frontend system.",
          mcqs: Array.from({ length: 5 }, (_, i) => ({
            id: `q_a_${i}`,
            question: `Comprehension Question A ${i + 1}`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correct: 0
          }))
        },
        b2p1_numeracy: {
          title: "Mock Passage B3",
          text: "This is a second mock academic reading passage for the counterbalanced experiment flow.",
          mcqs: Array.from({ length: 5 }, (_, i) => ({
            id: `q_b_${i}`,
            question: `Comprehension Question B ${i + 1}`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correct: 1
          }))
        }
      }
    };

    const mockTokens = {
      tokens: [
        { text: "This", cefr: "A1" },
        { text: " ", cefr: null },
        { text: "is", cefr: "A1" },
        { text: " ", cefr: null },
        { text: "a", cefr: "A1" },
        { text: " ", cefr: null },
        { text: "mock", cefr: "C1", importance: 3 },
        { text: " ", cefr: null },
        { text: "passage", cefr: "B2", importance: 2 },
        { text: ".", cefr: null }
      ]
    };

    // Intercept and stub APIs
    await page.route('**/api/experiment/assign', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAssignment) });
    });

    await page.route('**/api/experiment/session/*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockTextSession) });
    });

    await page.route('**/api/analyze', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockTokens) });
    });

    await page.route('**/api/experiment/log_event', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    await page.route('**/api/survey', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    await page.route('**/api/experiment/submit', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    await page.route('**/api/experiment/check_participant', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true, participant_id: "P001" }) });
    });

    // 2. Open the page
    await page.goto('/experiment');

    // Check English UI elements direction (LTR container)
    const appContainer = page.locator('.app-container');
    await expect(appContainer).toHaveAttribute('dir', 'ltr');

    // 3. Consent Page Check
    const consentButton = page.locator('button:has-text("Continue")');
    await expect(consentButton).toBeDisabled();

    // Tick checkbox
    await page.locator('input[type="checkbox"]').dispatchEvent('click');
    await expect(consentButton).toBeEnabled();

    // Click Consent & go to Participant Setup
    await consentButton.dispatchEvent('click');

    // 4. Participant Setup Check
    const setupContinueButton = page.locator('button:has-text("Continue")');
    await expect(setupContinueButton).toBeDisabled();

    // Enter Participant Number
    const pidInput = page.locator('#participant-number-input');
    await pidInput.fill('P001');
    await expect(setupContinueButton).toBeEnabled();
    await setupContinueButton.dispatchEvent('click');

    // 4. LexTALE Vocabulary Test
    // Perform YES click 63 times for the vocabulary items
    for (let i = 0; i < 63; i++) {
      // Wait for the counter to display the current question index (i + 1)
      await expect(page.locator(`span:has-text("${i + 1} of 63")`)).toBeVisible();
      await page.locator('button:has-text("YES (Real Word)")').dispatchEvent('click');
    }

    // 5. Early System check (Attention check)
    const systemCheckSubmit = page.locator('button:has-text("Continue")');
    await expect(systemCheckSubmit).toBeDisabled();
    // Select early attention check (choice 3, which is index 2 of 5 options)
    await page.locator('input[name="early_ac"]').nth(2).dispatchEvent('click');
    await expect(systemCheckSubmit).toBeEnabled();
    await systemCheckSubmit.dispatchEvent('click');

    // 6. Assignment screen
    const startReadingButton = page.locator('button:has-text("Start Reading Phase")');
    await expect(startReadingButton).toBeVisible();
    await startReadingButton.dispatchEvent('click');

    // 7. Pre-reading 1 (Topic Familiarity for Passage 1)
    const preContinueButton1 = page.locator('button:has-text("Continue to Text")');
    await preContinueButton1.dispatchEvent('click');

    // 8. Reading 1 (WordAhead condition because Sequence = B)
    // Verify LTR direction for English text passage container
    const readingPassageContainer = page.locator('div:not(.app-container)[dir="ltr"]');
    await expect(readingPassageContainer).toBeVisible();

    const completeReadingButton1 = page.locator('button:has-text("Continue to Comprehension Questions")');
    await completeReadingButton1.dispatchEvent('click');

    // 9. Quiz 1 (Comprehension MCQs)
    // Verify LTR direction for English questions container
    const quizContainer = page.locator('div:not(.app-container)[dir="ltr"]');
    await expect(quizContainer).toBeVisible();

    // Check submit is disabled until all 5 are answered
    const quizSubmitButton1 = page.locator('button:has-text("Submit Answers & Continue")');
    await expect(quizSubmitButton1).toBeDisabled();

    // Select options for 6 questions (5 MCQs + 1 alertness item)
    for (let i = 0; i < 6; i++) {
      // Click first option for each MCQ (Option A is index i*4 of all Option A labels)
      // Playwright can locate label:has-text("Option A") nth(i)
      await page.locator(`label:has-text("Option A")`).nth(i).dispatchEvent('click');
    }
    await expect(quizSubmitButton1).toBeEnabled();
    await quizSubmitButton1.dispatchEvent('click');

    // 10. Per-Task Survey 1 (Condition: wordahead, Text Format: TS)
    // Verify Block B questions render (since WordAhead condition)
    // Look for a Block B specific question (pt_b18 contains "dependent on translation")
    await expect(page.locator('h4:has-text("dependent on translation")')).toBeVisible();

    // Verify Block C questions render (since Text Format is TS - Skimmed, pt_c19 contains "preserved enough")
    await expect(page.locator('h4:has-text("preserved enough")')).toBeVisible();

    // Click submit should be disabled initially
    const ptSubmitButton1 = page.locator('button:has-text("Submit Survey & Continue")');
    await expect(ptSubmitButton1).toBeDisabled();

    // Answer all questions
    const activeKeys1 = [
      'pt_a1', 'pt_a2', 'pt_a3', 'pt_a4', 'pt_a5', 'pt_a6', 'pt_a7', 'pt_a8', 'pt_a9',
      'pt_b11', 'pt_b12', 'pt_b14', 'pt_b15', 'pt_b16', 'pt_b17', 'pt_b18',
      'pt_b10', 'pt_c19'
    ];
    for (const key of activeKeys1) {
      await page.locator(`input[name="${key}"]`).nth(3).dispatchEvent('click'); // value 4 (index 3)
    }

    await expect(ptSubmitButton1).toBeEnabled();
    await ptSubmitButton1.dispatchEvent('click');

    // 11. Pre-reading 2 (Topic Familiarity for Passage 2)
    const preContinueButton2 = page.locator('button:has-text("Continue to Text")');
    await preContinueButton2.dispatchEvent('click');

    // 12. Reading 2 (Plain condition because Sequence = B)
    const completeReadingButton2 = page.locator('button:has-text("Continue to Comprehension Questions")');
    await completeReadingButton2.dispatchEvent('click');

    // 13. Quiz 2 (Comprehension MCQs)
    const quizSubmitButton2 = page.locator('button:has-text("Submit Answers & Continue")');
    await expect(quizSubmitButton2).toBeDisabled();

    for (let i = 0; i < 6; i++) {
      await page.locator(`label:has-text("Option B")`).nth(i).dispatchEvent('click');
    }
    await expect(quizSubmitButton2).toBeEnabled();
    await quizSubmitButton2.dispatchEvent('click');

    // 14. Per-Task Survey 2 (Condition: plain, Text Format: TS)
    // Verify Block B questions do NOT render (since plain condition, pt_b18 contains "dependent on translation")
    await expect(page.locator('h4:has-text("dependent on translation")')).not.toBeVisible();

    // Verify Block C questions DO render (since TS format, pt_c19 contains "preserved enough")
    await expect(page.locator('h4:has-text("preserved enough")')).toBeVisible();

    const ptSubmitButton2 = page.locator('button:has-text("Submit Survey & Continue")');
    await expect(ptSubmitButton2).toBeDisabled();

    // Answer questions: 9 Block A + 2 Block C = 11 questions total
    const activeKeys2 = [
      'pt_a1', 'pt_a2', 'pt_a3', 'pt_a4', 'pt_a5', 'pt_a6', 'pt_a7', 'pt_a8', 'pt_a9',
      'pt_b10', 'pt_c19'
    ];
    for (const key of activeKeys2) {
      await page.locator(`input[name="${key}"]`).nth(4).dispatchEvent('click'); // value 5 (index 4)
    }

    await expect(ptSubmitButton2).toBeEnabled();
    await ptSubmitButton2.dispatchEvent('click');

    // 15. Post-Study Survey
    const postSubmitButton = page.locator('button:has-text("Submit Feedback & Continue")');
    await expect(postSubmitButton).toBeDisabled();

    // Select ranking (radio selection)
    await page.locator('input[name="ranking"]').nth(0).dispatchEvent('click');

    // Fill in feedback comments
    await page.locator('textarea').first().fill('Test like comment');
    await page.locator('textarea').last().fill('Test missing comment');

    // Answer other Likert questions (ps_use_plain, ps_use_wordahead, etc.)
    await page.locator('input[name="ps_use_plain"]').nth(3).dispatchEvent('click'); // value 4 (index 3)
    await page.locator('input[name="ps_use_wordahead"]').nth(4).dispatchEvent('click'); // value 5 (index 4)
    await page.locator('input[name="ps_adoption_intent"]').nth(4).dispatchEvent('click'); // value 5 (index 4)

    await expect(postSubmitButton).toBeEnabled();
    await postSubmitButton.dispatchEvent('click');

    // 15.5 Demographics Screen
    const demoSubmitButton = page.locator('button:has-text("Complete Experiment")');
    await expect(demoSubmitButton).toBeDisabled();

    // Fill demographics using index-based select options to be locale-independent
    await page.locator('select').nth(0).selectOption('18_24');
    await page.locator('select').nth(1).selectOption('female');
    await page.locator('select').nth(2).selectOption('Hebrew');
    await page.fill('input[placeholder="e.g. 8"]', '10');
    await page.locator('select').nth(3).selectOption('bachelors');
    await page.locator('input[type="checkbox"]').nth(0).dispatchEvent('click'); // Google Translate
    await page.locator('input[type="checkbox"]').nth(3).dispatchEvent('click'); // DeepL

    // Select self-rated English level (e.g. option 7, which is index 6 of 10 options)
    await page.locator('input[name="demographics_level"]').nth(6).dispatchEvent('click');

    // Verify it is enabled now
    await expect(demoSubmitButton).toBeEnabled();
    await demoSubmitButton.dispatchEvent('click');

    // 16. Completed Screen
    await expect(page.locator('h2:has-text("Thank you for participating!")')).toBeVisible();
    await expect(page.locator('p:has-text("You may now let the researcher know you have finished.")')).toBeVisible();
    await expect(page.locator('a[href*="C10BDQBR"]')).toHaveCount(0);
  });

  test('Walk through complete participant flow with Sequence B and TF format', async ({ page }) => {
    // 1. Mock API calls to isolate from backend database and configuration changes
    const mockAssignment = {
      prolific_pid: "test_pid_pw_tf",
      lextale_score: 75.0,
      cefr_level: "B2",
      text_format: "TF",  // Full Text format (Block C should NOT render)
      sequence: "B",     // Sequence B (Trial 1 = wordahead, Trial 2 = plain)
      text_pair: "b2_pair1",
      text_order: ["b2p1_plasticbags", "b2p1_santiago_detailed"]
    };

    const mockTextSession = {
      assignment: mockAssignment,
      texts: {
        b2p1_plasticbags: {
          title: "Mock Passage A3",
          text: "This is a mock academic reading passage to test the WordAhead frontend system.",
          mcqs: Array.from({ length: 5 }, (_, i) => ({
            id: `q_a_${i}`,
            question: `Comprehension Question A ${i + 1}`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correct: 0
          }))
        },
        b2p1_santiago_detailed: {
          title: "Mock Passage B3",
          text: "This is a second mock academic reading passage for the counterbalanced experiment flow.",
          mcqs: Array.from({ length: 5 }, (_, i) => ({
            id: `q_b_${i}`,
            question: `Comprehension Question B ${i + 1}`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correct: 1
          }))
        }
      }
    };

    const mockTokens = {
      tokens: [
        { text: "This", cefr: "A1" },
        { text: " ", cefr: null },
        { text: "is", cefr: "A1" },
        { text: " ", cefr: null },
        { text: "a", cefr: "A1" },
        { text: " ", cefr: null },
        { text: "mock", cefr: "C1", importance: 3 },
        { text: " ", cefr: null },
        { text: "passage", cefr: "B2", importance: 2 },
        { text: ".", cefr: null }
      ]
    };

    // Intercept and stub APIs
    await page.route('**/api/experiment/assign', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAssignment) });
    });

    await page.route('**/api/experiment/session/*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockTextSession) });
    });

    await page.route('**/api/analyze', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockTokens) });
    });

    await page.route('**/api/experiment/log_event', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    await page.route('**/api/survey', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    await page.route('**/api/experiment/submit', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    await page.route('**/api/experiment/check_participant', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true, participant_id: "P002" }) });
    });

    // 2. Open the page
    await page.goto('/experiment');

    // Check English UI elements direction (LTR container)
    const appContainer = page.locator('.app-container');
    await expect(appContainer).toHaveAttribute('dir', 'ltr');

    // 3. Consent Page Check
    const consentButton = page.locator('button:has-text("Continue")');
    await expect(consentButton).toBeDisabled();

    // Tick checkbox
    await page.locator('input[type="checkbox"]').dispatchEvent('click');
    await expect(consentButton).toBeEnabled();

    // Click Consent & go to Participant Setup
    await consentButton.dispatchEvent('click');

    // 4. Participant Setup Check
    const setupContinueButton = page.locator('button:has-text("Continue")');
    await expect(setupContinueButton).toBeDisabled();

    // Enter Participant Number
    const pidInput = page.locator('#participant-number-input');
    await pidInput.fill('P002');
    await expect(setupContinueButton).toBeEnabled();
    await setupContinueButton.dispatchEvent('click');

    // 4. LexTALE Vocabulary Test
    for (let i = 0; i < 63; i++) {
      await expect(page.locator(`span:has-text("${i + 1} of 63")`)).toBeVisible();
      await page.locator('button:has-text("YES (Real Word)")').dispatchEvent('click');
    }

    // 5. Early System check (Attention check)
    const systemCheckSubmit = page.locator('button:has-text("Continue")');
    await expect(systemCheckSubmit).toBeDisabled();
    // Select early attention check (choice 3, which is index 2 of 5 options)
    await page.locator('input[name="early_ac"]').nth(2).dispatchEvent('click');
    await expect(systemCheckSubmit).toBeEnabled();
    await systemCheckSubmit.dispatchEvent('click');

    // 6. Assignment screen
    const startReadingButton = page.locator('button:has-text("Start Reading Phase")');
    await expect(startReadingButton).toBeVisible();
    await startReadingButton.dispatchEvent('click');

    // 7. Pre-reading 1 (Topic Familiarity for Passage 1)
    const preContinueButton1 = page.locator('button:has-text("Continue to Text")');
    await preContinueButton1.dispatchEvent('click');

    // 8. Reading 1 (WordAhead condition because Sequence = B)
    const readingPassageContainer = page.locator('div:not(.app-container)[dir="ltr"]');
    await expect(readingPassageContainer).toBeVisible();

    const completeReadingButton1 = page.locator('button:has-text("Continue to Comprehension Questions")');
    await completeReadingButton1.dispatchEvent('click');

    // 9. Quiz 1 (Comprehension MCQs)
    const quizSubmitButton1 = page.locator('button:has-text("Submit Answers & Continue")');
    await expect(quizSubmitButton1).toBeDisabled();

    for (let i = 0; i < 6; i++) {
      await page.locator(`label:has-text("Option A")`).nth(i).dispatchEvent('click');
    }
    await expect(quizSubmitButton1).toBeEnabled();
    await quizSubmitButton1.dispatchEvent('click');

    // 10. Per-Task Survey 1 (Condition: wordahead, Text Format: TF)
    // Verify Block B questions DO render (since WordAhead condition)
    await expect(page.locator('h4:has-text("dependent on translation")')).toBeVisible();

    // Verify Block C questions do NOT render (since Text Format is TF - Full)
    await expect(page.locator('h4:has-text("preserved enough")')).not.toBeVisible();

    const ptSubmitButton1 = page.locator('button:has-text("Submit Survey & Continue")');
    await expect(ptSubmitButton1).toBeDisabled();

    // Answer questions: 9 Block A + 7 Block B = 16 questions total
    const activeKeys1 = [
      'pt_a1', 'pt_a2', 'pt_a3', 'pt_a4', 'pt_a5', 'pt_a6', 'pt_a7', 'pt_a8', 'pt_a9',
      'pt_b11', 'pt_b12', 'pt_b14', 'pt_b15', 'pt_b16', 'pt_b17', 'pt_b18'
    ];
    for (const key of activeKeys1) {
      await page.locator(`input[name="${key}"]`).nth(3).dispatchEvent('click'); // value 4 (index 3)
    }

    await expect(ptSubmitButton1).toBeEnabled();
    await ptSubmitButton1.dispatchEvent('click');

    // 11. Pre-reading 2 (Topic Familiarity for Passage 2)
    const preContinueButton2 = page.locator('button:has-text("Continue to Text")');
    await preContinueButton2.dispatchEvent('click');

    // 12. Reading 2 (Plain condition because Sequence = B)
    const completeReadingButton2 = page.locator('button:has-text("Continue to Comprehension Questions")');
    await completeReadingButton2.dispatchEvent('click');

    // 13. Quiz 2 (Comprehension MCQs)
    const quizSubmitButton2 = page.locator('button:has-text("Submit Answers & Continue")');
    await expect(quizSubmitButton2).toBeDisabled();

    for (let i = 0; i < 6; i++) {
      await page.locator(`label:has-text("Option B")`).nth(i).dispatchEvent('click');
    }
    await expect(quizSubmitButton2).toBeEnabled();
    await quizSubmitButton2.dispatchEvent('click');

    // 14. Per-Task Survey 2 (Condition: plain, Text Format: TF)
    // Verify Block B questions do NOT render
    await expect(page.locator('h4:has-text("dependent on translation")')).not.toBeVisible();

    // Verify Block C questions do NOT render
    await expect(page.locator('h4:has-text("preserved enough")')).not.toBeVisible();

    const ptSubmitButton2 = page.locator('button:has-text("Submit Survey & Continue")');
    await expect(ptSubmitButton2).toBeDisabled();

    // Answer questions: 9 Block A = 9 total
    const activeKeys2 = [
      'pt_a1', 'pt_a2', 'pt_a3', 'pt_a4', 'pt_a5', 'pt_a6', 'pt_a7', 'pt_a8', 'pt_a9'
    ];
    for (const key of activeKeys2) {
      await page.locator(`input[name="${key}"]`).nth(4).dispatchEvent('click'); // value 5 (index 4)
    }

    await expect(ptSubmitButton2).toBeEnabled();
    await ptSubmitButton2.dispatchEvent('click');

    // 15. Post-Study Survey
    const postSubmitButton = page.locator('button:has-text("Submit Feedback & Continue")');
    await expect(postSubmitButton).toBeDisabled();

    await page.locator('input[name="ranking"]').nth(0).dispatchEvent('click');
    await page.locator('textarea').first().fill('Test like comment');
    await page.locator('textarea').last().fill('Test missing comment');

    await page.locator('input[name="ps_use_plain"]').nth(3).dispatchEvent('click');
    await page.locator('input[name="ps_use_wordahead"]').nth(4).dispatchEvent('click');
    await page.locator('input[name="ps_adoption_intent"]').nth(4).dispatchEvent('click');

    await expect(postSubmitButton).toBeEnabled();
    await postSubmitButton.dispatchEvent('click');

    // 15.5 Demographics Screen
    const demoSubmitButton = page.locator('button:has-text("Complete Experiment")');
    await expect(demoSubmitButton).toBeDisabled();

    // Fill demographics
    await page.locator('select').nth(0).selectOption('18_24');
    await page.locator('select').nth(1).selectOption('female');
    await page.locator('select').nth(2).selectOption('Hebrew');
    await page.fill('input[placeholder="e.g. 8"]', '10');
    await page.locator('select').nth(3).selectOption('bachelors');
    await page.locator('input[type="checkbox"]').nth(0).dispatchEvent('click'); // Google Translate
    await page.locator('input[type="checkbox"]').nth(3).dispatchEvent('click'); // DeepL

    // Select self-rated English level (e.g. option 7, which is index 6 of 10 options)
    await page.locator('input[name="demographics_level"]').nth(6).dispatchEvent('click');

    await expect(demoSubmitButton).toBeEnabled();
    await demoSubmitButton.dispatchEvent('click');

    // 16. Completed Screen
    await expect(page.locator('h2:has-text("Thank you for participating!")')).toBeVisible();
    await expect(page.locator('p:has-text("You may now let the researcher know you have finished.")')).toBeVisible();
    await expect(page.locator('a[href*="C10BDQBR"]')).toHaveCount(0);
  });

  test('Walk through pilot flow bypassing exclusion', async ({ page }) => {
    // 1. Mock API calls
    const mockAssignment = {
      prolific_pid: "00",
      lextale_score: 95.0,
      cefr_level: "B2",
      text_format: "TS",
      sequence: "B",
      text_pair: "b2_pair1",
      text_order: ["b2p1_santiago_skimmed", "b2p1_numeracy"],
      is_pilot: true
    };

    const mockTextSession = {
      assignment: mockAssignment,
      texts: {
        b2p1_santiago_skimmed: {
          title: "Mock Passage A3",
          text: "This is a mock academic reading passage to test the WordAhead frontend system.",
          mcqs: Array.from({ length: 5 }, (_, i) => ({
            id: `q_a_${i}`,
            question: `Comprehension Question A ${i + 1}`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correct: 0
          }))
        },
        b2p1_numeracy: {
          title: "Mock Passage B3",
          text: "This is a second mock academic reading passage for the counterbalanced experiment flow.",
          mcqs: Array.from({ length: 5 }, (_, i) => ({
            id: `q_b_${i}`,
            question: `Comprehension Question B ${i + 1}`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correct: 1
          }))
        }
      }
    };

    const mockTokens = {
      tokens: [
        { text: "This", cefr: "A1" },
        { text: " ", cefr: null },
        { text: "is", cefr: "A1" },
        { text: " ", cefr: null },
        { text: "a", cefr: "A1" },
        { text: " ", cefr: null },
        { text: "mock", cefr: "C1", importance: 3 },
        { text: " ", cefr: null },
        { text: "passage", cefr: "B2", importance: 2 },
        { text: ".", cefr: null }
      ]
    };

    await page.route('**/api/experiment/assign', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAssignment) });
    });

    await page.route('**/api/experiment/session/*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockTextSession) });
    });

    await page.route('**/api/analyze', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockTokens) });
    });

    await page.route('**/api/experiment/log_event', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    await page.route('**/api/survey', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    await page.route('**/api/experiment/submit', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, qualtrics_sync: { success: true } }) });
    });

    await page.route('**/api/experiment/check_participant', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true, participant_id: "00" }) });
    });

    // 2. Open page
    await page.goto('/experiment');

    // 3. Consent
    const consentButton = page.locator('button:has-text("Continue")');
    await page.locator('input[type="checkbox"]').dispatchEvent('click');
    await consentButton.dispatchEvent('click');

    // 4. Participant Setup
    const setupContinueButton = page.locator('button:has-text("Continue")');
    const pidInput = page.locator('#participant-number-input');
    await pidInput.fill('00');
    await setupContinueButton.dispatchEvent('click');

    // 4. LexTALE
    for (let i = 0; i < 63; i++) {
      await page.locator('button:has-text("YES (Real Word)")').dispatchEvent('click');
    }

    // 5. Early System check (Attention check)
    const systemCheckSubmit = page.locator('button:has-text("Continue")');
    await expect(systemCheckSubmit).toBeDisabled();
    // Select early attention check (choice 3, which is index 2 of 5 options)
    await page.locator('input[name="early_ac"]').nth(2).dispatchEvent('click');
    await expect(systemCheckSubmit).toBeEnabled();
    await systemCheckSubmit.dispatchEvent('click');

    // 6. Assignment
    const startReadingButton = page.locator('button:has-text("Start Reading Phase")');
    await expect(startReadingButton).toBeVisible();
    await startReadingButton.dispatchEvent('click');

    // 7. Pre-reading 1
    const preContinueButton1 = page.locator('button:has-text("Continue to Text")');
    await preContinueButton1.dispatchEvent('click');

    // 8. Reading 1
    const completeReadingButton1 = page.locator('button:has-text("Continue to Comprehension Questions")');
    await completeReadingButton1.dispatchEvent('click');

    // 9. Quiz 1
    const quizSubmitButton1 = page.locator('button:has-text("Submit Answers & Continue")');
    for (let i = 0; i < 6; i++) {
      await page.locator(`label:has-text("Option A")`).nth(i).dispatchEvent('click');
    }
    await quizSubmitButton1.dispatchEvent('click');

    // 10. Survey 1
    const ptSubmitButton1 = page.locator('button:has-text("Submit Survey & Continue")');
    const activeKeys1 = [
      'pt_a1', 'pt_a2', 'pt_a3', 'pt_a4', 'pt_a5', 'pt_a6', 'pt_a7', 'pt_a8', 'pt_a9',
      'pt_b11', 'pt_b12', 'pt_b14', 'pt_b15', 'pt_b16', 'pt_b17', 'pt_b18',
      'pt_b10', 'pt_c19'
    ];
    for (const key of activeKeys1) {
      await page.locator(`input[name="${key}"]`).nth(3).dispatchEvent('click');
    }
    await ptSubmitButton1.dispatchEvent('click');

    // 11. Pre-reading 2
    const preContinueButton2 = page.locator('button:has-text("Continue to Text")');
    await preContinueButton2.dispatchEvent('click');

    // 12. Reading 2
    const completeReadingButton2 = page.locator('button:has-text("Continue to Comprehension Questions")');
    await completeReadingButton2.dispatchEvent('click');

    // 13. Quiz 2
    const quizSubmitButton2 = page.locator('button:has-text("Submit Answers & Continue")');
    for (let i = 0; i < 6; i++) {
      await page.locator(`label:has-text("Option B")`).nth(i).dispatchEvent('click');
    }
    await quizSubmitButton2.dispatchEvent('click');

    // 14. Survey 2
    const ptSubmitButton2 = page.locator('button:has-text("Submit Survey & Continue")');
    const activeKeys2 = [
      'pt_a1', 'pt_a2', 'pt_a3', 'pt_a4', 'pt_a5', 'pt_a6', 'pt_a7', 'pt_a8', 'pt_a9',
      'pt_b10', 'pt_c19'
    ];
    for (const key of activeKeys2) {
      await page.locator(`input[name="${key}"]`).nth(4).dispatchEvent('click');
    }
    await ptSubmitButton2.dispatchEvent('click');

    // 15. Post Study Survey
    const postSubmitButton = page.locator('button:has-text("Submit Feedback & Continue")');
    await page.locator('input[name="ranking"]').nth(0).dispatchEvent('click');
    await page.locator('textarea').first().fill('Pilot like comment');
    await page.locator('textarea').last().fill('Pilot missing comment');
    await page.locator('input[name="ps_use_plain"]').nth(3).dispatchEvent('click');
    await page.locator('input[name="ps_use_wordahead"]').nth(4).dispatchEvent('click');
    await page.locator('input[name="ps_adoption_intent"]').nth(4).dispatchEvent('click');
    await postSubmitButton.dispatchEvent('click');

    // 15.5 Demographics Screen
    const demoSubmitButton = page.locator('button:has-text("Complete Experiment")');
    await page.locator('select').nth(0).selectOption('18_24');
    await page.locator('select').nth(1).selectOption('female');
    await page.locator('select').nth(2).selectOption('Hebrew');
    await page.fill('input[placeholder="e.g. 8"]', '10');
    await page.locator('select').nth(3).selectOption('bachelors');
    await page.locator('input[type="checkbox"]').nth(0).dispatchEvent('click'); // Google Translate
    await page.locator('input[type="checkbox"]').nth(3).dispatchEvent('click'); // DeepL
    await page.locator('input[name="demographics_level"]').nth(6).dispatchEvent('click');
    await expect(demoSubmitButton).toBeEnabled();
    await demoSubmitButton.dispatchEvent('click');

    // 16. Completed Screen
    await expect(page.locator('h2:has-text("Thank you for participating!")')).toBeVisible();
    await expect(page.locator('text=You may now let the researcher know you have finished.')).toBeVisible();
    await expect(page.locator('a[href*="C10BDQBR"]')).toHaveCount(0);
  });

  test('Mobile Touch Translation Interaction', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.use || !testInfo.project.use.hasTouch, 'Only runs on touch-enabled devices');
    // 1. Mock API calls to isolate from backend
    const mockAssignment = {
      prolific_pid: "mobile_test_pid",
      lextale_score: 85.0,
      cefr_level: "B2",
      text_format: "TS",
      sequence: "B",
      text_pair: "b2_pair1",
      text_order: ["b2p1_santiago_skimmed", "b2p1_numeracy"]
    };

    const mockTextSession = {
      assignment: mockAssignment,
      texts: {
        b2p1_santiago_skimmed: {
          title: "Mock Passage A3",
          text: "This is a mock academic reading passage to test the WordAhead frontend system.",
          mcqs: Array.from({ length: 5 }, (_, i) => ({
            id: `q_a_${i}`,
            question: `Comprehension Question A ${i + 1}`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correct: 0
          }))
        },
        b2p1_numeracy: {
          title: "Mock Passage B3",
          text: "This is a second mock academic reading passage.",
          mcqs: Array.from({ length: 5 }, (_, i) => ({
            id: `q_b_${i}`,
            question: `Comprehension Question B ${i + 1}`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correct: 1
          }))
        }
      }
    };

    const mockTokens = {
      tokens: [
        { text: "This", cefr: "A1" },
        { text: " ", cefr: null },
        { text: "is", cefr: "A1" },
        { text: " ", cefr: null },
        { text: "a", cefr: "A1" },
        { text: " ", cefr: null },
        { text: "mock", cefr: "C1", importance: 3 },
        { text: " ", cefr: null },
        { text: "passage", cefr: "B2", importance: 2 },
        { text: ".", cefr: null }
      ]
    };

    const mockTranslation = {
      translation: "תרגום_מדומה",
      transliteration: "mock_trans",
      part_of_speech: "noun",
      root: "מ-ק",
      root_meaning: "fake",
      example: "This is a mock text."
    };

    await page.route('**/api/experiment/check_participant', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true, participant_id: "P005" }) });
    });

    await page.route('**/api/experiment/assign', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAssignment) });
    });

    await page.route('**/api/experiment/session/*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockTextSession) });
    });

    await page.route('**/api/analyze', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockTokens) });
    });

    await page.route('**/api/translate', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockTranslation) });
    });

    await page.route('**/api/experiment/log_event', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    // Track if any hover events are logged
    let hoverEventLogged = false;
    page.on('request', request => {
      if (request.url().includes('/api/experiment/log_event')) {
        const postData = request.postDataJSON();
        if (postData && postData.event_type === 'hover') {
          hoverEventLogged = true;
        }
      }
    });

    // 2. Open page
    await page.goto('/experiment');

    // 2.5 Consent
    const consentButton = page.locator('button:has-text("Continue")');
    await page.locator('input[type="checkbox"]').dispatchEvent('click');
    await consentButton.dispatchEvent('click');

    // 3. Participant Entry
    const partInput = page.locator('#participant-number-input');
    await expect(partInput).toBeVisible();
    await partInput.fill('P005');
    await page.locator('button:has-text("Continue")').click();

    // 4. LexTALE
    for (let i = 0; i < 63; i++) {
      await page.locator('button:has-text("YES (Real Word)")').dispatchEvent('click');
    }

    // 5. Early System check (Attention check)
    const systemCheckSubmit = page.locator('button:has-text("Continue")');
    await expect(systemCheckSubmit).toBeDisabled();
    // Select early attention check (choice 3, which is index 2 of 5 options)
    await page.locator('input[name="early_ac"]').nth(2).dispatchEvent('click');
    await expect(systemCheckSubmit).toBeEnabled();
    await systemCheckSubmit.dispatchEvent('click');

    // 6. Assignment
    const startReadingButton = page.locator('button:has-text("Start Reading Phase")');
    await expect(startReadingButton).toBeVisible();
    await startReadingButton.dispatchEvent('click');

    // 7. Pre-reading 1
    const preContinueButton1 = page.locator('button:has-text("Continue to Text")');
    await preContinueButton1.dispatchEvent('click');

    // 8. Reading view: Tap a word
    // Find the word 'mock' and tap it (emulated touch interaction)
    const wordMock = page.locator('span.word:has-text("mock")');
    await expect(wordMock).toBeVisible();
    await wordMock.tap();

    // 9. Assert translation panel is visible and displays details
    const translationPanel = page.locator('.translation-panel');
    await expect(translationPanel).toBeVisible();
    await expect(translationPanel).toHaveClass(/has-selection/);
    
    // Check that translation output is present
    await expect(translationPanel.locator('text=תרגום_מדומה')).toBeVisible();
    
    // Verify that NO hover event has been logged during this touch/tap interaction
    expect(hoverEventLogged).toBe(false);
  });

  test('Participant Number Entry Format and Duplicate Validation', async ({ page }) => {
    await page.goto('/experiment');

    // Agree to consent first to reach participant entry
    await page.locator('input[type="checkbox"]').dispatchEvent('click');
    await page.locator('button:has-text("Continue")').dispatchEvent('click');

    const input = page.locator('#participant-number-input');
    const continueBtn = page.locator('button:has-text("Continue")');

    await expect(input).toBeVisible();
    await expect(continueBtn).toBeDisabled();

    // Invalid format: missing P
    await input.fill('001');
    await expect(page.locator('text=Participant number must be the letter P followed by 3 digits')).toBeVisible();
    await expect(continueBtn).toBeDisabled();

    // Invalid format: P000 out of range
    await input.fill('P000');
    await expect(page.locator('text=Participant number must be the letter P followed by 3 digits')).toBeVisible();
    await expect(continueBtn).toBeDisabled();

    // Invalid format: P1000 too many digits
    await input.fill('P1000');
    await expect(page.locator('text=Participant number must be the letter P followed by 3 digits')).toBeVisible();
    await expect(continueBtn).toBeDisabled();

    // Mock duplicate check failure
    await page.route('**/api/experiment/check_participant', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ detail: "This participant number has already been used. Please contact the researcher." })
      });
    });

    // Valid format: P001
    await input.fill('P001');
    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();

    // Verify duplicate error displayed
    await expect(page.locator('text=This participant number has already been used. Please contact the researcher.')).toBeVisible();
  });

  test('Consent Decline Screen Flow', async ({ page }) => {
    await page.goto('/experiment');

    await expect(page.locator('h2:has-text("Research Consent Form")')).toBeVisible();
    const declineBtn = page.locator('button:has-text("Decline")');
    await expect(declineBtn).toBeVisible();

    await declineBtn.click();

    // Verify decline screen shown
    await expect(page.locator('h2:has-text("Participation Declined")')).toBeVisible();
    await expect(page.locator('text=You may now let the researcher know you have finished.')).toBeVisible();

    // Verify participant number input is never reached
    await expect(page.locator('#participant-number-input')).toHaveCount(0);
  });
});

