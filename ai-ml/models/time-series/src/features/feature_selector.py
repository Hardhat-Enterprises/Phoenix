"""
feature_selector.py
Selects relevant features for the forecasting model based on correlation with target.
"""

import pandas as pd
import numpy as np


def correlation_scores(df: pd.DataFrame, feature_cols: list, target_col: str) -> pd.Series:
    """
    Returns Pearson correlation of each feature with the target, sorted by absolute value.
    """
    corr = df[feature_cols + [target_col]].corr()[target_col].drop(target_col)
    return corr.reindex(corr.abs().sort_values(ascending=False).index)


def select_top_features(df: pd.DataFrame, feature_cols: list, target_col: str, top_n: int = None) -> list:
    """
    Returns features sorted by absolute correlation with target.
    If top_n is set, returns only the top N features.
    """
    scores = correlation_scores(df, feature_cols, target_col)
    selected = scores.index.tolist()
    if top_n:
        selected = selected[:top_n]
    return selected


def drop_low_variance(df: pd.DataFrame, feature_cols: list, threshold: float = 0.01) -> list:
    """
    Drop features with variance below threshold (normalised 0-1 scale).
    """
    from sklearn.preprocessing import MinMaxScaler
    scaled = MinMaxScaler().fit_transform(df[feature_cols])
    variances = scaled.var(axis=0)
    return [col for col, var in zip(feature_cols, variances) if var >= threshold]


def get_feature_summary(df: pd.DataFrame, feature_cols: list, target_col: str) -> pd.DataFrame:
    """
    Returns a summary DataFrame with correlation, variance, and missing value count per feature.
    """
    corr = df[feature_cols + [target_col]].corr()[target_col].drop(target_col)
    summary = pd.DataFrame({
        'correlation' : corr,
        'variance'    : df[feature_cols].var(),
        'missing'     : df[feature_cols].isnull().sum()
    }).sort_values('correlation', key=abs, ascending=False)
    return summary
