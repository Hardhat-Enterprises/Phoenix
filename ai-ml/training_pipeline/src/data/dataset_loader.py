from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import pandas as pd


@dataclass
class LoadedDataset:
    name: str
    data: pd.DataFrame
    path: Path


class DatasetLoader:
    """
    Independent dataset loader for PHOENIX training pipeline.
    Keeps loading logic separate from preprocessing and training.
    """

    SUPPORTED_EXTENSIONS = {".csv"}

    @staticmethod
    def from_dataframe(
        df: pd.DataFrame,
        name: str = "in_memory_dataset",
    ) -> LoadedDataset:
        """Wrap an in-memory dataframe so the pipeline can treat it like a loaded dataset."""
        if df.empty:
            raise ValueError("Loaded dataset is empty: in-memory dataframe")

        return LoadedDataset(
            name=name,
            data=df.copy(),
            path=Path(f"<in-memory>/{name}.csv"),
        )

    @staticmethod
    def load_csv(path: str | Path, name: Optional[str] = None) -> LoadedDataset:
        file_path = Path(path)

        if not file_path.exists():
            raise FileNotFoundError(f"Dataset file not found: {file_path}")

        if file_path.suffix.lower() not in DatasetLoader.SUPPORTED_EXTENSIONS:
            raise ValueError(
                f"Unsupported file format: {file_path.suffix}. "
                f"Supported formats: {DatasetLoader.SUPPORTED_EXTENSIONS}"
            )

        df = pd.read_csv(file_path)

        if df.empty:
            raise ValueError(f"Loaded dataset is empty: {file_path}")

        dataset_name = name or file_path.stem
        return LoadedDataset(name=dataset_name, data=df, path=file_path)

    @staticmethod
    def load_main_and_abnormal(
        main_path: str | Path,
        abnormal_path: Optional[str | Path] = None,
    ) -> tuple[LoadedDataset, Optional[LoadedDataset]]:
        main_dataset = DatasetLoader.load_csv(main_path, name="main_dataset")

        abnormal_dataset = None
        if abnormal_path is not None:
            abnormal_dataset = DatasetLoader.load_csv(
                abnormal_path,
                name="abnormal_dataset",
            )

        return main_dataset, abnormal_dataset

    @staticmethod
    def separate_features_and_target(
        df: pd.DataFrame,
        target_column: Optional[str] = None,
    ) -> tuple[pd.DataFrame, Optional[pd.Series]]:
        if target_column is None:
            return df.copy(), None

        if target_column not in df.columns:
            raise KeyError(f"Target column '{target_column}' not found in dataset.")

        x = df.drop(columns=[target_column]).copy()
        y = df[target_column].copy()
        return x, y
