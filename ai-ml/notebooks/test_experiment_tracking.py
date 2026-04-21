import sys
from pathlib import Path

# Make project root visible to Python
sys.path.append(str(Path(__file__).resolve().parents[1]))

import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score

from utils.experiment_tracker import ExperimentTracker


# Load dataset
data_path = Path("datasets/disaster_tweets.csv")
df = pd.read_csv(
    data_path,
    encoding="ISO-8859-1",
    engine="python",
    on_bad_lines="skip"
)

print("Dataset loaded successfully")
print(df.head())
print("Columns in dataset:", df.columns.tolist())


# Keep only rows with useful labels
df = df[df["choose_one"].isin(["Relevant", "Not Relevant"])].copy()

# Drop rows with missing text
df = df.dropna(subset=["text"])

X = df["text"]
y = df["choose_one"].map({
    "Relevant": 1,
    "Not Relevant": 0
})

print("Filtered dataset size:", len(df))
print("Class distribution:")
print(y.value_counts())


# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)


# Convert text into numeric features
vectorizer = TfidfVectorizer(max_features=5000, stop_words="english")
X_train_vec = vectorizer.fit_transform(X_train)
X_test_vec = vectorizer.transform(X_test)


# Train model
model = LogisticRegression(max_iter=200)
model.fit(X_train_vec, y_train)


# Predictions
preds = model.predict(X_test_vec)

accuracy = accuracy_score(y_test, preds)
f1 = f1_score(y_test, preds)

print("Accuracy:", accuracy)
print("F1 Score:", f1)


# Track experiment
tracker = ExperimentTracker()

tracker.start_run(
    experiment_name="disaster_tweet_classifier",
    model_name="logistic_regression",
    dataset_name="disaster_tweets.csv",
    parameters={
        "model": "LogisticRegression",
        "max_iter": 200,
        "test_size": 0.2,
        "vectorizer": "TfidfVectorizer",
        "max_features": 5000,
        "stop_words": "english",
        "stratify": True
    },
    version="v1"
)

tracker.log_metrics({
    "accuracy": float(accuracy),
    "f1_score": float(f1)
})

tracker.log_artifact("models/disaster_model.pkl")
tracker.end_run("completed")

print("Experiment tracking completed successfully")