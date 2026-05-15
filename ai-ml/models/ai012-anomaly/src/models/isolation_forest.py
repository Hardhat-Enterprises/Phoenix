import os
import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


class IsolationForestBaseline:
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

    def load_dataset(self, dataset_path):
        if not os.path.exists(dataset_path):
            raise FileNotFoundError(f"Dataset not found: {dataset_path}")

        df = pd.read_csv(dataset_path)

        if df.empty:
            raise ValueError("Dataset is empty.")

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
            raise ValueError("No numeric features available for training.")

        return df_numeric

    def train(self, X):
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled)
        return self

    def score(self, X):
        X_scaled = self.scaler.transform(X)

        raw_scores = self.model.decision_function(X_scaled)

        # Higher score = more anomalous
        anomaly_scores = -raw_scores

        return anomaly_scores

    def predict(self, X):
        X_scaled = self.scaler.transform(X)

        raw_predictions = self.model.predict(X_scaled)

        # Isolation Forest: -1 = anomaly, 1 = normal
        # Convert to: 1 = anomaly, 0 = normal
        anomaly_flags = np.where(raw_predictions == -1, 1, 0)

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

    def save_model(self, model_path):
        os.makedirs(os.path.dirname(model_path), exist_ok=True)

        model_package = {
            "model": self.model,
            "scaler": self.scaler,
            "feature_columns": self.feature_columns,
            "contamination": self.contamination,
            "random_state": self.random_state
        }

        joblib.dump(model_package, model_path)

    @staticmethod
    def load_model(model_path):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model checkpoint not found: {model_path}")

        package = joblib.load(model_path)

        loaded_model = IsolationForestBaseline(
            contamination=package["contamination"],
            random_state=package["random_state"]
        )

        loaded_model.model = package["model"]
        loaded_model.scaler = package["scaler"]
        loaded_model.feature_columns = package["feature_columns"]

        return loaded_model


def tune_contamination(dataset_path, output_dir):
    contamination_values = [0.01, 0.03, 0.05, 0.07, 0.10]
    results = []

    for contamination in contamination_values:
        model = IsolationForestBaseline(contamination=contamination)

        df = model.load_dataset(dataset_path)
        X = model.prepare_features(df)

        model.train(X)
        output_df = model.build_output(df, X)

        anomaly_count = int(output_df["anomaly_flag"].sum())
        anomaly_rate = anomaly_count / len(output_df)

        results.append({
            "contamination": contamination,
            "rows": len(output_df),
            "anomaly_count": anomaly_count,
            "anomaly_rate": anomaly_rate,
            "mean_anomaly_score": output_df["anomaly_score"].mean(),
            "min_anomaly_score": output_df["anomaly_score"].min(),
            "max_anomaly_score": output_df["anomaly_score"].max()
        })

    results_df = pd.DataFrame(results)

    os.makedirs(output_dir, exist_ok=True)

    tuning_path = os.path.join(
        output_dir,
        "isolation_forest_contamination_tuning.csv"
    )

    results_df.to_csv(tuning_path, index=False)

    return results_df


def run_isolation_forest(
    dataset_path,
    output_dir,
    checkpoint_path,
    contamination=0.05
):
    model = IsolationForestBaseline(contamination=contamination)

    df = model.load_dataset(dataset_path)
    X = model.prepare_features(df)

    model.train(X)

    output_df = model.build_output(df, X)

    os.makedirs(output_dir, exist_ok=True)

    scores_path = os.path.join(output_dir, "isolation_forest_scores.csv")
    flags_path = os.path.join(output_dir, "isolation_forest_flags.csv")

    output_df.to_csv(scores_path, index=False)

    flag_columns = []

    for col in ["event_id", "timestamp", "location", "region", "hazard_type", "threat_type"]:
        if col in output_df.columns:
            flag_columns.append(col)

    flag_columns += ["anomaly_flag", "anomaly_score", "anomaly_rank"]

    output_df[flag_columns].to_csv(flags_path, index=False)

    model.save_model(checkpoint_path)

    print("Isolation Forest training completed successfully.")
    print(f"Rows processed: {len(output_df)}")
    print(f"Anomalies detected: {int(output_df['anomaly_flag'].sum())}")
    print(f"Anomaly rate: {output_df['anomaly_flag'].mean():.4f}")
    print(f"Scores saved to: {scores_path}")
    print(f"Flags saved to: {flags_path}")
    print(f"Model saved to: {checkpoint_path}")

    print("\nTop anomaly examples:")
    print(output_df.head(10))

    return output_df


if __name__ == "__main__":
    BASE_DIR = "/workspaces/Phoenix/ai-ml/models/ai012-anomaly"

    DATASET_PATH = os.path.join(
        BASE_DIR,
        "features",
        "ai004_features_output.csv"
    )

    OUTPUT_DIR = os.path.join(
        BASE_DIR,
        "data",
        "outputs"
    )

    CHECKPOINT_PATH = os.path.join(
        BASE_DIR,
        "checkpoints",
        "isolation_forest.pkl"
    )

    tune_results = tune_contamination(DATASET_PATH, OUTPUT_DIR)

    print("\nContamination tuning results:")
    print(tune_results)

    print("\nRunning final Isolation Forest model...")
    run_isolation_forest(
        dataset_path=DATASET_PATH,
        output_dir=OUTPUT_DIR,
        checkpoint_path=CHECKPOINT_PATH,
        contamination=0.05
    )