# InternSift — AI Email Classifier for Cinema Verde

A Gmail Add-on that automatically classifies incoming emails as legitimate 
internship inquiries or B2B spam, built during an internship at Cinema Verde, 
an environmental film festival.

## How It Works
- Opens automatically when viewing an email in Gmail
- Calls the Gemini API to classify the email as LEGIT or SPAM
- For legitimate emails, generates a draft reply with one click
- Logs corrections back to a Google Sheet to build a ground truth dataset (data flywheel)

## Repository Structure
- `classifier.js` — Gmail Add-on logic (Google Apps Script)
- `appsscript.json` — Add-on configuration and OAuth scopes
- `spam_classifier.ipynb` — ML research pipeline
- `Cinema Verde Intern_Spam Dataset` — labeled email dataset (150 emails)

## ML Research
To validate and improve the classifier, a 3-part study was conducted on the 
labeled dataset using a fine-tuned DistilBERT model:

| Model | F1 | Precision | Recall |
|---|---|---|---|
| Baseline (imbalanced data) | 0.947 | 1.000 | 0.900 |
| Loss Reweighting | 0.833 | 0.714 | 1.000 |
| Synthetic Data Augmentation | 0.927 | 0.950 | 0.905 |

The synthetic augmentation approach was selected for its balanced precision 
and recall, minimizing false positives on real internship applications.

The trained model is published on Hugging Face:
[cinema-verde-spam-classifier](https://huggingface.co/evanastevska/cinema-verde-spam-classifier)

## Tech Stack
- Google Apps Script, Gmail API
- Gemini API (google-genai)
- Python, PyTorch, HuggingFace Transformers
- scikit-learn, pandas
