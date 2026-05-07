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
    model_type: str
    model_name: str
    model_params: Dict[str, Any] = field(default_factory=dict)
    task_type: Optional[str] = None
    custom_model: Optional[Any] = None

    epochs: int = 10
    batch_size: int = 32
    learning_rate: float = 0.001
    verbose: bool = True

    optimizer_class: Optional[Any] = None
    loss_fn: Optional[Any] = None
    device: Optional[str] = None
    shuffle: bool = True
    tensorboard_enabled: bool = False
    tensorboard_log_dir: Optional[str] = None
    run_id: Optional[str] = None

    def __post_init__(self) -> None:
        raw_model_type = str(self.model_type).strip().lower()

        if self.custom_model is not None:
            self.model_type = _infer_model_backend(self.custom_model)
            self.model_name = str(
                self.model_name or self.custom_model.__class__.__name__
            ).strip().lower()

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
            self.model_name = str(self.model_name or normalized_name).strip().lower()

        if not self.model_name:
            raise ValueError(
                "model.name is required when model.type is 'sklearn' or 'pytorch'."
            )

        if self.task_type:
            self.task_type = str(self.task_type).strip().lower()
        elif self.model_type == "sklearn":
            self.task_type = infer_task_type_from_model(self.model_name)
        else:
            self.task_type = "classification"

    @classmethod
    def from_pipeline_config(
        cls,
        config: Dict[str, Any],
        verbose: bool = True,
    ) -> "TrainingConfig":
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
            run_id=training_cfg.get("run_id"),
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
        training_cfg = (config or {}).get("training", {})

        return cls(
            model_type=_infer_model_backend(model),
            model_name=model_name or model.__class__.__name__,
            model_params={},
            task_type=task_type,
            custom_model=model,
            epochs=int(training_cfg.get("epochs", 10)),
            batch_size=int(training_cfg.get("batch_size", 32)),
            learning_rate=float(training_cfg.get("learning_rate", 0.001)),
            verbose=verbose,
            tensorboard_enabled=bool(training_cfg.get("tensorboard_enabled", False)),
            tensorboard_log_dir=training_cfg.get("tensorboard_log_dir"),
            run_id=training_cfg.get("run_id"),
        )


def _map_pipeline_model(model_type: str) -> tuple[str, str]:
    mapping = {
        "random_forest": ("sklearn", "random_forest"),
        "isolation_forest": ("sklearn", "isolation_forest"),
        "pytorch_mlp": ("pytorch", "simple_mlp"),
        "simple_mlp": ("pytorch", "simple_mlp"),
        "lstm": ("pytorch", "lstm_forecaster"),
        "lstm_forecaster": ("pytorch", "lstm_forecaster"),
    }

    supported_sklearn = set(list_supported_models("sklearn"))

    if model_type in supported_sklearn:
        return "sklearn", model_type

    if model_type not in mapping:
        raise ValueError(
            "Unsupported model.type in pipeline config: "
            f"{model_type!r}. Expected one of: "
            f"{sorted(list(mapping.keys()) + list(supported_sklearn))} "
            "or use model.type='sklearn'/'pytorch' with model.name."
        )

    return mapping[model_type]


def _infer_model_backend(model: Any) -> str:
    if torch is not None and isinstance(model, torch.nn.Module):
        return "pytorch"

    if hasattr(model, "fit") and hasattr(model, "predict"):
        return "sklearn"

    raise ValueError(
        "Custom model must be a sklearn-style estimator with fit/predict "
        "or a torch.nn.Module."
    )


def infer_task_type_from_instance(
    model: Any,
    default: str = "classification",
) -> str:
    estimator_kind = getattr(model, "_estimator_type", None)

    if estimator_kind == "outlier_detector":
        return "anomaly"

    if estimator_kind == "regressor":
        return "regression"

    if estimator_kind == "classifier":
        return "classification"

    model_name = model.__class__.__name__.lower()

    if "isolation" in model_name or "anomaly" in model_name:
        return "anomaly"

    if "forecast" in model_name or "lstm" in model_name:
        return "forecasting"

    return default


def _is_forecasting_task(task_type: Optional[str]) -> bool:
    return str(task_type or "").strip().lower() in {
        "forecasting",
        "forecast",
        "regression",
        "time_series",
        "timeseries",
    }


class GenericTrainingEngine:
    def __init__(self, config: TrainingConfig):
        self.config = config
        self.model = self._load_model()

    def _load_model(self):
        if self.config.custom_model is not None:
            return self.config.custom_model

        if self.config.model_type == "sklearn":
            return load_sklearn_model(
                self.config.model_name,
                self.config.model_params,
            )

        if self.config.model_type == "pytorch":
            return load_pytorch_model(
                self.config.model_name,
                self.config.model_params,
            )

        raise ValueError("model_type must be 'sklearn' or 'pytorch'")

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

        if self.config.model_type == "pytorch":
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

        raise ValueError("Unsupported model type")

    def predict(self, X):
        if self.config.model_type == "sklearn":
            return self.model.predict(X)

        if self.config.model_type == "pytorch":
            return self._predict_pytorch(X)

        raise ValueError("Unsupported model type")

    def predict_proba(self, X):
        if self.config.model_type == "sklearn":
            if not hasattr(self.model, "predict_proba"):
                raise NotImplementedError(
                    f"Model '{self.config.model_name}' does not expose predict_proba."
                )

            probabilities = np.asarray(self.model.predict_proba(X))

            if probabilities.ndim == 2 and probabilities.shape[1] == 2:
                return probabilities[:, 1]

            return probabilities

        if self.config.model_type == "pytorch":
            if _is_forecasting_task(self.config.task_type):
                raise NotImplementedError(
                    "predict_proba is not available for forecasting/regression models."
                )

            return self._predict_proba_pytorch(X)

        raise ValueError("Unsupported model type")

    def _fit_sklearn(self, X_train, y_train):
        estimator_kind = getattr(self.model, "_estimator_type", None)

        if estimator_kind == "classifier" and y_train is None:
            raise ValueError(
                f"Model '{self.config.model_name}' requires training labels "
                "but y_train was not provided."
            )

        if y_train is None:
            self.model.fit(X_train)
        else:
            if estimator_kind == "classifier":
                y_np = np.asarray(y_train)

                if np.issubdtype(y_np.dtype, np.floating):
                    finite_mask = np.isfinite(y_np)
                    finite_values = y_np[finite_mask]

                    if finite_values.size > 0 and np.allclose(
                        finite_values,
                        np.round(finite_values),
                    ):
                        y_train = np.round(y_np).astype(int)
                    else:
                        raise ValueError(
                            "Classifier received continuous labels. "
                            "Set a discrete target column or use task_type='regression'/'forecasting'."
                        )

            self.model.fit(X_train, y_train)

        if self.config.verbose:
            print(
                f"[train] model={self.config.model_name} "
                f"type=sklearn task={self.config.task_type} status=trained"
            )

        return {
            "model_type": "sklearn",
            "task_type": self.config.task_type,
            "status": "trained",
        }

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

        is_forecasting = _is_forecasting_task(self.config.task_type)

        device = self.config.device or (
            "cuda" if torch.cuda.is_available() else "cpu"
        )
        self.model.to(device)

        optimizer_class = self.config.optimizer_class or torch.optim.Adam
        optimizer = optimizer_class(
            self.model.parameters(),
            lr=self.config.learning_rate,
        )

        if self.config.loss_fn is not None:
            loss_fn = self.config.loss_fn
        elif is_forecasting:
            loss_fn = nn.SmoothL1Loss()
        else:
            loss_fn = nn.CrossEntropyLoss()

        start_epoch = 0

        best_metric = None
        best_epoch = None
        best_checkpoint_path = None
        last_checkpoint_path = None

        best_f1 = None

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
            best_metric = resume_state.get("best_metric")
            best_epoch = resume_state.get("best_epoch")
            best_f1 = resume_state.get("best_f1")

        X_train_tensor = self._to_tensor(X_train, dtype=torch.float32)

        if is_forecasting:
            y_train_tensor = self._prepare_regression_target(y_train)
        else:
            y_train_tensor = self._to_tensor(y_train, dtype=torch.long)

        train_dataset = TensorDataset(X_train_tensor, y_train_tensor)
        train_loader = DataLoader(
            train_dataset,
            batch_size=self.config.batch_size,
            shuffle=self.config.shuffle,
        )

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
                base_dir = Path(
                    self.config.tensorboard_log_dir or "logs/tensorboard"
                )
                run_suffix = self.config.run_id or "run"
                tensorboard_log_dir = str((base_dir / run_suffix).resolve())
                writer = SummaryWriter(log_dir=tensorboard_log_dir)
                tensorboard_status = "enabled"

        epoch_losses: list[float] = []

        if self.config.verbose:
            print(
                "[train] "
                f"model={self.config.model_name} "
                f"type=pytorch "
                f"task={self.config.task_type} "
                f"epochs={self.config.epochs} "
                f"batch_size={self.config.batch_size}"
            )

        for epoch in range(start_epoch, self.config.epochs):
            self.model.train()
            epoch_loss = 0.0

            for batch_X, batch_y in train_loader:
                batch_X = batch_X.to(device)
                batch_y = batch_y.to(device)

                optimizer.zero_grad()

                outputs = self.model(batch_X)

                if is_forecasting:
                    outputs = self._match_regression_output_shape(
                        outputs,
                        batch_y,
                    )

                loss = loss_fn(outputs, batch_y)
                loss.backward()
                optimizer.step()

                epoch_loss += float(loss.item())

            epoch_loss = epoch_loss / max(1, len(train_loader))
            epoch_losses.append(float(epoch_loss))

            if writer is not None:
                writer.add_scalar("train/loss", epoch_loss, epoch + 1)
                writer.add_scalar(
                    "train/learning_rate",
                    optimizer.param_groups[0]["lr"],
                    epoch + 1,
                )

            val_metrics = self._evaluate_validation_metrics(
                X_val,
                y_val,
                device,
            )

            current_metric = self._get_checkpoint_metric(val_metrics)

            if writer is not None:
                for metric_name, metric_value in val_metrics.items():
                    if isinstance(metric_value, (int, float)):
                        writer.add_scalar(
                            f"validation/{metric_name}",
                            float(metric_value),
                            epoch + 1,
                        )

            is_best = self._is_better_metric(
                current_metric=current_metric,
                best_metric=best_metric,
            )

            if is_best:
                best_metric = float(current_metric)
                best_epoch = epoch + 1

                if not is_forecasting:
                    best_f1 = val_metrics.get("f1")

            if self.config.verbose:
                self._print_epoch_summary(
                    epoch=epoch + 1,
                    total_epochs=self.config.epochs,
                    loss=epoch_loss,
                    val_metrics=val_metrics,
                    is_best=is_best,
                    task_type=self.config.task_type,
                )

            if checkpoint_manager is not None and checkpoint_prefix:
                state = {
                    "epoch": epoch,
                    "model_state_dict": self.model.state_dict(),
                    "optimizer_state_dict": optimizer.state_dict(),
                    "best_metric": best_metric,
                    "best_f1": best_f1,
                    "best_epoch": best_epoch,
                    "model_name": self.config.model_name,
                    "model_params": self.config.model_params,
                    "task_type": self.config.task_type,
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
            "task_type": self.config.task_type,
            "status": "trained",
            "epochs": self.config.epochs,
            "start_epoch": start_epoch + 1,
            "best_metric": best_metric,
            "best_f1": best_f1,
            "best_epoch": best_epoch,
            "best_checkpoint_path": str(best_checkpoint_path)
            if best_checkpoint_path
            else None,
            "last_checkpoint_path": str(last_checkpoint_path)
            if last_checkpoint_path
            else None,
            "train_loss_by_epoch": epoch_losses,
            "tensorboard_log_dir": tensorboard_log_dir,
            "tensorboard_status": tensorboard_status,
        }

    def _predict_pytorch(self, X):
        if torch is None:
            raise ImportError("PyTorch is not installed.")

        device = self.config.device or (
            "cuda" if torch.cuda.is_available() else "cpu"
        )

        self.model.to(device)
        self.model.eval()

        X_tensor = self._to_tensor(X, dtype=torch.float32).to(device)

        with torch.no_grad():
            outputs = self.model(X_tensor)

            if _is_forecasting_task(self.config.task_type):
                return outputs.detach().cpu().numpy().squeeze()

            preds = torch.argmax(outputs, dim=1)

        return preds.cpu().numpy()

    def _predict_proba_pytorch(self, X):
        if torch is None:
            raise ImportError("PyTorch is not installed.")

        device = self.config.device or (
            "cuda" if torch.cuda.is_available() else "cpu"
        )

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

        if _is_forecasting_task(self.config.task_type):
            return self._evaluate_forecasting_metrics(X_val, y_val, device)

        return self._evaluate_classification_metrics(X_val, y_val, device)

    def _evaluate_classification_metrics(
        self,
        X_val,
        y_val,
        device,
    ) -> dict[str, float]:
        self.model.eval()

        X_tensor = self._to_tensor(X_val, dtype=torch.float32).to(device)

        with torch.no_grad():
            outputs = self.model(X_tensor)
            preds = torch.argmax(outputs, dim=1).cpu().numpy()
            probabilities = torch.softmax(outputs, dim=1).cpu().numpy()

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

    def _evaluate_forecasting_metrics(
        self,
        X_val,
        y_val,
        device,
    ) -> dict[str, float]:
        self.model.eval()

        X_tensor = self._to_tensor(X_val, dtype=torch.float32).to(device)

        with torch.no_grad():
            outputs = self.model(X_tensor)
            y_pred = outputs.detach().cpu().numpy().squeeze()

        y_true = np.asarray(y_val, dtype=np.float32).squeeze()
        y_pred = np.asarray(y_pred, dtype=np.float32).squeeze()

        mae = float(np.mean(np.abs(y_true - y_pred)))
        mse = float(np.mean((y_true - y_pred) ** 2))
        rmse = float(np.sqrt(mse))

        epsilon = 1e-8

        mape = float(
            np.mean(
                np.abs((y_true - y_pred) / (y_true + epsilon))
            ) * 100
        )

        return {
            "mae": mae,
            "mse": mse,
            "rmse": rmse,
            "mape": mape,
        }

    def _get_checkpoint_metric(self, val_metrics: dict[str, float]) -> Optional[float]:
        if not val_metrics:
            return None

        if _is_forecasting_task(self.config.task_type):
            rmse = val_metrics.get("rmse")

            if rmse is None:
                return None

            # Higher is treated as better by _is_better_metric,
            # so use negative RMSE.
            return -float(rmse)

        f1 = val_metrics.get("f1")

        if f1 is None:
            return None

        return float(f1)

    @staticmethod
    def _is_better_metric(
        current_metric: Optional[float],
        best_metric: Optional[float],
    ) -> bool:
        if current_metric is None:
            return False

        if best_metric is None:
            return True

        return float(current_metric) > float(best_metric)

    @staticmethod
    def _print_epoch_summary(
        epoch: int,
        total_epochs: int,
        loss: float,
        val_metrics: dict[str, float],
        is_best: bool,
        task_type: Optional[str] = None,
    ) -> None:
        parts = [
            f"epoch={epoch:03d}/{total_epochs:03d}",
            f"loss={loss:.4f}",
        ]

        if _is_forecasting_task(task_type):
            for metric_name in ("mae", "rmse", "mape"):
                metric_value = val_metrics.get(metric_name)

                if metric_value is not None:
                    parts.append(f"val_{metric_name}={metric_value:.4f}")
        else:
            for metric_name in ("accuracy", "precision", "recall", "f1", "auc"):
                metric_value = val_metrics.get(metric_name)

                if metric_value is not None:
                    parts.append(f"val_{metric_name}={metric_value:.4f}")

        if is_best:
            parts.append("best=updated")

        print("[train] " + " | ".join(parts))

    @staticmethod
    def _to_tensor(data, dtype):
        if torch is None:
            raise ImportError("PyTorch is not installed.")

        if isinstance(data, torch.Tensor):
            return data.to(dtype=dtype)

        return torch.tensor(np.asarray(data), dtype=dtype)

    @staticmethod
    def _prepare_regression_target(y):
        if torch is None:
            raise ImportError("PyTorch is not installed.")

        if isinstance(y, torch.Tensor):
            y_tensor = y.to(dtype=torch.float32)
        else:
            y_tensor = torch.tensor(np.asarray(y), dtype=torch.float32)

        if y_tensor.ndim == 1:
            y_tensor = y_tensor.view(-1, 1)

        return y_tensor

    @staticmethod
    def _match_regression_output_shape(outputs, targets):
        if outputs.shape == targets.shape:
            return outputs

        if outputs.ndim == 2 and outputs.shape[1] == 1 and targets.ndim == 1:
            return outputs.squeeze(1)

        if outputs.ndim == 1 and targets.ndim == 2 and targets.shape[1] == 1:
            return outputs.view(-1, 1)

        return outputs