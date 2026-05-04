import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


class AI012IsolationForest:
    """
    AI012 Role D: Isolation Forest baseline model.

    This model is designed to plug into the AI009 TrainingPipeline.
    It exposes train(), predict(), score(), fit(), and decision_function().
    """

    def __init__(self, contamination=0.05, random_state=42):
        self.contamination = contamination
        self.random_state = random_state
        self.scaler = StandardScaler()
        self.model = IsolationForest(
            n_estimators=100,
            contamination=contamination,
            random_state=random_state,
            n_jobs=-1
        )
        self.feature_columns = None

    def prepare_features(self, df):
        exclude_columns = [
            "event_id",
            "timestamp",
            "region",
            "location",
            "hazard_type",
            "threat_type",
            "anomaly_label",
            "anomaly_flag",
            "anomaly_score",
            "anomaly_rank",
            "dummy_target"
        ]

        X = df.drop(
            columns=[col for col in exclude_columns if col in df.columns],
            errors="ignore"
        )

        X = X.select_dtypes(include=[np.number]).copy()
        X = X.replace([np.inf, -np.inf], np.nan)
        X = X.fillna(X.median(numeric_only=True))

        if X.empty:
            raise ValueError("No numeric features available for Isolation Forest.")

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
        raw_predictions = self.model.predict(X_scaled)

        # Isolation Forest output:
        # -1 = anomaly
        #  1 = normal
        # Convert to:
        # 1 = anomaly
        # 0 = normal
        return np.where(raw_predictions == -1, 1, 0)

    def score(self, X):
        if isinstance(X, pd.DataFrame):
            X = self.prepare_features(X)

        X_scaled = self.scaler.transform(X)
        raw_scores = self.model.decision_function(X_scaled)

        # Higher score should mean more anomalous
        return -raw_scores

    def decision_function(self, X):
        return self.score(X)

    def build_output(self, df):
        X = self.prepare_features(df)

        output_df = df.copy()
        output_df["anomaly_score"] = self.score(X)
        output_df["anomaly_flag"] = self.predict(X)
        output_df["anomaly_rank"] = output_df["anomaly_score"].rank(
            ascending=False,
            method="dense"
        ).astype(int)

        return output_df.sort_values("anomaly_rank")