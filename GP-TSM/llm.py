from promptengine.pipelines import PromptPipeline
from promptengine.template import PromptTemplate, PromptPermutationGenerator
from promptengine.utils import LLM, extract_responses, is_valid_filepath
import eval_response
import json
import re
import os
import concurrent.futures
import threading
import uuid

MAX_DEPTH = 4 # Restored to 4 to match backend expectation of l4 (Importance 4)
TEMPERATURE = 0.8
N = 2 # Restored to 2 to ensure quality selection (Best of N)

GRAMMER_SCORE_RULE = {'A': 1, 'B': 0.5, 'C': 0}

UK_LAW_SYSTEM_MESSAGE = "You are an expert legal assistant. Your goal is to reveal the core legal structure. You MUST aggressively delete specific dates, locations, and citations as they are considered noise here. However, you must PRESERVE legal terms of art (e.g., 'common ground', 'proprietor', 'registered') and the logical flow of the argument. Focus on the main legal action."

EXTRACTIVE_SHORTENER_PROMPT_TEMPLATE = \
"""For each sentence in the following paragraph from a legal document, delete phrases that are not the main subject, verb, or object of the sentence, or key modifiers/ terms, while preserving the main meaning of the sentence as much as possible. Be aggressive in removing parentheticals, attached clauses, and details about dates/ location. The length of the result should be at most 80 percent of the original length (you must delete at least 20% of the text). Important: Please make sure the result remains grammatical!!
"${paragraph}"

Please do not add any new words or change words, only delete words."""

EXTRACTIVE_SHORTENER_PROMPT_TEMPLATE_AGGRESSIVE = \
"""For each sentence in the following paragraph from a legal document, delete phrases that are not the main subject, verb, or object of the sentence, or key modifiers/ terms, while preserving the main meaning of the sentence as much as possible. Be more aggressive in removing parentheticals, attached clauses, and details about dates/ location. The length of the result should be at most 70 percent of the original length (you must delete at least 30% of the text). Important: Please make sure the result remains grammatical!!
"${paragraph}"

Please do not add any new words or change words, only delete words."""

GRAMMAR_CHECKER_PROMPT_TEMPLATE = \
"""Score the following paragraph from a legal document by how grammatical it is. Be strict in your evaluation - only mark as A if the text is fully grammatically correct with proper sentence structure, subject-verb agreement, and correct word order.
"${paragraph}"

Answer A for grammatically correct, B for moderately grammatical (minor issues), and C for bad grammar (major grammatical errors). Only respond with one letter."""

# PromptPipeline that runs the 'extractive shortner' prompt, and cache's responses.
class ExtractiveShortenerPromptPipeline(PromptPipeline):
    def __init__(self, use_aggressive=False, storageFile='shortened_responses.json'):
        if use_aggressive:
            self._template = PromptTemplate(EXTRACTIVE_SHORTENER_PROMPT_TEMPLATE_AGGRESSIVE)
        else:
            self._template = PromptTemplate(EXTRACTIVE_SHORTENER_PROMPT_TEMPLATE)
        super().__init__(storageFile)
    def gen_prompts(self, properties):
        gen_prompts = PromptPermutationGenerator(self._template)
        return list(gen_prompts({
            "paragraph": properties["paragraph"]
        }))
    
# PromptPipeline that runs the 'grammar checker' prompt, and cache's responses.
class GrammarCheckerPromptPipeline(PromptPipeline):
    def __init__(self, storageFile='grammar_checks.json'):
        self._template = PromptTemplate(GRAMMAR_CHECKER_PROMPT_TEMPLATE)
        super().__init__(storageFile)
    def gen_prompts(self, properties):
        gen_prompts = PromptPermutationGenerator(self._template)
        return list(gen_prompts({
            "paragraph": properties["paragraph"]
        }))

# Helper functions
def strip_wrapping_quotes(s: str) -> str:
    if len(s) > 0 and s[0] == '"': s = s[1:]
    if len(s) > 0 and s[-1] == '"': s = s[0:-1]
    return s

def find_score(score):
    """Extract the grammar score letter (A, B, or C) from the LLM response."""
    score = score.strip().upper()
    if 'Answer' in score:
        score = score.split('Answer', 1)[-1].strip()
        if score.startswith(':'):
            score = score[1:].strip()
    
    import re
    match = re.search(r'\b([ABC])\b', score)
    if match:
        return match.group(1)
    
    if score and score[0] in ['A', 'B', 'C']:
        return score[0]
    return score

def for_viz(lst): #prepare data for the viz code in app.py
    # Adapt to variable depth if needed, but for now assumption is consistent depth
    # If list is shorter than expected, we handle it
    
    # backend/main.py expects keys '0' to '4' explicitly.
    TARGET_DEPTH = 4
    
    rst = [{str(i): lst[i] for i in range(len(lst))}]
    
    # Fill remaining depths with last result (if stopped early)
    last_val = lst[-1] if lst else ""
    for j in range(len(lst), TARGET_DEPTH + 1):
        rst[0][str(j)] = last_val
    
    return rst

def _split_into_sentences(text):
    """Split text into sentences using simple regex-based approach."""
    sentences = re.split(r'([.!?]+(?:\s+|$))', text)
    result = []
    for i in range(0, len(sentences) - 1, 2):
        if i + 1 < len(sentences):
            sentence = sentences[i] + sentences[i + 1]
        else:
            sentence = sentences[i]
        sentence = sentence.strip()
        if sentence:
            result.append(sentence)
    if len(sentences) % 2 == 1 and sentences[-1].strip():
        result.append(sentences[-1].strip())
    return result if result else [text]

def _calculate_smooth_aggressiveness(word_count):
    min_length = 20
    max_length = 80
    if word_count <= min_length:
        aggressiveness = 0.0
    elif word_count >= max_length:
        aggressiveness = 1.0
    else:
        aggressiveness = (word_count - min_length) / (max_length - min_length)
    smooth_aggressiveness = aggressiveness * aggressiveness * (3 - 2 * aggressiveness)
    return smooth_aggressiveness

def _get_parameters_for_aggressiveness(smooth_aggressiveness):
    current_temperature = TEMPERATURE
    current_n = N
    optimal_length = 0.6 - (0.6 - 0.5) * smooth_aggressiveness
    use_aggressive = smooth_aggressiveness > 0.5
    return current_temperature, current_n, optimal_length, use_aggressive

def process_single_sentence(sentence, k, system_message=None):
    """Process a single sentence with its own temporary cache to be thread-safe."""
    sentence = sentence.strip()
    if not sentence:
        return [sentence]

    # Calculate aggressiveness
    word_count = len(sentence.split())
    smooth_aggressiveness = _calculate_smooth_aggressiveness(word_count)
    current_temperature, current_n, optimal_length, use_aggressive = _get_parameters_for_aggressiveness(smooth_aggressiveness)

    # Use unique temporary files for this thread/sentence to avoid race conditions
    unique_id = uuid.uuid4()
    temp_shortner_file = f"temp_short_{unique_id}.json"
    temp_grammar_file = f"temp_grammar_{unique_id}.json"

    try:
        # Initialize thread-local pipelines
        extractive_shortener = ExtractiveShortenerPromptPipeline(use_aggressive=use_aggressive, storageFile=temp_shortner_file)
        grammar_checker = GrammarCheckerPromptPipeline(storageFile=temp_grammar_file)

        cur_depth = 0
        best_responses = [sentence]
        paragraph = sentence
        orig_sentence = sentence

        while cur_depth < MAX_DEPTH:
            responses = []
            # We don't cache deeply, just use the temp file mechanism 
            extractive_shortener.clear_cached_responses()
            
            for res in extractive_shortener.gen_responses({"paragraph": paragraph}, LLM.ChatGPT, n=current_n, temperature=current_temperature, api_key=k, system_message=system_message):
                responses.extend(extract_responses(res, llm=LLM.ChatGPT))
            
            responses = [strip_wrapping_quotes(r) for r in responses]
            response_infos = []
            
            for response in responses:
                reverted = eval_response.revert_paraphrasing(paragraph, response)
                grammar_scores = []
                grammar_checker.clear_cached_responses()
                for score in grammar_checker.gen_responses({"paragraph": reverted}, LLM.ChatGPT, n=1, api_key=k):
                    grammar_scores.extend(extract_responses(score, llm=LLM.ChatGPT))
                
                grammar_letter = find_score(grammar_scores[0]) if grammar_scores else 'C'
                grammar_score = GRAMMER_SCORE_RULE.get(grammar_letter, 0)
                
                grammar_penalty = 0
                if grammar_letter == 'C': grammar_penalty = -2.0
                elif grammar_letter == 'B': grammar_penalty = -0.3
                
                semantic_score = eval_response.evaluate_on_meaning(orig_sentence, reverted)
                paraphrase_score = eval_response.evaluate_on_paraphrasing(paragraph, response)
                
                # IMPORTANT: Pass optimal_length expressly!
                length_score = eval_response.evaluate_on_length(paragraph, reverted, optimal_length=optimal_length)
                
                # Scoring logic
                if smooth_aggressiveness > 0.1:
                    length_reduction = 1 - (len(reverted) / len(paragraph)) if len(paragraph) > 0 else 0
                    length_bonus = length_reduction * 0.3 * smooth_aggressiveness
                    conservative_score = semantic_score + (grammar_score * 1.5) + paraphrase_score + length_score + grammar_penalty
                    aggressive_score = (semantic_score * 0.3) + (grammar_score * 0.6) + (paraphrase_score * 0.15) + (length_score * 0.4) + length_bonus + grammar_penalty
                    composite_score = conservative_score * (1 - smooth_aggressiveness) + aggressive_score * smooth_aggressiveness
                else:
                    composite_score = semantic_score + (grammar_score * 2.0) + paraphrase_score + length_score + grammar_penalty
                
                response_infos.append({
                    "response": response,
                    "reverted": reverted,
                    "grammar_score": grammar_score,
                    "grammar_letter": grammar_letter,
                    "composite_score": composite_score
                })
            
            # Filter
            has_a = any(info['grammar_letter'] == 'A' for info in response_infos)
            has_b = any(info['grammar_letter'] == 'B' for info in response_infos)
            if has_a: response_infos = [info for info in response_infos if info['grammar_letter'] == 'A']
            elif has_b: response_infos = [info for info in response_infos if info['grammar_letter'] == 'B']
            
            response_infos.sort(key=lambda x: x["composite_score"], reverse=True)
            
            if not response_infos: break
            best_response = response_infos[0]
            
             # Final grammar check
            if best_response.get('grammar_letter') == 'C' and len(response_infos) > 1:
                better_grammar_responses = [info for info in response_infos if info.get('grammar_letter') in ['A', 'B']]
                if better_grammar_responses:
                    better_grammar_responses.sort(key=lambda x: (x.get('grammar_letter') != 'A', -x["composite_score"]))
                    best_response = better_grammar_responses[0]

            cur_depth += 1
            
            # Stopping conditions
            if smooth_aggressiveness > 0.3:
                original_len = len(paragraph.split())
                new_len = len(best_response['reverted'].split())
                reduction_ratio = (original_len - new_len) / original_len if original_len > 0 else 0
                min_reduction_ratio = 0.01 + 0.01 * smooth_aggressiveness
                min_words_removed = int(3 + 2 * smooth_aggressiveness)
                
                if reduction_ratio < min_reduction_ratio and (original_len - new_len) < min_words_removed:
                     if len(response_infos) > 1:
                        next_best = response_infos[1] # Simple retry logic
                        if len(next_best['reverted']) < len(best_response['reverted']):
                             best_response = next_best # Just take smaller if primary failed to reduce

                if reduction_ratio < (min_reduction_ratio * 0.5) and (original_len - new_len) < (min_words_removed - 1) and cur_depth > 1:
                    break 
            else:
                original_word_count = len(paragraph.split())
                new_word_count = len(best_response['reverted'].split())
                if original_word_count == new_word_count and cur_depth > 1:
                    break
            
            best_responses.append(best_response['reverted'])
            paragraph = best_response["reverted"]

        return best_responses

    finally:
        # Cleanup temp files
        if os.path.exists(temp_shortner_file):
            try: os.remove(temp_shortner_file)
            except: pass
        if os.path.exists(temp_grammar_file):
            try: os.remove(temp_grammar_file)
            except: pass


def get_shortened_paragraph(orig_paragraph, k, system_message: str = None):
    # Validate API key
    if not k or not k.strip():
        raise ValueError("API key is required but was not provided or is empty.")
    k = k.strip()
    
    # Split paragraph into sentences
    sentences = _split_into_sentences(orig_paragraph)
    
    # Parallel execution using ThreadPoolExecutor
    # Workers count: 8 seems reasonable for I/O bound tasks
    shortened_sentences = []
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        # Map returns results in the order of input iterable
        future_results = executor.map(lambda s: process_single_sentence(s, k, system_message), sentences)
        shortened_sentences = list(future_results)
    
    # Combine shortened sentences back into paragraph format
    max_sentence_depth = max(len(sent_results) for sent_results in shortened_sentences) if shortened_sentences else 1
    
    combined_responses = []
    for depth in range(max_sentence_depth):
        combined_paragraph = []
        for sent_results in shortened_sentences:
            depth_idx = min(depth, len(sent_results) - 1)
            combined_paragraph.append(sent_results[depth_idx])
        combined_responses.append(' '.join(combined_paragraph))
    
    return for_viz(combined_responses)
