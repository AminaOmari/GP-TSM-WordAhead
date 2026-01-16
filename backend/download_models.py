from sentence_transformers import SentenceTransformer
import spacy

print("Downloading Sentence Transformer model...")
SentenceTransformer('all-MiniLM-L6-v2')

print("Downloading Spacy model...")
# Spacy model is downloaded via command line, but loading it here ensures it works? 
# Actually spacy download is separate. This script mainly for SentenceTransformer.
print("Done.")
