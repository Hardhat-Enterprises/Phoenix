from __future__ import annotations

import builtins
import sys
from pathlib import Path


PIPELINE_SRC = Path(__file__).resolve().parents[4] / "training_pipeline" / "src"
sys.path.insert(0, str(PIPELINE_SRC))

from models.model_registry import load_sklearn_model


def test_non_xgboost_model_does_not_import_xgboost(monkeypatch):
    original_import = builtins.__import__

    def guarded_import(name, *args, **kwargs):
        if name == "xgboost":
            raise AssertionError("xgboost should not be imported for random_forest")
        return original_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", guarded_import)
    model = load_sklearn_model("random_forest", {"n_estimators": 1, "random_state": 42})

    assert model.__class__.__name__ == "RandomForestClassifier"
