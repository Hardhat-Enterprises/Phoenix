"""Random seed utility placeholder."""

import random

import numpy as np

try:
    import torch
except Exception:
    torch = None


def set_seed(seed: int = 42) -> None:
    """Set random seeds for Python, NumPy, and PyTorch when available."""
    random.seed(seed)
    np.random.seed(seed)

    if torch is not None:
        torch.manual_seed(seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(seed)
