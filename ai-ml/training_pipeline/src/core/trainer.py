from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Optional

import numpy as np

try:
    import torch
    from torch import nn
    from torch.utils.data import DataLoader, TensorDataset
except Exception:
    torch = None
    nn = None
    DataLoader = None
    TensorDataset = None

try:
    from torch.utils.tensorboard import SummaryWriter
except Exception:
    SummaryWriter = None

try:
    from ..models.model_registry import (
        infer_task_type_from_model,
        list_supported_models,
        load_pytorch_model,
        load_sklearn_model,
    )
except ImportError:
    from models.model_registry import (
        infer_task_type_from_model,
        list_supported_models,
        load_pytorch_model,
        load_sklearn_model,
    )


@dataclass
class TrainingConfig:
    model_type: str  # "sklearn"/"pytorch" or pipeline aliases like "random_forest"
    model_name: str
    model_params: Dict[str, Any] = field(default_factory=dict)
    task_type: Optional[str] = None

    # Training parameters
    epochs: int = 10
    batch_size: int = 32
    learning_rate: float = 0.001
    verbose: bool = True

    # Optional PyTorch parameters
    optimizer_class: Optional[Any] = None
    loss_fn: Optional[Any] = None
    device: Optional[str] = None
    shuffle: bool = True
    tensorboard_enabled: bool = False
    tensorboard_log_dir: Optional[str] = None
    run_id: Optional[str] = None

    def __post_init__(self) -> None:
        """
        Normalize config for both direct engine usage and pipeline config usage.
        Allows either:
          - model_type in {"sklearn", "pytorch"} + explicit model_name
          - model_type as pipeline alias, e.g. "random_forest"
        """
        raw_model_type = str(self.model_type).strip().lower()

        if raw_model_type in {"sklearn", "pytorch"}:
            self.model_type = raw_model_type
            self.model_name = str(self.model_name).strip().lower()
        else:
            normalized_type, normalized_name = _map_pipeline_model(raw_model_type)
            self.model_type = normalized_type

            # If caller passed an explicit model_name, keep it when consistent.
            candidate_name = str(self.model_name).strip().lower() if self.model_name else ""
            self.model_name = candidate_name or normalized_name

        if self.model_type == "sklearn" and not self.model_name:
            raise ValueError(
                "model.name is required when model.type is 'sklearn'."
            )
        if self.model_type == "pytorch" and not self.model_name:
            raise ValueError(
                "model.name is required when model.type is 'pytorch'."
            )

        if self.task_type:
            self.task_type = str(self.task_type).strip().lower()
        elif self.model_type == "sklearn":
            self.task_type = infer_task_type_from_model(self.model_name)
        else:
            self.task_type = "classification"

    @classmethod
    def from_pipeline_config(cls, config: Dict[str, Any], verbose: bool = True) -> "TrainingConfig":
        """Build TrainingConfig from training_pipeline config schema."""
        model_cfg = config.get("model", {})
        training_cfg = config.get("training", {})

        model_type_raw = str(model_cfg.get("type", "")).strip().lower()
        model_name_raw = str(model_cfg.get("name", "")).strip().lower()

        if model_type_raw in {"sklearn", "pytorch"}:
            model_type, model_name = model_type_raw, model_name_raw
        else:
            model_type, model_name = _map_pipeline_model(model_type_raw)

        return cls(
            model_type=model_type,
            model_name=model_name,
            model_params=dict(model_cfg.get("hyperparameters", {})),
            task_type=model_cfg.get("task_type"),
            epochs=int(training_cfg.get("epochs", 10)),
            batch_size=int(training_cfg.get("batch_size", 32)),
            learning_rate=float(training_cfg.get("learning_rate", 0.001)),
            verbose=verbose,
            tensorboard_enabled=bool(training_cfg.get("tensorboard_enabled", False)),
            tensorboard_log_dir=training_cfg.get("tensorboard_log_dir"),
        )


def _map_pipeline_model(model_type: str) -> tuple[str, str]:
    """Map pipeline config model.type values to engine model_type/model_name."""
    mapping = {
        "random_forest": ("sklearn", "random_forest"),
        "isolation_forest": ("sklearn", "isolation_forest"),
        "pytorch_mlp": ("pytorch", "simple_mlp"),
        "simple_mlp": ("pytorch", "simple_mlp"),
    }

    supported_sklearn = set(list_supported_models("sklearn"))
    if model_type in supported_sklearn:
        return "sklearn", model_type

    if model_type not in mapping:
        raise ValueError(
            "Unsupported model.type in pipeline config: "
            f"{model_type!r}. Expected one of: {sorted(list(mapping.keys()) + list(supported_sklearn))} "
            "or use model.type='sklearn'/'pytorch' with model.name."
        )
    return mapping[model_type]


class GenericTrainingEngine:
    # Model Loading
    def __init__(self, config: TrainingConfig):
        self.config = config
        self.model = self._load_model()

    def _load_model(self):
        if self.config.model_type == "sklearn":
            return load_sklearn_model(self.config.model_name, self.config.model_params)
        elif self.config.model_type == "pytorch":
            return load_pytorch_model(self.config.model_name, self.config.model_params)
        else:
            raise ValueError("model_type must be 'sklearn' or 'pytorch'")

    # Training Interface
    def fit(self, X_train, y_train=None, X_val=None, y_val=None):
        if self.config.model_type == "sklearn":
            return self._fit_sklearn(X_train, y_train)
        elif self.config.model_type == "pytorch":
            if y_train is None:
                raise ValueError("y_train is required for PyTorch training.")
            return self._fit_pytorch(X_train, y_train, X_val, y_val)
        else:
            raise ValueError("Unsupported model type")

    # Prediction Interface
    def predict(self, X):
        if self.config.model_type == "sklearn":
            return self.model.predict(X)
        elif self.config.model_type == "pytorch":
            return self._predict_pytorch(X)
        else:
            raise ValueError("Unsupported model type")

    def predict_proba(self, X):
        if self.config.model_type == "sklearn":
            if not hasattr(self.model, "predict_proba"):
                raise NotImplementedError(
                    f"Model '{self.config.model_name}' does not expose predict_proba."
                )
            probabilities = self.model.predict_proba(X)
            probabilities = np.asarray(probabilities)
            if probabilities.ndim == 2 and probabilities.shape[1] == 2:
                return probabilities[:, 1]
            return probabilities
        if self.config.model_type == "pytorch":
            return self._predict_proba_pytorch(X)
        raise ValueError("Unsupported model type")

    # Training Implementation Sklearn
    def _fit_sklearn(self, X_train, y_train):
        estimator_kind = getattr(self.model, "_estimator_type", None)

        if estimator_kind == "classifier" and y_train is None:
            raise ValueError(
                f"Model '{self.config.model_name}' requires training labels but y_train was not provided."
            )

        if y_train is None:
            # IsolationForest and similar estimators can fit without labels.
            self.model.fit(X_train)
        else:
            if estimator_kind == "classifier":
                y_np = np.asarray(y_train)
                if np.issubdtype(y_np.dtype, np.floating):
                    finite_mask = np.isfinite(y_np)
                    finite_values = y_np[finite_mask]
                    if finite_values.size > 0 and np.allclose(
                        finite_values, np.round(finite_values)
                    ):
                        y_train = np.round(y_np).astype(int)
                    else:
                        raise ValueError(
                            "Classifier received continuous labels. "
                            "Set a discrete target column (e.g. 0/1 classes) and ensure "
                            "the target is excluded from normalization/encoding."
                        )
            self.model.fit(X_train, y_train)

        if self.config.verbose:
            print(f"Finished training sklearn model: {self.config.model_name}")

        return {
            "model_type": "sklearn",
            "status": "trained"
        }

    # Training Implementation PyTorch
    def _fit_pytorch(self, X_train, y_train, X_val=None, y_val=None):
        if torch is None:
            raise ImportError("PyTorch is not installed.")

        device = self.config.device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(device)

        optimizer_class = self.config.optimizer_class or torch.optim.Adam
        optimizer = optimizer_class(self.model.parameters(), lr=self.config.learning_rate)

        loss_fn = self.config.loss_fn or nn.CrossEntropyLoss() # type: ignore

        X_train_tensor = self._to_tensor(X_train, dtype=torch.float32)
        y_train_tensor = self._to_tensor(y_train, dtype=torch.long)

        train_dataset = TensorDataset(X_train_tensor, y_train_tensor) # type: ignore
        train_loader = DataLoader(
            train_dataset,
            batch_size=self.config.batch_size,
            shuffle=self.config.shuffle
        ) # type: ignore

        writer = None
        tensorboard_log_dir = None
        tensorboard_status = "disabled"
        if self.config.tensorboard_enabled:
            if SummaryWriter is None:
                tensorboard_status = "unavailable"
                if self.config.verbose:
                    print(
                        "TensorBoard unavailable; continuing without TB logging. "
                        "Install with: pip install tensorboard"
                    )
            else:
                base_dir = Path(self.config.tensorboard_log_dir or "logs/tensorboard")
                run_suffix = self.config.run_id or "run"
                tensorboard_log_dir = str((base_dir / run_suffix).resolve())
                writer = SummaryWriter(log_dir=tensorboard_log_dir)
                tensorboard_status = "enabled"

        epoch_losses: list[float] = []

        # Fit Loop
        for epoch in range(self.config.epochs):
            self.model.train()
            epoch_loss = 0.0

            for batch_X, batch_y in train_loader:
                batch_X = batch_X.to(device)
                batch_y = batch_y.to(device)

                optimizer.zero_grad()
                outputs = self.model(batch_X)
                loss = loss_fn(outputs, batch_y)
                loss.backward()
                optimizer.step()

                epoch_loss += loss.item()

            epoch_loss = epoch_loss / max(1, len(train_loader))
            epoch_losses.append(float(epoch_loss))

            if writer is not None:
                writer.add_scalar("train/loss", epoch_loss, epoch + 1)
                writer.add_scalar("train/learning_rate", optimizer.param_groups[0]["lr"], epoch + 1)

            if self.config.verbose:
                print(f"Epoch {epoch+1}: loss={epoch_loss:.4f}")

        if writer is not None:
            writer.flush()
            writer.close()

        return {
            "model_type": "pytorch",
            "status": "trained",
            "epochs": self.config.epochs,
            "train_loss_by_epoch": epoch_losses,
            "tensorboard_log_dir": tensorboard_log_dir,
            "tensorboard_status": tensorboard_status,
        }

    # PyTorch pred
    def _predict_pytorch(self, X):
        if torch is None:
            raise ImportError("PyTorch is not installed.")

        device = self.config.device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(device)
        self.model.eval()

        X_tensor = self._to_tensor(X, dtype=torch.float32).to(device)

        with torch.no_grad():
            outputs = self.model(X_tensor)
            preds = torch.argmax(outputs, dim=1)

        return preds.cpu().numpy()

    def _predict_proba_pytorch(self, X):
        if torch is None:
            raise ImportError("PyTorch is not installed.")

        device = self.config.device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(device)
        self.model.eval()

        X_tensor = self._to_tensor(X, dtype=torch.float32).to(device)

        with torch.no_grad():
            outputs = self.model(X_tensor)
            probabilities = torch.softmax(outputs, dim=1)

        prob_array = probabilities.cpu().numpy()
        if prob_array.ndim == 2 and prob_array.shape[1] == 2:
            return prob_array[:, 1]
        return prob_array

    # Input data conversion to PyTorch tensor
    @staticmethod
    def _to_tensor(data, dtype):
        if torch is None:
            raise ImportError("PyTorch is not installed.")

        if isinstance(data, torch.Tensor):
            return data.to(dtype=dtype)

        return torch.tensor(np.asarray(data), dtype=dtype)
