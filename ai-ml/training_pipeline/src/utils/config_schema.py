"""
src/utils/config_schema.py
W6-T2 — Configuration schema definition.

Defines the full expected structure of a config, including:
  - required keys
  - types
  - allowed values (for enums)
  - defaults (for optional keys)
"""

# Each entry: (type, required, allowed_values_or_None, default_if_optional)
CONFIG_SCHEMA = {
    "dataset": {
        "path":         (str,   True,  None,                                 None),
        "train_split":  (float, True,  None,                                 None),
        "val_split":    (float, True,  None,                                 None),
        "test_split":   (float, True,  None,                                 None),
        "random_seed":  (int,   False, None,                                 42),
    },
    "preprocessing": {
        "missing_value_strategy": (str,  False, ["mean", "median", "drop", "constant"], "mean"),
        "normalization":          (str,  False, ["standard", "minmax", "none"],         "standard"),
        "encoding":               (str,  False, ["onehot", "label", "none"],            "onehot"),
        "feature_selection":      (bool, False, None,                                   True),
    },
    "model": {
        "type":            (str,  True,  ["random_forest", "isolation_forest", "pytorch_mlp"], None),
        "hyperparameters": (dict, False, None,                                                  {}),
    },
    "training": {
        "batch_size":    (int,   False, None, 32),
        "epochs":        (int,   False, None, 50),
        "learning_rate": (float, False, None, 0.001),
    },
    "output": {
        "path":              (str,  False, None,  "checkpoints/"),
        "log_path":          (str,  False, None,  "logs/"),
        "save_best_only":    (bool, False, None,  True),
        "checkpoint_prefix": (str,  False, None,  "model"),
    },
}
