# InternSift (AI Email Classifier for Cinema Verde)

A Gmail Add-on in active use at Cinema Verde (an environmental film festival in 
Gainesville, FL) that automatically classifies incoming emails as legitimate 
internship inquiries or B2B spam.

## How It Works
- Triggers automatically when opening an email in Gmail
- Runs a fine-tuned DistilBERT model served via FastAPI on Google Cloud Run
- Displays LEGIT or SPAM verdict with confidence score in a sidebar card
- One-click draft reply for legitimate inquiries
- User corrections logged to Google Sheets and fed back into a retraining pipeline

## Results

| Model | F1 | Precision | Recall |
|---|---|---|---|
| TF-IDF + Logistic Regression (baseline) | 0.625 | 0.833 | 0.500 |
| DistilBERT — imbalanced data | 0.947 | 1.000 | 0.900 |
| DistilBERT — loss reweighting | 0.833 | 0.714 | 1.000 |
| DistilBERT — synthetic augmentation | 0.927 | 0.950 | 0.905 |

## Repository Structure
- `classifier.js` — Gmail Add-on (Google Apps Script)
- `appsscript.json` — Add-on configuration and OAuth scopes
- `cloud-run/` — FastAPI app and Dockerfile for the model server
- `CLEAN_final_imbalanced_text_classification_pipeline.ipynb` — ML research pipeline
- `retrain_pipeline.ipynb` — Retraining pipeline from Google Sheets data
- `Cinema Verde Intern_Spam Dataset` — labeled dataset (150 emails)

## Tech Stack
- Google Apps Script, Gmail API
- Google Cloud Run, FastAPI, Docker
- Python, PyTorch, HuggingFace Transformers
- scikit-learn, pandas
- Gemini API (synthetic training data generation)

## Model
Published on Hugging Face: 
[cinema-verde-spam-classifier](https://huggingface.co/evanastevska/cinema-verde-spam-classifier)
