import pandas as pd
from sklearn.model_selection import train_test_split
import os
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - AI010 Validation - %(message)s')
logger = logging.getLogger(__name__)

def create_stratified_benchmarks(df, target_col, dataset_name, output_dir="validation_benchmarks", seed=42):
    """AI010 Strategy: Stratified splitting for classification datasets."""
    logger.info(f"Creating Stratified Benchmark for {dataset_name} on '{target_col}'")
    
    train_val, test = train_test_split(df, test_size=0.15, stratify=df[target_col], random_state=seed)
    train, val = train_test_split(train_val, test_size=0.1765, stratify=train_val[target_col], random_state=seed) 
    
    save_splits(train, val, test, dataset_name, output_dir)

def create_chronological_benchmarks(df, time_col, dataset_name, output_dir="validation_benchmarks"):
    """AI010 Strategy: Chronological splitting for time-series datasets."""
    logger.info(f"Creating Chronological Benchmark for {dataset_name} on '{time_col}'")
    
    df = df.sort_values(by=time_col).reset_index(drop=True)
    n = len(df)
    
    train_end = int(n * 0.70)
    val_end = int(n * 0.85)
    
    train = df.iloc[:train_end]
    val = df.iloc[train_end:val_end]
    test = df.iloc[val_end:]
    
    save_splits(train, val, test, dataset_name, output_dir)

def save_splits(train, val, test, dataset_name, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    train.to_csv(os.path.join(output_dir, f"{dataset_name}_train.csv"), index=False)
    val.to_csv(os.path.join(output_dir, f"{dataset_name}_val.csv"), index=False)
    test.to_csv(os.path.join(output_dir, f"{dataset_name}_test.csv"), index=False)
    logger.info(f"Saved {dataset_name} -> Train: {len(train)} | Val: {len(val)} | Test: {len(test)}")

if __name__ == "__main__":

    output_path = "ai-ml/datasets/validation_benchmarks"
    
    # Example 1: Classification (Stratified)
    # df_phish = pd.read_csv('ai-ml/datasets/raw/openphish.csv')
    # create_stratified_benchmarks(df_phish, 'label', 'openphish_benchmark', output_path)

    # Example 2: Temporal (Chronological)
    # df_meteo = pd.read_csv('ai-ml/datasets/raw/open_meteo.csv')
    # create_chronological_benchmarks(df_meteo, 'timestamp', 'openmeteo_benchmark', output_path)
    
    logger.info("AI010 Benchmark dataset creation complete.")