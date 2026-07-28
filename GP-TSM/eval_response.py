import os
import numpy as np
from openai import OpenAI
from difflib import SequenceMatcher
import diff_text

OPTIMAL_LENGTH = 0.6
_openai_client = None

def _get_client():
    global _openai_client
    if _openai_client is None:
        key = os.environ.get("OPENAI_API_KEY", "")
        if key:
            _openai_client = OpenAI(api_key=key)
    return _openai_client

def evaluate_on_meaning(original_paragraph, response, api_key=None):
    '''
    Semantic closeness using OpenAI text-embedding-3-small API model.
    Preserves true neural semantic distance without requiring local MPNet/PyTorch memory.
    '''
    if not original_paragraph or not response:
        return 1.0
    try:
        client = _get_client()
        if not client and api_key:
            client = OpenAI(api_key=api_key)
        if not client:
            p1 = set(original_paragraph.lower().split())
            p2 = set(response.lower().split())
            return len(p1.intersection(p2)) / len(p1) if p1 else 1.0
            
        res = client.embeddings.create(
            model="text-embedding-3-small",
            input=[original_paragraph, response]
        )
        e1 = np.array(res.data[0].embedding)
        e2 = np.array(res.data[1].embedding)
        cos_sim = np.dot(e1, e2) / (np.linalg.norm(e1) * np.linalg.norm(e2))
        return float(cos_sim)
    except Exception as e:
        print(f"Embedding API error in evaluate_on_meaning: {e}")
        p1 = set(original_paragraph.lower().split())
        p2 = set(response.lower().split())
        return len(p1.intersection(p2)) / len(p1) if p1 else 1.0



def evaluate_on_length(original_paragraph, response, optimal_length=None):
  '''
  2nd possible evaluate function that checks the lengths of the shortened sentence
  Could be used to infer whether unnecessary phrases are indeed removed
  Returns: a float (length shortened/length original)
  '''
  target_len = optimal_length if optimal_length is not None else OPTIMAL_LENGTH
  return 1 - abs(len(response)/len(original_paragraph) - target_len)


def evaluate_on_paraphrasing(original_paragraph, response):
  '''
  3rd possible evaluate function that checks the occurences of paraphrasing on a word level
  Returns: a float (# of non-occurences/length original)
  '''
  opcodes = diff_text.diff_text(original_paragraph, response, False)
  rst = 0
  for code in opcodes:
    if code[0] in ['insert', 'replace']:
      rst += 1
  return 1 - rst/len(original_paragraph.split())


# def evaluate_on_grammaticality(response):
#   '''
#   4th possible evaluate function that checks whether the shortened sentence is grammatical
#   Returns: 1 if grammatical, 0 otherwise
#   '''
#   checker = language_tool_python.LanguageTool('en-US')
#   matches = checker.check(response)
#   # checker.close()
#   for match in matches:
#     if match.ruleId not in ['UPPERCASE_SENTENCE_START']:
#       return 0
#   return 1

def composite(original_paragraph, response, grammar_score):
  # print('The composite score is ' + str(A*evaluate_on_meaning(original_paragraph, response) + B*evaluate_on_length(original_paragraph, response) + C*evaluate_on_paraphrasing(original_paragraph, response) + D* evaluate_on_grammaticality(response)))
  # return evaluate_on_meaning(original_paragraph, response) + evaluate_on_length(original_paragraph, response) + grammar_score
   return evaluate_on_length(original_paragraph, response) + grammar_score

def revert_paraphrasing(original_paragraph, response):
  p1 = original_paragraph.split()
  p2 = response.split()
  opcodes = diff_text.diff_text(original_paragraph, response, False)
  rst = ''
  for code in opcodes:
    if code[0] == 'equal':
      rst += (' '.join(p2[code[3]:code[4]]) + ' ')
    elif code[0] == 'replace':
      rst += (' '.join(p1[code[1]:code[2]]) + ' ')
  return rst
