import os
import numpy as np
import pandas as pd

from sklearn.svm import OneClassSVM
from sklearn.preprocessing import StandardScaler


class OneClassSVMModel:

    def __init__(self, kernel="rbf", nu=0.05, gamma="scale"):
        self.kernel = kernel
        self.nu = nu
        self.gamma = gamma

        self.scaler = StandardScaler()
        self.model = OneClassSVM(
            kernel=kernel,
            nu=nu,
            gamma=gamma
        )

        self.feature_columns = None

    def load_dataset(self, dataset_path):

        if not os.path.exists(dataset_path):
            raise FileNotFoundError(f"Dataset not found: {dataset_path}")

        df = pd.read_csv(dataset_path, low_memory=False)
        df = df.sample(8000, random_state=42)
        if df.empty:
            raise ValueError("Dataset is empty")

        return df

    def prepare_features(self, df):

        drop_cols = [
            "event_id",
            "row_id",
            "anomaly_label",
            "anomaly_flag",
            "anomaly_score"
        ]

        df_numeric = df.select_dtypes(include=[np.number]).copy()

        for col in drop_cols:
            if col in df_numeric.columns:
                df_numeric = df_numeric.drop(columns=[col])

        df_numeric = df_numeric.replace([np.inf, -np.inf], np.nan)
        df_numeric = df_numeric.fillna(df_numeric.median(numeric_only=True))

        self.feature_columns = list(df_numeric.columns)

        if len(self.feature_columns) == 0:
            raise ValueError("No numeric features available")

        return df_numeric

    def train(self, X):

        X_scaled = self.scaler.fit_transform(X)

        # One-Class SVM learns normal boundary
        self.model.fit(X_scaled)

        return self

    def score(self, X):

        X_scaled = self.scaler.transform(X)

        # decision_function: higher = more normal
        scores = self.model.decision_function(X_scaled)

        # convert to anomaly score (higher = more anomalous)
        anomaly_scores = -scores

        return anomaly_scores

    def predict(self, X):

        X_scaled = self.scaler.transform(X)

        preds = self.model.predict(X_scaled)

        # -1 = anomaly, 1 = normal
        anomaly_flags = np.where(preds == -1, 1, 0)

        return anomaly_flags

    def build_output(self, original_df, X):

        output_df = original_df.copy()

        output_df["anomaly_score"] = self.score(X)
        output_df["anomaly_flag"] = self.predict(X)

        output_df["anomaly_rank"] = output_df["anomaly_score"].rank(
            ascending=False,
            method="dense"
        ).astype(int)

        output_df = output_df.sort_values("anomaly_rank")

        return output_df

    def save_outputs(self, output_df, output_dir, model_path):

        os.makedirs(output_dir, exist_ok=True)
        os.makedirs(os.path.dirname(model_path), exist_ok=True)

        scores_path = os.path.join(output_dir, "ocsvm_scores.csv")
        flags_path = os.path.join(output_dir, "ocsvm_flags.csv")

        output_df.to_csv(scores_path, index=False)

        flag_cols = [
            col for col in [
                "event_id", "timestamp", "region_id",
                "hazard_type", "threat_type"
            ]
            if col in output_df.columns
        ]

        flag_cols += ["anomaly_flag", "anomaly_score", "anomaly_rank"]

        output_df[flag_cols].to_csv(flags_path, index=False)

        # save model
        import joblib

        joblib.dump({
            "model": self.model,
            "scaler": self.scaler,
            "feature_columns": self.feature_columns,
            "kernel": self.kernel,
            "nu": self.nu,
            "gamma": self.gamma
        }, model_path)

        print("\nOne-Class SVM completed")
        print(f"Scores saved: {scores_path}")
        print(f"Flags saved: {flags_path}")
        print(f"Model saved: {model_path}")

    def run(self, dataset_path, output_dir, model_path):

        df = self.load_dataset(dataset_path)
        X = self.prepare_features(df)

        self.train(X)

        output_df = self.build_output(df, X)

        self.save_outputs(output_df, output_dir, model_path)

        print("\nTop anomalies:")
        print(output_df.head(10))

        return output_df


if __name__ == "__main__":

    BASE_DIR = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..")
    )

    DATASET_PATH = os.path.join(
        BASE_DIR,
        "data",
        "processed",
        "features_output.csv"
    )

    OUTPUT_DIR = os.path.join(
        BASE_DIR,
        "data",
        "outputs"
    )

    MODEL_PATH = os.path.join(
        BASE_DIR,
        "checkpoints",
        "ocsvm.pkl"
    )

    model = OneClassSVMModel()

    model.run(
        DATASET_PATH,
        OUTPUT_DIR,
        MODEL_PATH
    )