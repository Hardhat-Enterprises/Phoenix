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

try:
    from ..evaluation.validator import validate_predictions
except ImportError:
    from evaluation.validator import validate_predictions


@dataclass
class TrainingConfig:
    model_type: str  # "sklearn"/"pytorch" or pipeline aliases like "random_forest"
    model_name: str
    model_params: Dict[str, Any] = field(default_factory=dict)
    task_type: Optional[str] = None
    custom_model: Optional[Any] = None

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

        if self.custom_model is not None:
            inferred_type = _infer_model_backend(self.custom_model)
            self.model_type = inferred_type
            if not self.model_name:
                self.model_name = self.custom_model.__class__.__name__.lower()
            else:
                self.model_name = str(self.model_name).strip().lower()
            if self.task_type:
                self.task_type = str(self.task_type).strip().lower()
            elif self.model_type == "sklearn":
                self.task_type = infer_task_type_from_instance(self.custom_model)
            else:
                self.task_type = "classification"
            return

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

    @classmethod
    def from_custom_model(
        cls,
        model: Any,
        config: Dict[str, Any] | None = None,
        model_name: str | None = None,
        task_type: str | None = None,
        verbose: bool = True,
    ) -> "TrainingConfig":
        """Build TrainingConfig for a caller-supplied model instance."""
        training_cfg = (config or {}).get("training", {})
        return cls(
            model_type=_infer_model_backend(model),
            model_name=(model_name or model.__class__.__name__),
            model_params={},
            task_type=task_type,
            custom_model=model,
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


def _infer_model_backend(model: Any) -> str:
    """Infer the backend for a caller-supplied model instance."""
    if torch is not None and hasattr(torch, "nn") and isinstance(model, torch.nn.Module):
        return "pytorch"
    if hasattr(model, "fit") and hasattr(model, "predict"):
        return "sklearn"
    raise ValueError(
        "Custom model must be a sklearn-style estimator with fit/predict "
        "or a torch.nn.Module."
    )


def infer_task_type_from_instance(model: Any, default: str = "classification") -> str:
    """Infer task type for a supplied model instance."""
    estimator_kind = getattr(model, "_estimator_type", None)
    if estimator_kind == "outlier_detector":
        return "anomaly"
    if estimator_kind in {"classifier", "regressor"}:
        return default
    model_name = model.__class__.__name__.lower()
    if "isolation" in model_name or "anomaly" in model_name:
        return "anomaly"
    return default


class GenericTrainingEngine:
    # Model Loading
    def __init__(self, config: TrainingConfig):
        self.config = config
        self.model = self._load_model()

    def _load_model(self):
        if self.config.custom_model is not None:
            return self.config.custom_model
        if self.config.model_type == "sklearn":
            return load_sklearn_model(self.config.model_name, self.config.model_params)
        elif self.config.model_type == "pytorch":
            return load_pytorch_model(self.config.model_name, self.config.model_params)
        else:
            raise ValueError("model_type must be 'sklearn' or 'pytorch'")

    # Training Interface
    def fit(
        self,
        X_train,
        y_train=None,
        X_val=None,
        y_val=None,
        checkpoint_manager=None,
        checkpoint_prefix: str | None = None,
        checkpoint_subdir: str | None = None,
        resume_state: dict[str, Any] | None = None,
        save_best_only: bool = True,
    ):
        if self.config.model_type == "sklearn":
            return self._fit_sklearn(X_train, y_train)
        elif self.config.model_type == "pytorch":
            if y_train is None:
                raise ValueError("y_train is required for PyTorch training.")
            return self._fit_pytorch(
                X_train,
                y_train,
                X_val,
                y_val,
                checkpoint_manager=checkpoint_manager,
                checkpoint_prefix=checkpoint_prefix,
                checkpoint_subdir=checkpoint_subdir,
                resume_state=resume_state,
                save_best_only=save_best_only,
            )
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
            print(
                f"[train] model={self.config.model_name} "
                f"type=sklearn status=trained"
            )

        return {
            "model_type": "sklearn",
            "status": "trained"
        }

    # Training Implementation PyTorch
    def _fit_pytorch(
        self,
        X_train,
        y_train,
        X_val=None,
        y_val=None,
        checkpoint_manager=None,
        checkpoint_prefix: str | None = None,
        checkpoint_subdir: str | None = None,
        resume_state: dict[str, Any] | None = None,
        save_best_only: bool = True,
    ):
        if torch is None:
            raise ImportError("PyTorch is not installed.")

        device = self.config.device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(device)

        optimizer_class = self.config.optimizer_class or torch.optim.Adam
        optimizer = optimizer_class(self.model.parameters(), lr=self.config.learning_rate)

        loss_fn = self.config.loss_fn or nn.CrossEntropyLoss() # type: ignore

        start_epoch = 0
        best_f1 = None
        best_epoch = None
        best_checkpoint_path = None
        last_checkpoint_path = None

        if resume_state:
            model_state = resume_state.get("model_state_dict")
            if model_state is None and all(
                isinstance(key, str) for key in resume_state.keys()
            ):
                model_state = resume_state
            if model_state is not None:
                self.model.load_state_dict(model_state)
            optimizer_state = resume_state.get("optimizer_state_dict")
            if optimizer_state is not None:
                optimizer.load_state_dict(optimizer_state)
            start_epoch = int(resume_state.get("epoch", -1)) + 1
            best_f1 = resume_state.get("best_f1")
            best_epoch = resume_state.get("best_epoch")

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

        if self.config.verbose:
            print(
                "[train] "
                f"model={self.config.model_name} type=pytorch "
                f"epochs={self.config.epochs} batch_size={self.config.batch_size}"
            )

        # Fit Loop
        for epoch in range(start_epoch, self.config.epochs):
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

            val_metrics = self._evaluate_validation_metrics(X_val, y_val, device)
            val_f1 = val_metrics.get("f1")
            if writer is not None and val_f1 is not None:
                for metric_name, metric_value in val_metrics.items():
                    if isinstance(metric_value, (int, float)) and metric_value is not None:
                        writer.add_scalar(f"validation/{metric_name}", float(metric_value), epoch + 1)

            is_best = val_f1 is not None and (
                best_f1 is None or float(val_f1) > float(best_f1)
            )
            if is_best:
                best_f1 = float(val_f1) # type: ignore
                best_epoch = epoch + 1

            if self.config.verbose:
                self._print_epoch_summary(
                    epoch=epoch + 1,
                    total_epochs=self.config.epochs,
                    loss=epoch_loss,
                    val_metrics=val_metrics,
                    is_best=is_best,
                )

            if checkpoint_manager is not None and checkpoint_prefix:
                state = {
                    "epoch": epoch,
                    "model_state_dict": self.model.state_dict(),
                    "optimizer_state_dict": optimizer.state_dict(),
                    "best_f1": best_f1,
                    "best_epoch": best_epoch,
                    "model_name": self.config.model_name,
                    "model_params": self.config.model_params,
                    "run_id": self.config.run_id,
                }
                last_checkpoint_path = checkpoint_manager.save_training_state(
                    state,
                    f"{checkpoint_prefix}_last",
                    subdir=checkpoint_subdir,
                )
                if is_best:
                    best_checkpoint_path = checkpoint_manager.save_training_state(
                        state,
                        f"{checkpoint_prefix}_best",
                        subdir=checkpoint_subdir,
                    )

        if writer is not None:
            writer.flush()
            writer.close()

        return {
            "model_type": "pytorch",
            "status": "trained",
            "epochs": self.config.epochs,
            "start_epoch": start_epoch + 1,
            "best_f1": best_f1,
            "best_epoch": best_epoch,
            "best_checkpoint_path": str(best_checkpoint_path) if best_checkpoint_path else None,
            "last_checkpoint_path": str(last_checkpoint_path) if last_checkpoint_path else None,
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

    def _evaluate_validation_metrics(self, X_val, y_val, device) -> dict[str, float]:
        if X_val is None or y_val is None:
            return {}
        self.model.eval()
        X_tensor = self._to_tensor(X_val, dtype=torch.float32).to(device) # type: ignore
        with torch.no_grad(): # type: ignore
            outputs = self.model(X_tensor)
            preds = torch.argmax(outputs, dim=1).cpu().numpy() # type: ignore
            probabilities = torch.softmax(outputs, dim=1).cpu().numpy() # type: ignore
        y_arr = np.asarray(y_val)
        metrics = validate_predictions(
            y_arr,
            preds,
            y_prob=probabilities,
            task_type="classification",
        )
        return {
            key: float(value)
            for key, value in metrics.items()
            if isinstance(value, (int, float)) and value is not None
        }

    @staticmethod
    def _print_epoch_summary(
        epoch: int,
        total_epochs: int,
        loss: float,
        val_metrics: dict[str, float],
        is_best: bool,
    ) -> None:
        parts = [
            f"epoch={epoch:03d}/{total_epochs:03d}",
            f"loss={loss:.4f}",
        ]
        for metric_name in ("accuracy", "precision", "recall", "f1", "auc"):
            metric_value = val_metrics.get(metric_name)
            if metric_value is not None:
                parts.append(f"val_{metric_name}={metric_value:.4f}")
        if is_best:
            parts.append("best=updated")
        print("[train] " + " | ".join(parts))

    # Input data conversion to PyTorch tensor
    @staticmethod
    def _to_tensor(data, dtype):
        if torch is None:
            raise ImportError("PyTorch is not installed.")

        if isinstance(data, torch.Tensor):
            return data.to(dtype=dtype)

        return torch.tensor(np.asarray(data), dtype=dtype)
