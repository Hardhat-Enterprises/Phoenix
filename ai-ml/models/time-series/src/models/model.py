"""
model.py
LSTM forecasting model for AI013 time series task.
"""

import torch
import torch.nn as nn


class LSTMForecaster(nn.Module):
    """
    Single-layer LSTM for time series forecasting.
    Input : (batch, window, n_features)
    Output: (batch, 1)
    """

    def __init__(self, input_size: int, hidden_size: int = 64, dropout: float = 0.2, num_layers: int = 1):
        super().__init__()
        self.lstm    = nn.LSTM(input_size, hidden_size, num_layers=num_layers, batch_first=True)
        self.dropout = nn.Dropout(dropout)
        self.fc      = nn.Linear(hidden_size, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out, _ = self.lstm(x)
        return self.fc(self.dropout(out[:, -1, :]))


def build_model(input_size: int, hidden_size: int = 64, dropout: float = 0.2, num_layers: int = 1) -> LSTMForecaster:
    return LSTMForecaster(input_size, hidden_size, dropout, num_layers)


def train_epoch(model, loader, loss_fn, optimiser, device, grad_clip=1.0):
    model.train()
    losses = []
    for xb, yb in loader:
        xb, yb = xb.to(device), yb.to(device)
        optimiser.zero_grad()
        loss = loss_fn(model(xb), yb)
        loss.backward()
        nn.utils.clip_grad_norm_(model.parameters(), grad_clip)
        optimiser.step()
        losses.append(loss.item())
    return sum(losses) / len(losses)


def val_loss(model, X_val, y_val, loss_fn, device):
    model.eval()
    with torch.no_grad():
        return loss_fn(model(X_val.to(device)), y_val.to(device)).item()


def fit(model, train_loader, X_val, y_val, epochs=200, lr=0.001,
        weight_decay=1e-4, patience=20, grad_clip=1.0, device='cpu', verbose=True):
    """
    Full training loop with best-weight saving and LR scheduling.
    Returns (train_losses, val_losses).
    """
    loss_fn   = nn.MSELoss()
    optimiser = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=weight_decay)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimiser, patience=patience, factor=0.5)

    train_losses, val_losses         = [], []
    best_val_loss, best_weights      = float('inf'), None

    for epoch in range(1, epochs + 1):
        t_loss = train_epoch(model, train_loader, loss_fn, optimiser, device, grad_clip)
        v_loss = val_loss(model, X_val, y_val, loss_fn, device)

        train_losses.append(t_loss)
        val_losses.append(v_loss)
        scheduler.step(v_loss)

        if v_loss < best_val_loss:
            best_val_loss = v_loss
            best_weights  = {k: v.clone() for k, v in model.state_dict().items()}

        if verbose and (epoch == 1 or epoch % 50 == 0):
            print(f"epoch {epoch:3d}  train: {t_loss:.5f}  val: {v_loss:.5f}")

    model.load_state_dict(best_weights)
    if verbose:
        print(f"\nbest val loss: {best_val_loss:.5f}")

    return train_losses, val_losses
