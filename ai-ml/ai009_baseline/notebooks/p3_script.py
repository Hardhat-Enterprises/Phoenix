import sys
from pathlib import Path

# Automatically finds the Phoenix root
PHOENIX_ROOT = Path().resolve()
while not (PHOENIX_ROOT / "ai-ml").exists():
    PHOENIX_ROOT = PHOENIX_ROOT.parent
    if PHOENIX_ROOT == PHOENIX_ROOT.parent:
        raise FileNotFoundError("Could not find Phoenix root.")

# Path to AI008 training pipeline
AI008_ROOT = PHOENIX_ROOT / "ai-ml" / "training_pipeline"
AI008_SRC = AI008_ROOT / "src"

# Add to sys.path
for path in [AI008_ROOT, AI008_SRC]:
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

print("=== PATH CHECK ===")
print(f"Phoenix root exists: {PHOENIX_ROOT.exists()}")
print(f"AI008 root exists  : {AI008_ROOT.exists()}")
print(f"AI008 src exists   : {AI008_SRC.exists()}")

import pandas as pd

# Load cleaned data from P2
df = pd.read_csv('../../cleaning/data/output/cleaned_data.csv')

print("=== CLEANED DATA LOADED ===")
print(f"Rows: {df.shape[0]}, Columns: {df.shape[1]}")
print(f"Columns: {list(df.columns)}")
print()
print("--- Data Sample ---")
print(df.head())

# Define target variable
target_column = 'label'
y = df[target_column]

print("=== TARGET VARIABLE ===")
print(f"Target column: {target_column}")
print(f"Target shape: {y.shape}")
print(f"Target distribution:")
print(y.value_counts())
print()
print("--- Target Sample ---")
print(y.head())

# Define features (all columns except target)
X = df.drop(columns=[target_column])

print("=== FEATURE SET ===")
print(f"Features shape: {X.shape}")
print(f"Feature columns: {list(X.columns)}")
print()
print("--- Features Sample ---")
print(X.head())

# Demonstrate the training pipeline's X/y separation and splitting
from data.dataset_loader import DatasetLoader
from data.splitter import DatasetSplitter

print("=== TRAINING PIPELINE X/y SEPARATION ===")

# Separate features and target (as pipeline does)
X_processed, y_processed = DatasetLoader.separate_features_and_target(df, target_column=target_column)

print(f"Original data shape: {df.shape}")
print(f"X (features) shape: {X_processed.shape}")
print(f"y (target) shape: {y_processed.shape}")
print()

# Demonstrate splitting (without time column - uses random split)
print("=== SPLITTING DEMONSTRATION ===")
print("Since this dataset has no timestamp, it uses random stratified splitting.")
print("For time-series data, the pipeline would use chronological splitting.")

split_data = DatasetSplitter.split(
    x=X_processed,
    y=y_processed,
    test_size=0.2,
    val_size=0.2,
    random_seed=42,
    stratify=True
)

print(f"Train set: {split_data.x_train.shape[0]} samples")
print(f"Validation set: {split_data.x_val.shape[0]} samples")
print(f"Test set: {split_data.x_test.shape[0]} samples")
print()

print("=== LEAKAGE PREVENTION ===")
print("For time-series datasets with timestamps:")
print("- Data is sorted chronologically")
print("- Train: earliest time periods")
print("- Validation: middle time periods")
print("- Test: latest time periods")
print("- Prevents future data from leaking into training")

# Save X and y for next phases
output_dir = Path("../outputs")
output_dir.mkdir(exist_ok=True)

X.to_csv(output_dir / "p3_features_X.csv", index=False)
y.to_csv(output_dir / "p3_target_y.csv", index=False)

print("=== DATA SAVED ===")
print(f"Features saved to: {output_dir / 'p3_features_X.csv'}")
print(f"Target saved to: {output_dir / 'p3_target_y.csv'}")
print()
print("Ready for P4: Model Setup and Training")