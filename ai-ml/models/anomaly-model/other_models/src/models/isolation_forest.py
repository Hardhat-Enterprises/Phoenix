import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


class AI012IsolationForest:
    def __init__(self, contamination=0.05, random_state=42):
        self.contamination = contamination
        self.random_state = random_state
        self.classes_ = np.array([0, 1])
        self.scaler = StandardScaler()
        self.model = IsolationForest(
            n_estimators=150,
            contamination=contamination,
            random_state=random_state,
            n_jobs=-1
        )
        self.feature_columns = None

    def prepare_features(self, X):
        if isinstance(X, pd.DataFrame):
            exclude_columns = [
                "event_id", "timestamp", "region", "location",
                "hazard_type", "threat_type", "anomaly_label",
                "anomaly_flag", "anomaly_score", "anomaly_rank",
                "dummy_target"
            ]

            X = X.drop(
                columns=[c for c in exclude_columns if c in X.columns],
                errors="ignore"
            )

            X = X.select_dtypes(include=[np.number]).copy()
            X = X.replace([np.inf, -np.inf], np.nan)
            X = X.fillna(X.median(numeric_only=True))

            if self.feature_columns is None:
                self.feature_columns = list(X.columns)
            else:
                X = X.reindex(columns=self.feature_columns, fill_value=0)

            return X

        return np.asarray(X)

    def fit(self, X, y=None):
        X = self.prepare_features(X)
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled)
        return self

    def train(self, X):
        return self.fit(X)

    def score(self, X):
        X = self.prepare_features(X)
        X_scaled = self.scaler.transform(X)
        return -self.model.decision_function(X_scaled)

    def predict(self, X):
        X = self.prepare_features(X)
        X_scaled = self.scaler.transform(X)
        raw_preds = self.model.predict(X_scaled)
        return np.where(raw_preds == -1, 1, 0)

    def predict_proba(self, X):
        scores = self.score(X)

        min_score = np.min(scores)
        max_score = np.max(scores)

        if max_score == min_score:
            anomaly_prob = np.zeros_like(scores)
        else:
            anomaly_prob = (scores - min_score) / (max_score - min_score)

        normal_prob = 1 - anomaly_prob
        return np.vstack([normal_prob, anomaly_prob]).T

    def decision_function(self, X):
        return self.score(X)

    def build_output(self, df):
        output_df = df.copy()
        output_df["anomaly_score"] = self.score(df)
        output_df["anomaly_flag"] = self.predict(df)
        output_df["anomaly_rank"] = output_df["anomaly_score"].rank(
            ascending=False,
            method="dense"
        ).astype(int)
        return output_df.sort_values("anomaly_rank")

    def save(self, path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        joblib.dump(self, path)

    @staticmethod
    def load(path):
        return joblib.load(path)