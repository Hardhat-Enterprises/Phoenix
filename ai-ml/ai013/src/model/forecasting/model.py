import numpy as np


def sigmoid(x):
    return 1 / (1 + np.exp(-np.clip(x, -500, 500)))


def tanh(x):
    return np.tanh(x)


class LSTMCell:
    """Single LSTM cell implemented with numpy."""

    def __init__(self, input_size: int, hidden_size: int):
        scale = 0.1
        # Forget gate
        self.Wf = np.random.randn(hidden_size, hidden_size + input_size) * scale
        self.bf = np.zeros((hidden_size, 1))
        # Input gate
        self.Wi = np.random.randn(hidden_size, hidden_size + input_size) * scale
        self.bi = np.zeros((hidden_size, 1))
        # Cell gate
        self.Wc = np.random.randn(hidden_size, hidden_size + input_size) * scale
        self.bc = np.zeros((hidden_size, 1))
        # Output gate
        self.Wo = np.random.randn(hidden_size, hidden_size + input_size) * scale
        self.bo = np.zeros((hidden_size, 1))

    def forward(self, x, h_prev, c_prev):
        combined = np.vstack([h_prev, x])
        f = sigmoid(self.Wf @ combined + self.bf)
        i = sigmoid(self.Wi @ combined + self.bi)
        c_tilde = tanh(self.Wc @ combined + self.bc)
        c = f * c_prev + i * c_tilde
        o = sigmoid(self.Wo @ combined + self.bo)
        h = o * tanh(c)
        return h, c


class ForecastingModel:
    """
    Simple LSTM-based forecasting model using numpy.
    Predicts a single numeric value (severity_score).
    """

    def __init__(self, input_size: int = 5, hidden_size: int = 16):
        self.hidden_size = hidden_size
        self.lstm = LSTMCell(input_size, hidden_size)
        # Output layer weights
        self.Wy = np.random.randn(1, hidden_size) * 0.1
        self.by = np.zeros((1, 1))

    def forward(self, X: np.ndarray) -> np.ndarray:
        """
        Forward pass over a batch of sequences.

        Args:
            X: (batch_size, sequence_length, input_size)

        Returns:
            predictions: (batch_size,)
        """
        batch_size = X.shape[0]
        predictions = []

        for b in range(batch_size):
            h = np.zeros((self.hidden_size, 1))
            c = np.zeros((self.hidden_size, 1))
            for t in range(X.shape[1]):
                x_t = X[b, t, :].reshape(-1, 1)
                h, c = self.lstm.forward(x_t, h, c)
            y = self.Wy @ h + self.by
            predictions.append(y[0, 0])

        return np.array(predictions)

    def save(self, path: str):
        """Save model weights to a .npz file."""
        np.savez(path,
                 Wf=self.lstm.Wf, bf=self.lstm.bf,
                 Wi=self.lstm.Wi, bi=self.lstm.bi,
                 Wc=self.lstm.Wc, bc=self.lstm.bc,
                 Wo=self.lstm.Wo, bo=self.lstm.bo,
                 Wy=self.Wy, by=self.by)
        print(f"Model saved to {path}")

    def load(self, path: str):
        """Load model weights from a .npz file."""
        data = np.load(path)
        self.lstm.Wf = data['Wf']
        self.lstm.bf = data['bf']
        self.lstm.Wi = data['Wi']
        self.lstm.bi = data['bi']
        self.lstm.Wc = data['Wc']
        self.lstm.bc = data['bc']
        self.lstm.Wo = data['Wo']
        self.lstm.bo = data['bo']
        self.Wy = data['Wy']
        self.by = data['by']
        print(f"Model loaded from {path}")


if __name__ == "__main__":
    model = ForecastingModel(input_size=5, hidden_size=16)
    dummy = np.random.randn(4, 5, 5)
    preds = model.forward(dummy)
    print(f"Test predictions: {preds}")
