import numpy as np
import pandas as pd
from sklearn.neighbors import LocalOutlierFactor
from sklearn.preprocessing import StandardScaler


class AI012M2_LOF:
    """
    AI012 Role E - M2 Model (LOF)
    AI009 Pipeline Compatible Anomaly Model
    """

    def __init__(self, n_neighbors=20, contamination=0.05):
        self.n_neighbors = n_neighbors
        self.contamination = contamination

        self.scaler = StandardScaler()

        self.model = LocalOutlierFactor(
            n_neighbors=n_neighbors,
            contamination=contamination,
            novelty=True  # REQUIRED for pipeline compatibility
        )

        self.feature_columns = None

    def prepare_features(self, df):
        exclude_columns = [
            "event_id", "timestamp", "region", "location",
            "hazard_type", "threat_type",
            "anomaly_label", "anomaly_flag",
            "anomaly_score", "anomaly_rank",
            "dummy_target"
        ]

        X = df.drop(
            columns=[c for c in exclude_columns if c in df.columns],
            errors="ignore"
        )

        X = X.select_dtypes(include=[np.number]).copy()
        X = X.replace([np.inf, -np.inf], np.nan)
        X = X.fillna(X.median(numeric_only=True))

        if X.empty:
            raise ValueError("No numeric features for LOF model.")

        self.feature_columns = list(X.columns)
        return X

    def fit(self, X, y=None):
        if isinstance(X, pd.DataFrame):
            X = self.prepare_features(X)

        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled)
        return self

    def train(self, X):
        return self.fit(X)

    def predict(self, X):
        if isinstance(X, pd.DataFrame):
            X = self.prepare_features(X)

        X_scaled = self.scaler.transform(X)
        preds = self.model.predict(X_scaled)

        # -1 anomaly → 1, 1 normal → 0
        return np.where(preds == -1, 1, 0)

    def score(self, X):
        if isinstance(X, pd.DataFrame):
            X = self.prepare_features(X)

        X_scaled = self.scaler.transform(X)

        # invert so higher = more anomalous
        return -self.model.decision_function(X_scaled)

    def decision_function(self, X):
        return self.score(X)

    def build_output(self, df):
        X = self.prepare_features(df)

        out = df.copy()
        out["anomaly_score"] = self.score(X)
        out["anomaly_flag"] = self.predict(X)
        out["anomaly_rank"] = out["anomaly_score"].rank(
            ascending=False,
            method="dense"
        ).astype(int)

        return out.sort_values("anomaly_rank")