from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import pandas as pd
from sklearn.model_selection import train_test_split


@dataclass
class SplitDataset:
    x_train: pd.DataFrame
    x_val: pd.DataFrame
    x_test: pd.DataFrame
    y_train: Optional[pd.Series]
    y_val: Optional[pd.Series]
    y_test: Optional[pd.Series]


class DatasetSplitter:
    """
    Handles seeded train/validation/test splits.
    Supports optional stratification if labels are available.
    """

    @staticmethod
    def split(
        x: pd.DataFrame,
        y: Optional[pd.Series] = None,
        test_size: float = 0.2,
        val_size: float = 0.2,
        random_seed: int = 42,
        stratify: bool = True,
    ) -> SplitDataset:
        if not 0 < test_size < 1:
            raise ValueError("test_size must be between 0 and 1.")

        if not 0 < val_size < 1:
            raise ValueError("val_size must be between 0 and 1.")

        if test_size + val_size >= 1:
            raise ValueError("test_size + val_size must be less than 1.")

        stratify_labels = y if (y is not None and stratify) else None

        # first split: train vs temp
        x_train, x_temp, y_train, y_temp = train_test_split(
            x,
            y,
            test_size=(test_size + val_size),
            random_state=random_seed,
            stratify=stratify_labels,
        )

        # second split: temp -> val/test
        relative_test_size = test_size / (test_size + val_size)
        temp_stratify = y_temp if (y_temp is not None and stratify) else None

        x_val, x_test, y_val, y_test = train_test_split(
            x_temp,
            y_temp,
            test_size=relative_test_size,
            random_state=random_seed,
            stratify=temp_stratify,
        )

        return SplitDataset(
            x_train=x_train.reset_index(drop=True),
            x_val=x_val.reset_index(drop=True),
            x_test=x_test.reset_index(drop=True),
            y_train=None if y_train is None else y_train.reset_index(drop=True),
            y_val=None if y_val is None else y_val.reset_index(drop=True),
            y_test=None if y_test is None else y_test.reset_index(drop=True),
        )