"""Random seed utility placeholder."""

import random


def set_seed(seed: int = 42) -> None:
    """Set the Python random seed.

    This can later be extended for NumPy and PyTorch.
    """
    random.seed(seed)
