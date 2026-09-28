"""
Loads the trained model artifact once and exposes an in-process inference
function so tests can exercise the actual model/vectorizer pipeline without
a running server.

Bundle structure:
  model            : XGBClassifier, features vary depending on TF-IDF preprocessing
  label_encoders   : dict[str, LabelEncoder] - for categorical numeric cols
  target_le        : LabelEncoder - for the target class
  feature_schema   : dict - informational only, not used for inference
  text_vectorizers : dict[str, TfidfVectorizer] - keys: 'text' (*variable*), 'url' (*variable*)
  numeric_features : list[str] - ['timestamp', 'hazard_type', 'hazard_timestamp',
                                   'hazard_location', 'hazard_status', 'source']
  feature_col_map  : dict[str, list[int]] - confirmed column order:
                      numeric_features (0-5) -> text (6-*variable*) -> url (*variable*)
                      
    note: Always check the number of text vectorizers and bundle structure to properly use this Suite. Use test.ipynb
"""
import re
import string
import joblib
import numpy as np
from scipy.sparse import hstack, csr_matrix

MODEL_PATH = "../models/core-model/xgb/checkpoints/optimised_core_xgb_20260926_184719.joblib" # MOST RECENT joblib file after any updates to the model(s)

_bundle = None


def load_bundle(path: str = MODEL_PATH):
    global _bundle
    if _bundle is None:
        _bundle = joblib.load(path)
    return _bundle


def clean_text(text) -> str:
    text = str(text).lower()
    text = re.sub(r"http\S+|www\S+", "", text)
    text = re.sub(r"\d+", "", text)
    text = text.translate(str.maketrans("", "", string.punctuation))
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _encode_numeric_row(bundle, numeric_feature_values: dict) -> np.ndarray:
    """
    Builds the numeric feature row in the exact order bundle['numeric_features']
    expects. Categorical columns (present in bundle['label_encoders']) are run
    through their fitted LabelEncoder; unseen values fall back to '__missing__'
    if that exists, else raise loudly rather than silently corrupt the
    row (see the I-10 in cases).
    """
    numeric_features = bundle["numeric_features"]
    label_encoders = bundle.get("label_encoders", {})
    row = []

    for feat in numeric_features:
        raw_value = numeric_feature_values.get(feat, np.nan)

        if feat in label_encoders:
            le = label_encoders[feat]
            is_missing = raw_value is None or (isinstance(raw_value, float) and np.isnan(raw_value))
            if is_missing:
                if "__missing__" in set(le.classes_):
                    row.append(float(le.transform(["__missing__"])[0]))
                else:
                    row.append(np.nan)
            else:
                known = set(le.classes_)
                str_value = str(raw_value)
                if str_value not in known:
                    if "__missing__" in known:
                        row.append(float(le.transform(["__missing__"])[0]))
                    else:
                        raise ValueError(
                            f"Unseen value '{str_value}' for categorical feature '{feat}' "
                            f"and no '__missing__' fallback exists in this encoder - "
                            f"this mirrors the real inference-time crash risk found in I-10"
                        )
                else:
                    row.append(float(le.transform([str_value])[0]))
        else:
            row.append(float(raw_value) if raw_value is not None else np.nan)

    return np.array([row])


def run_inference(raw_text: str = "", url_text: str = "", numeric_feature_values: dict = None):
    """
    raw_text / url_text: strings for the 'text' and 'url' TF-IDF blocks.
    numeric_feature_values: dict keyed by bundle['numeric_features'] names.
    Categorical entries (hazard_type, source, etc.) should be passed as
    their RAW string value - encoding happens here, not by the caller.
    """
    bundle = load_bundle()
    model = bundle["model"]
    text_vectorizers = bundle["text_vectorizers"]
    numeric_feature_values = numeric_feature_values or {}

    numeric_row = _encode_numeric_row(bundle, numeric_feature_values)

    cleaned_text = clean_text(raw_text)
    cleaned_url = clean_text(url_text)

    text_matrix = text_vectorizers["text"].transform([cleaned_text])
    url_matrix = text_vectorizers["url"].transform([cleaned_url])

    # Confirmed order: numeric -> text -> url
    X = hstack([csr_matrix(numeric_row), text_matrix, url_matrix]).tocsr()

    assert X.shape[1] == model.n_features_in_, (
        f"Constructed matrix has {X.shape[1]} columns, model expects {model.n_features_in_}"
    )

    pred_class = model.predict(X)[0]
    proba = model.predict_proba(X)[0]
    label = bundle["target_le"].inverse_transform([pred_class])[0]

    return {
        "label": label,
        "probability": float(max(proba)),
        "class_probabilities": proba.tolist(),
        "cleaned_text": cleaned_text,
        "cleaned_url": cleaned_url,
        "vocab_hit_counts": {
            "text": int(text_matrix.nnz),
            "url": int(url_matrix.nnz),
        },
    }
