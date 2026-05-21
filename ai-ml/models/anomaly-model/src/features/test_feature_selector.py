import pandas as pd
from feature_selector import FeatureSelector
import os

BASE_DIR = os.path.dirname(__file__)

DATA_PATH = os.path.abspath(
    os.path.join(BASE_DIR, "../../data/raw/anomaly_detection_hourly_2020_2024.csv")
)

df = pd.read_csv(DATA_PATH, low_memory=False)

fs = FeatureSelector(df)
output = fs.create_features()

print(output.head())
print(fs.get_feature_list())

output_path = os.path.abspath(
    os.path.join(BASE_DIR, "../../data/processed/features_output.csv")
)

output.to_csv(output_path, index=False)

print("Saved engineered dataset to:", output_path)