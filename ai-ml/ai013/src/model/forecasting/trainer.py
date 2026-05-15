import numpy as np
from model import ForecastingModel


def mse_loss(y_pred: np.ndarray, y_true: np.ndarray) -> float:
    return float(np.mean((y_pred - y_true) ** 2))


def train(model: ForecastingModel, X_train: np.ndarray, y_train: np.ndarray,
          epochs: int = 50, learning_rate: float = 0.001,
          batch_size: int = 4) -> list:
    """
    Train the forecasting model using simple gradient approximation.

    Args:
        model: ForecastingModel instance
        X_train: training sequences
        y_train: training targets
        epochs: number of training epochs
        learning_rate: step size for weight updates
        batch_size: samples per batch

    Returns:
        loss_history: list of loss per epoch
    """
    loss_history = []
    epsilon = 1e-4  # for numerical gradient

    for epoch in range(epochs):
        epoch_losses = []

        # Shuffle training data
        indices = np.random.permutation(len(X_train))
        X_shuffled = X_train[indices]
        y_shuffled = y_train[indices]

        for start in range(0, len(X_shuffled), batch_size):
            X_batch = X_shuffled[start:start + batch_size]
            y_batch = y_shuffled[start:start + batch_size]

            y_pred = model.forward(X_batch)
            loss = mse_loss(y_pred, y_batch)
            epoch_losses.append(loss)

            # Numerical gradient approximation for output weights only
            for i in range(model.Wy.shape[0]):
                for j in range(model.Wy.shape[1]):
                    original = model.Wy[i, j]
                    model.Wy[i, j] = original + epsilon
                    loss_plus = mse_loss(model.forward(X_batch), y_batch)
                    model.Wy[i, j] = original - epsilon
                    loss_minus = mse_loss(model.forward(X_batch), y_batch)
                    model.Wy[i, j] = original
                    grad = (loss_plus - loss_minus) / (2 * epsilon)
                    model.Wy[i, j] -= learning_rate * grad

        avg_loss = float(np.mean(epoch_losses))
        loss_history.append(avg_loss)

        if (epoch + 1) % 10 == 0:
            print(f"Epoch {epoch + 1}/{epochs} | Loss: {avg_loss:.4f}")

    return loss_history


if __name__ == "__main__":
    from sequence_generator import create_sequences, train_test_split_sequences
    from dataset_builder import build_dataset
    from pathlib import Path

    data_path = Path(__file__).resolve().parents[5] / "cleaning" / "data" / "output" / "cleaned_data.csv"
    df = build_dataset(str(data_path))
    X, y = create_sequences(df, sequence_length=5)
    X_train, X_test, y_train, y_test = train_test_split_sequences(X, y)

    model = ForecastingModel(input_size=5, hidden_size=16)
    loss_history = train(model, X_train, y_train, epochs=50)

    save_path = Path(__file__).resolve().parents[5] / "models" / "ai013_forecasting" / "forecasting_model.npz"
    save_path.parent.mkdir(parents=True, exist_ok=True)
    model.save(str(save_path))
    print("Training complete.")
