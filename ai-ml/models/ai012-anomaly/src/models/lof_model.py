import os
import numpy as np
import pandas as pd

from sklearn.neighbors import LocalOutlierFactor
from sklearn.preprocessing import StandardScaler


class LOFModel:

    def __init__(self, n_neighbors=20, contamination=0.05):

        self.n_neighbors = n_neighbors
        self.contamination = contamination

        self.scaler = StandardScaler()

        self.model = LocalOutlierFactor(
            n_neighbors=n_neighbors,
            contamination=contamination,
            novelty=False
        )

        self.feature_columns = None

    def load_dataset(self, dataset_path):

        if not os.path.exists(dataset_path):
            raise FileNotFoundError(f"Dataset not found: {dataset_path}")

        df = pd.read_csv(dataset_path, low_memory=False)

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

        df_numeric = df_numeric.fillna(
            df_numeric.median(numeric_only=True)
        )

        self.feature_columns = list(df_numeric.columns)

        if len(self.feature_columns) == 0:
            raise ValueError("No numeric features available")

        return df_numeric

    def train_predict(self, X):

        X_scaled = self.scaler.fit_transform(X)

        preds = self.model.fit_predict(X_scaled)

        # negative_outlier_factor_
        lof_scores = -self.model.negative_outlier_factor_

        # convert prediction format
        anomaly_flags = np.where(preds == -1, 1, 0)

        return lof_scores, anomaly_flags

    def build_output(self, original_df, scores, flags):

        output_df = original_df.copy()

        output_df["anomaly_score"] = scores
        output_df["anomaly_flag"] = flags

        output_df["anomaly_rank"] = output_df["anomaly_score"].rank(
            ascending=False,
            method="dense"
        ).astype(int)

        output_df = output_df.sort_values("anomaly_rank")

        return output_df

    def save_outputs(self, output_df, output_dir, model_path):

        os.makedirs(output_dir, exist_ok=True)
        os.makedirs(os.path.dirname(model_path), exist_ok=True)

        scores_path = os.path.join(output_dir, "lof_scores.csv")
        flags_path = os.path.join(output_dir, "lof_flags.csv")

        output_df.to_csv(scores_path, index=False)

        flag_cols = [
            col for col in [
                "event_id",
                "timestamp",
                "region_id",
                "hazard_type",
                "threat_type"
            ]
            if col in output_df.columns
        ]

        flag_cols += [
            "anomaly_flag",
            "anomaly_score",
            "anomaly_rank"
        ]

        output_df[flag_cols].to_csv(flags_path, index=False)

        # save metadata only
        import joblib

        joblib.dump({
            "n_neighbors": self.n_neighbors,
            "contamination": self.contamination,
            "feature_columns": self.feature_columns
        }, model_path)

        print("\nLOF completed successfully")
        print(f"Scores saved: {scores_path}")
        print(f"Flags saved: {flags_path}")
        print(f"Metadata saved: {model_path}")

    def run(self, dataset_path, output_dir, model_path):

        df = self.load_dataset(dataset_path)

        X = self.prepare_features(df)

        scores, flags = self.train_predict(X)

        output_df = self.build_output(df, scores, flags)

        self.save_outputs(
            output_df,
            output_dir,
            model_path
        )

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
        "lof_model.pkl"
    )

    model = LOFModel(
        n_neighbors=20,
        contamination=0.05
    )

    model.run(
        DATASET_PATH,
        OUTPUT_DIR,
        MODEL_PATH
    )