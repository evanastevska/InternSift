from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import pipeline
import os

app = FastAPI()

print("Loading model...")
classifier = pipeline(
    "text-classification",
    model="evanastevska/cinema-verde-spam-classifier",
    truncation=True,
    max_length=256
)
print("Model loaded.")

class EmailRequest(BaseModel):
    sender: str
    subject: str
    body: str

@app.post("/classify")
def classify(req: EmailRequest):
    text = f"Sender: {req.sender} | Subject: {req.subject} | Body: {req.body[:400]}"

    try:
        result = classifier(text)[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    #LABEL_0 = LEGIT, LABEL_1 = SPAM
    verdict = "SPAM" if result["label"] == "LABEL_1" else "LEGIT"
    score = result["score"]

    confidence_note = f"Model confidence: {round(score * 100)}%"

    return {
        "verdict": verdict,
        "extracted_email": "",
        "confidence_note": confidence_note,
        "score": score
    }

@app.get("/health")
def health():
    return {"status": "ok"}