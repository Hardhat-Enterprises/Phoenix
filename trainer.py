from dataclasses import dataclass, field
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

from training_pipeline.src.models.model_registry import load_sklearn_model, load_pytorch_model


@dataclass
class TrainingConfig:
    model_type: str  # "sklearn" or "pytorch"
    model_name: str
    model_params: Dict[str, Any] = field(default_factory=dict)

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
    def fit(self, X_train, y_train, X_val=None, y_val=None):
        if self.config.model_type == "sklearn":
            return self._fit_sklearn(X_train, y_train)
        elif self.config.model_type == "pytorch":
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

    # Training Implementation Sklearn
    def _fit_sklearn(self, X_train, y_train):
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

        loss_fn = self.config.loss_fn or nn.CrossEntropyLoss()

        X_train_tensor = self._to_tensor(X_train, dtype=torch.float32)
        y_train_tensor = self._to_tensor(y_train, dtype=torch.long)

        train_dataset = TensorDataset(X_train_tensor, y_train_tensor)
        train_loader = DataLoader(
            train_dataset,
            batch_size=self.config.batch_size,
            shuffle=self.config.shuffle
        )

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

            if self.config.verbose:
                print(f"Epoch {epoch+1}: loss={epoch_loss:.4f}")

        return {
            "model_type": "pytorch",
            "status": "trained"
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

    # Input data conversion to PyTorch tensor
    @staticmethod
    def _to_tensor(data, dtype):
        if torch is None:
            raise ImportError("PyTorch is not installed.")

        if isinstance(data, torch.Tensor):
            return data.to(dtype=dtype)

        return torch.tensor(np.asarray(data), dtype=dtype)
