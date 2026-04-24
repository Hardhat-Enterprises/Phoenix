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
        time_column: Optional[str] = None,
    ) -> SplitDataset:
        if not 0 < test_size < 1:
            raise ValueError("test_size must be between 0 and 1.")

        if not 0 < val_size < 1:
            raise ValueError("val_size must be between 0 and 1.")

        if test_size + val_size >= 1:
            raise ValueError("test_size + val_size must be less than 1.")

        # Handle time-series split if time_column is provided
        if time_column is not None:
            if time_column not in x.columns:
                raise ValueError(f"Time column '{time_column}' not found in dataset.")
            
            # Combine x and y for sorting
            combined = x.copy()
            if y is not None:
                combined[y.name] = y
            
            # Sort by time
            combined = combined.sort_values(time_column).reset_index(drop=True)
            
            # Split indices
            n = len(combined)
            train_end = int(n * (1 - val_size - test_size))
            val_end = int(n * (1 - test_size))
            
            train_indices = combined.index[:train_end]
            val_indices = combined.index[train_end:val_end]
            test_indices = combined.index[val_end:]
            
            # Split data
            x_train = combined.loc[train_indices, x.columns].reset_index(drop=True)
            x_val = combined.loc[val_indices, x.columns].reset_index(drop=True)
            x_test = combined.loc[test_indices, x.columns].reset_index(drop=True)
            
            y_train = None if y is None else combined.loc[train_indices, y.name].reset_index(drop=True)
            y_val = None if y is None else combined.loc[val_indices, y.name].reset_index(drop=True)
            y_test = None if y is None else combined.loc[test_indices, y.name].reset_index(drop=True)
            
            return SplitDataset(
                x_train=x_train,
                x_val=x_val,
                x_test=x_test,
                y_train=y_train,
                y_val=y_val,
                y_test=y_test,
            )

        # Original random split logic
        stratify_labels = y if (y is not None and stratify) else None

        # first split: train vs temp
        try:
            x_train, x_temp, y_train, y_temp = train_test_split(
                x,
                y,
                test_size=(test_size + val_size),
                random_state=random_seed,
                stratify=stratify_labels,
            )
        except ValueError:
            x_train, x_temp, y_train, y_temp = train_test_split(
                x,
                y,
                test_size=(test_size + val_size),
                random_state=random_seed,
                stratify=None,
            )

        # second split: temp -> val/test
        relative_test_size = test_size / (test_size + val_size)
        temp_stratify = y_temp if (y_temp is not None and stratify) else None

        try:
            x_val, x_test, y_val, y_test = train_test_split(
                x_temp,
                y_temp,
                test_size=relative_test_size,
                random_state=random_seed,
                stratify=temp_stratify,
            )
        except ValueError:
            x_val, x_test, y_val, y_test = train_test_split(
                x_temp,
                y_temp,
                test_size=relative_test_size,
                random_state=random_seed,
                stratify=None,
            )

        return SplitDataset(
            x_train=x_train.reset_index(drop=True),
            x_val=x_val.reset_index(drop=True),
            x_test=x_test.reset_index(drop=True),
            y_train=None if y_train is None else y_train.reset_index(drop=True),
            y_val=None if y_val is None else y_val.reset_index(drop=True),
            y_test=None if y_test is None else y_test.reset_index(drop=True),
        )
