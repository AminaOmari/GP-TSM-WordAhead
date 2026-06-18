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
      text_pair: "pair_3",
      text_order: ["textA3", "textB3"]
    };

    const mockTextSession = {
      assignment: mockAssignment,
      texts: {
        textA3: {
          title: "Mock Passage A3",
          text: "This is a mock academic reading passage to test the WordAhead frontend system.",
          mcqs: Array.from({ length: 5 }, (_, i) => ({
            id: `q_a_${i}`,
            question: `Comprehension Question A ${i + 1}`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correct: 0
          }))
        },
        textB3: {
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

    // 2. Open the page
    await page.goto('/');

    // Check Hebrew UI elements direction (RTL container)
    const appContainer = page.locator('.app-container');
    await expect(appContainer).toHaveAttribute('dir', 'rtl');

    // 3. Consent Page Check
    const consentButton = page.locator('button:has-text("I Consent & Agree to Participate")');
    await expect(consentButton).toBeDisabled(); // Should be disabled if input is empty

    // Enter Prolific ID
    const pidInput = page.locator('input[placeholder="Enter your Prolific ID"]');
    await pidInput.fill('test_pid_pw');
    await expect(consentButton).toBeEnabled();

    // Click Consent & go to LexTALE
    await consentButton.dispatchEvent('click');

    // 4. LexTALE Vocabulary Test
    // Perform YES click 63 times for the vocabulary items
    for (let i = 0; i < 63; i++) {
      // Wait for the counter to display the current question index (i + 1)
      await expect(page.locator(`span:has-text("${i + 1} of 63")`)).toBeVisible();
      await page.locator('button:has-text("YES (Real Word)")').dispatchEvent('click');
    }

    // 5. Demographics Screen
    // Gating blocks should prevent submission until required elements are filled.
    const demoSubmitButton = page.locator('button:has-text("Complete Experiment")');
    await expect(demoSubmitButton).toBeDisabled();

    // Fill demographics using index-based select options to be locale-independent
    await page.locator('select').nth(0).selectOption('18_24');
    await page.locator('select').nth(1).selectOption('female');
    await page.locator('select').nth(2).selectOption('Hebrew');
    await page.fill('input[placeholder="e.g. 8"]', '10');
    await page.locator('select').nth(3).selectOption('undergrad');
    await page.fill('input[placeholder="e.g. 1st Year, 2nd Year, etc."]', '2nd Year');
    await page.fill('input[placeholder="e.g. Computer Science, Medicine"]', 'Biology');

    // Make sure Attention check is selected (e.g. choice 3, which is index 2 of 5 options)
    const acRadio = page.locator('input[name="demographics_ac"]').nth(2);
    await acRadio.dispatchEvent('click');

    // Select self-rated English level (e.g. option 7, which is index 6 of 10 options)
    await page.locator('input[name="demographics_level"]').nth(6).dispatchEvent('click');

    // Verify it is enabled now
    await expect(demoSubmitButton).toBeEnabled();
    await demoSubmitButton.dispatchEvent('click');

    // 6. Assignment screen
    const startReadingButton = page.locator('button:has-text("Start Reading Phase")');
    await expect(startReadingButton).toBeVisible();
    await startReadingButton.dispatchEvent('click');

    // 7. Pre-reading 1 (Topic Familiarity for Passage 1)
    const preContinueButton1 = page.locator('button:has-text("המשך לטקסט")');
    // Select familiarity option 4 (which is index 3 of 7 options)
    await page.locator('input[name="pre_reading_exposure_1"]').nth(3).dispatchEvent('click');
    await preContinueButton1.dispatchEvent('click');

    // 8. Reading 1 (WordAhead condition because Sequence = B)
    // Verify LTR direction for English text passage container
    const readingPassageContainer = page.locator('div[dir="ltr"]');
    await expect(readingPassageContainer).toBeVisible();

    const completeReadingButton1 = page.locator('button:has-text("Continue to Comprehension Questions")');
    await completeReadingButton1.dispatchEvent('click');

    // 9. Quiz 1 (Comprehension MCQs)
    // Verify LTR direction for English questions container
    const quizContainer = page.locator('div[dir="ltr"]');
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
    // Look for a Block B specific question (which is translated to Hebrew - pt_b10 has "להאפיר")
    await expect(page.locator('h4:has-text("להאפיר")')).toBeVisible();

    // Verify Block C questions render (since Text Format is TS - Skimmed, pt_c19 has "מקוצרת")
    await expect(page.locator('h4:has-text("מקוצרת")')).toBeVisible();

    // Click submit should be disabled initially
    const ptSubmitButton1 = page.locator('button:has-text("הגש סקר")');
    await expect(ptSubmitButton1).toBeDisabled();

    // Answer all questions
    // Likert scales are 1-7, attention check is ac_mid (value 7, index 6)
    // There are 9 Block A + 9 Block B + 1 Block C = 19 questions + 1 attention check = 20 total
    for (let i = 1; i <= 9; i++) {
      await page.locator(`input[name="pt_a${i}"]`).nth(3).dispatchEvent('click'); // value 4 (index 3)
    }
    for (let i = 10; i <= 18; i++) {
      await page.locator(`input[name="pt_b${i}"]`).nth(3).dispatchEvent('click'); // value 4 (index 3)
    }
    await page.locator('input[name="pt_c19"]').nth(3).dispatchEvent('click'); // value 4 (index 3)

    await expect(ptSubmitButton1).toBeEnabled();
    await ptSubmitButton1.dispatchEvent('click');

    // 11. Pre-reading 2 (Topic Familiarity for Passage 2)
    const preContinueButton2 = page.locator('button:has-text("המשך לטקסט")');
    await page.locator('input[name="pre_reading_exposure_2"]').nth(4).dispatchEvent('click'); // value 5 (index 4)
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
    // Verify Block B questions do NOT render (since plain condition, pt_b10 has "להאפיר")
    await expect(page.locator('h4:has-text("להאפיר")')).not.toBeVisible();

    // Verify Block C questions DO render (since TS format, pt_c19 has "מקוצרת")
    await expect(page.locator('h4:has-text("מקוצרת")')).toBeVisible();

    const ptSubmitButton2 = page.locator('button:has-text("הגש סקר")');
    await expect(ptSubmitButton2).toBeDisabled();

    // Answer questions: 9 Block A + 1 Block C = 10 questions total
    for (let i = 1; i <= 9; i++) {
      await page.locator(`input[name="pt_a${i}"]`).nth(4).dispatchEvent('click'); // value 5 (index 4)
    }
    await page.locator('input[name="pt_c19"]').nth(4).dispatchEvent('click'); // value 5 (index 4)

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

    await expect(postSubmitButton).toBeEnabled();
    await postSubmitButton.dispatchEvent('click');

    // 16. Completed Screen
    // Verify Prolific redirect URL with correct code C10BDQBR
    const prolificLink = page.locator('a[href*="C10BDQBR"]');
    await expect(prolificLink).toBeVisible();
    await expect(prolificLink).toHaveAttribute('href', 'https://app.prolific.co/submissions/complete?cc=C10BDQBR');
  });

  test('Walk through complete participant flow with Sequence B and TF format', async ({ page }) => {
    // 1. Mock API calls to isolate from backend database and configuration changes
    const mockAssignment = {
      prolific_pid: "test_pid_pw_tf",
      lextale_score: 75.0,
      cefr_level: "B2",
      text_format: "TF",  // Full Text format (Block C should NOT render)
      sequence: "B",     // Sequence B (Trial 1 = wordahead, Trial 2 = plain)
      text_pair: "pair_3",
      text_order: ["textA3", "textB3"]
    };

    const mockTextSession = {
      assignment: mockAssignment,
      texts: {
        textA3: {
          title: "Mock Passage A3",
          text: "This is a mock academic reading passage to test the WordAhead frontend system.",
          mcqs: Array.from({ length: 5 }, (_, i) => ({
            id: `q_a_${i}`,
            question: `Comprehension Question A ${i + 1}`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correct: 0
          }))
        },
        textB3: {
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

    // 2. Open the page
    await page.goto('/');

    // Check Hebrew UI elements direction (RTL container)
    const appContainer = page.locator('.app-container');
    await expect(appContainer).toHaveAttribute('dir', 'rtl');

    // 3. Consent Page Check
    const consentButton = page.locator('button:has-text("I Consent & Agree to Participate")');
    await expect(consentButton).toBeDisabled();

    // Enter Prolific ID
    const pidInput = page.locator('input[placeholder="Enter your Prolific ID"]');
    await pidInput.fill('test_pid_pw_tf');
    await expect(consentButton).toBeEnabled();

    // Click Consent & go to LexTALE
    await consentButton.dispatchEvent('click');

    // 4. LexTALE Vocabulary Test
    for (let i = 0; i < 63; i++) {
      await expect(page.locator(`span:has-text("${i + 1} of 63")`)).toBeVisible();
      await page.locator('button:has-text("YES (Real Word)")').dispatchEvent('click');
    }

    // 5. Demographics Screen
    const demoSubmitButton = page.locator('button:has-text("Complete Experiment")');
    await expect(demoSubmitButton).toBeDisabled();

    // Fill demographics
    await page.locator('select').nth(0).selectOption('18_24');
    await page.locator('select').nth(1).selectOption('female');
    await page.locator('select').nth(2).selectOption('Hebrew');
    await page.fill('input[placeholder="e.g. 8"]', '10');
    await page.locator('select').nth(3).selectOption('undergrad');
    await page.fill('input[placeholder="e.g. 1st Year, 2nd Year, etc."]', '2nd Year');
    await page.fill('input[placeholder="e.g. Computer Science, Medicine"]', 'Biology');

    // Early attention check
    const acRadio = page.locator('input[name="demographics_ac"]').nth(2);
    await acRadio.dispatchEvent('click');

    // Select self-rated English level (e.g. option 7, which is index 6 of 10 options)
    await page.locator('input[name="demographics_level"]').nth(6).dispatchEvent('click');

    await expect(demoSubmitButton).toBeEnabled();
    await demoSubmitButton.dispatchEvent('click');

    // 6. Assignment screen
    const startReadingButton = page.locator('button:has-text("Start Reading Phase")');
    await expect(startReadingButton).toBeVisible();
    await startReadingButton.dispatchEvent('click');

    // 7. Pre-reading 1 (Topic Familiarity for Passage 1)
    const preContinueButton1 = page.locator('button:has-text("המשך לטקסט")');
    await page.locator('input[name="pre_reading_exposure_1"]').nth(3).dispatchEvent('click');
    await preContinueButton1.dispatchEvent('click');

    // 8. Reading 1 (WordAhead condition because Sequence = B)
    const readingPassageContainer = page.locator('div[dir="ltr"]');
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
    await expect(page.locator('h4:has-text("להאפיר")')).toBeVisible();

    // Verify Block C questions do NOT render (since Text Format is TF - Full)
    await expect(page.locator('h4:has-text("מקוצרת")')).not.toBeVisible();

    const ptSubmitButton1 = page.locator('button:has-text("הגש סקר")');
    await expect(ptSubmitButton1).toBeDisabled();

    // Answer questions: 9 Block A + 9 Block B = 18 questions total
    for (let i = 1; i <= 9; i++) {
      await page.locator(`input[name="pt_a${i}"]`).nth(3).dispatchEvent('click'); // value 4 (index 3)
    }
    for (let i = 10; i <= 18; i++) {
      await page.locator(`input[name="pt_b${i}"]`).nth(3).dispatchEvent('click'); // value 4 (index 3)
    }

    await expect(ptSubmitButton1).toBeEnabled();
    await ptSubmitButton1.dispatchEvent('click');

    // 11. Pre-reading 2 (Topic Familiarity for Passage 2)
    const preContinueButton2 = page.locator('button:has-text("המשך לטקסט")');
    await page.locator('input[name="pre_reading_exposure_2"]').nth(4).dispatchEvent('click');
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
    await expect(page.locator('h4:has-text("להאפיר")')).not.toBeVisible();

    // Verify Block C questions do NOT render
    await expect(page.locator('h4:has-text("מקוצרת")')).not.toBeVisible();

    const ptSubmitButton2 = page.locator('button:has-text("הגש סקר")');
    await expect(ptSubmitButton2).toBeDisabled();

    // Answer questions: 9 Block A = 9 total
    for (let i = 1; i <= 9; i++) {
      await page.locator(`input[name="pt_a${i}"]`).nth(4).dispatchEvent('click'); // value 5 (index 4)
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

    await expect(postSubmitButton).toBeEnabled();
    await postSubmitButton.dispatchEvent('click');

    // 16. Completed Screen
    const prolificLink = page.locator('a[href*="C10BDQBR"]');
    await expect(prolificLink).toBeVisible();
    await expect(prolificLink).toHaveAttribute('href', 'https://app.prolific.co/submissions/complete?cc=C10BDQBR');
  });

  test('Walk through pilot flow bypassing exclusion', async ({ page }) => {
    // 1. Mock API calls
    const mockAssignment = {
      prolific_pid: "00",
      lextale_score: 95.0,
      cefr_level: "exclude",
      text_format: "TS",
      sequence: "B",
      text_pair: "pair_3",
      text_order: ["textA3", "textB3"],
      is_pilot: true
    };

    const mockTextSession = {
      assignment: mockAssignment,
      texts: {
        textA3: {
          title: "Mock Passage A3",
          text: "This is a mock academic reading passage to test the WordAhead frontend system.",
          mcqs: Array.from({ length: 5 }, (_, i) => ({
            id: `q_a_${i}`,
            question: `Comprehension Question A ${i + 1}`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correct: 0
          }))
        },
        textB3: {
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

    // 2. Open page
    await page.goto('/');

    // 3. Consent
    const consentButton = page.locator('button:has-text("I Consent & Agree to Participate")');
    const pidInput = page.locator('input[placeholder="Enter your Prolific ID"]');
    await pidInput.fill('00');
    await consentButton.dispatchEvent('click');

    // 4. LexTALE
    for (let i = 0; i < 63; i++) {
      await page.locator('button:has-text("YES (Real Word)")').dispatchEvent('click');
    }

    // 5. Demographics (Should bypass exclusion screen and show demographics)
    const demoSubmitButton = page.locator('button:has-text("Complete Experiment")');
    await page.locator('select').nth(0).selectOption('18_24');
    await page.locator('select').nth(1).selectOption('female');
    await page.locator('select').nth(2).selectOption('Hebrew');
    await page.fill('input[placeholder="e.g. 8"]', '10');
    await page.locator('select').nth(3).selectOption('undergrad');
    await page.fill('input[placeholder="e.g. 1st Year, 2nd Year, etc."]', '2nd Year');
    await page.fill('input[placeholder="e.g. Computer Science, Medicine"]', 'Biology');

    const acRadio = page.locator('input[name="demographics_ac"]').nth(2);
    await acRadio.dispatchEvent('click');

    await page.locator('input[name="demographics_level"]').nth(6).dispatchEvent('click');

    await expect(demoSubmitButton).toBeEnabled();
    await demoSubmitButton.dispatchEvent('click');

    // 6. Assignment
    const startReadingButton = page.locator('button:has-text("Start Reading Phase")');
    await expect(startReadingButton).toBeVisible();
    await startReadingButton.dispatchEvent('click');

    // 7. Pre-reading 1
    const preContinueButton1 = page.locator('button:has-text("המשך לטקסט")');
    await page.locator('input[name="pre_reading_exposure_1"]').nth(3).dispatchEvent('click');
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
    const ptSubmitButton1 = page.locator('button:has-text("הגש סקר")');
    for (let i = 1; i <= 9; i++) {
      await page.locator(`input[name="pt_a${i}"]`).nth(3).dispatchEvent('click');
    }
    for (let i = 10; i <= 18; i++) {
      await page.locator(`input[name="pt_b${i}"]`).nth(3).dispatchEvent('click');
    }
    await page.locator('input[name="pt_c19"]').nth(3).dispatchEvent('click');
    await ptSubmitButton1.dispatchEvent('click');

    // 11. Pre-reading 2
    const preContinueButton2 = page.locator('button:has-text("המשך לטקסט")');
    await page.locator('input[name="pre_reading_exposure_2"]').nth(4).dispatchEvent('click');
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
    const ptSubmitButton2 = page.locator('button:has-text("הגש סקר")');
    for (let i = 1; i <= 9; i++) {
      await page.locator(`input[name="pt_a${i}"]`).nth(4).dispatchEvent('click');
    }
    await page.locator('input[name="pt_c19"]').nth(4).dispatchEvent('click');
    await ptSubmitButton2.dispatchEvent('click');

    // 15. Post Study Survey
    const postSubmitButton = page.locator('button:has-text("Submit Feedback & Continue")');
    await page.locator('input[name="ranking"]').nth(0).dispatchEvent('click');
    await page.locator('textarea').first().fill('Pilot like comment');
    await page.locator('textarea').last().fill('Pilot missing comment');
    await page.locator('input[name="ps_use_plain"]').nth(3).dispatchEvent('click');
    await page.locator('input[name="ps_use_wordahead"]').nth(4).dispatchEvent('click');
    await postSubmitButton.dispatchEvent('click');

    // 16. Completed Screen
    await expect(page.locator('h2:has-text("Pilot / Demo Completed!")')).toBeVisible();
    await expect(page.locator('a:has-text("Optional Prolific Redirect")')).toBeVisible();
  });
});
