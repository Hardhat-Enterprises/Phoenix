"""
evaluate.py  — AI013 Forecasting
Evaluation and reproducibility module.
Computes metrics, generates plots, and produces a summary report.

Author: Tarun Kumar Atla
"""

import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


# ── Metrics ──────────────────────────────────────────────────────────────────

def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    """
    Returns MAE, RMSE, R2, and MAPE for a set of predictions.
    All inputs should be 1D or (n,1) arrays in original scale.
    """
    y_true = y_true.flatten()
    y_pred = y_pred.flatten()

    mae  = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2   = r2_score(y_true, y_pred)

    # MAPE — skip zeros to avoid division error
    mask = y_true != 0
    mape = np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100

    return {'MAE': round(mae, 4), 'RMSE': round(rmse, 4), 'R2': round(r2, 4), 'MAPE': round(mape, 2)}


def print_metrics(metrics: dict, model_name: str = 'LSTM'):
    print(f'\n── {model_name} Metrics ──────────────────')
    for k, v in metrics.items():
        print(f'  {k:<6}: {v}')
    print()


def compare_metrics(metrics_dict: dict):
    """
    Print a side-by-side comparison table for multiple models.
    metrics_dict: { 'LSTM': {...}, 'Baseline': {...} }
    """
    keys   = list(next(iter(metrics_dict.values())).keys())
    names  = list(metrics_dict.keys())
    header = f'{"Metric":<8}' + ''.join(f'{n:>12}' for n in names)
    print(header)
    print('-' * len(header))
    for k in keys:
        row = f'{k:<8}' + ''.join(f'{metrics_dict[n][k]:>12}' for n in names)
        print(row)


# ── Plots ─────────────────────────────────────────────────────────────────────

def plot_predictions(y_true: np.ndarray, y_pred: np.ndarray, baseline: np.ndarray = None,
                     dates=None, save_path: str = None):
    """
    Line chart of actual vs predicted (and optional baseline).
    """
    try:
        plt.style.use('seaborn-v0_8-darkgrid')
    except OSError:
        plt.style.use('ggplot')

    fig, axes = plt.subplots(1, 2, figsize=(16, 5))

    x = dates if dates is not None else range(len(y_true))

    axes[0].plot(x, y_true.flatten(), color='#2c3e50', linewidth=2,
                 marker='o', markersize=4, label='Actual')
    axes[0].plot(x, y_pred.flatten(), color='#e74c3c', linewidth=1.8,
                 linestyle='--', marker='s', markersize=4, label='LSTM')
    if baseline is not None:
        axes[0].plot(x, baseline.flatten(), color='#27ae60', linewidth=1.5,
                     linestyle=':', marker='^', markersize=4, label='Baseline')
    axes[0].set_title('Predicted vs Actual', fontsize=12, fontweight='bold')
    axes[0].set_ylabel('Fire Radiative Power (MW)')
    axes[0].legend()

    lo = min(y_true.min(), y_pred.min()) - 1
    hi = max(y_true.max(), y_pred.max()) + 1
    axes[1].scatter(y_true, y_pred, color='#e74c3c', alpha=0.7, edgecolors='black', s=60, label='LSTM')
    if baseline is not None:
        axes[1].scatter(y_true, baseline, color='#27ae60', alpha=0.5, edgecolors='black',
                        s=50, marker='^', label='Baseline')
    axes[1].plot([lo, hi], [lo, hi], 'k--', linewidth=1.5, label='Perfect')
    axes[1].set_title('Actual vs Predicted Scatter', fontsize=12, fontweight='bold')
    axes[1].set_xlabel('Actual')
    axes[1].set_ylabel('Predicted')
    axes[1].legend()

    plt.tight_layout()
    if save_path:
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        plt.savefig(save_path, dpi=150)
    plt.show()


def plot_residuals(y_true: np.ndarray, y_pred: np.ndarray, save_path: str = None):
    residuals = y_true.flatten() - y_pred.flatten()

    fig, axes = plt.subplots(1, 2, figsize=(14, 4))

    axes[0].bar(range(len(residuals)), residuals,
                color=['#27ae60' if r >= 0 else '#e74c3c' for r in residuals])
    axes[0].axhline(0, color='black', linewidth=1)
    axes[0].set_title('Residuals per Sample', fontweight='bold')
    axes[0].set_xlabel('Sample')
    axes[0].set_ylabel('Actual - Predicted')

    axes[1].hist(residuals, bins=15, color='#8e44ad', edgecolor='black', alpha=0.8)
    axes[1].axvline(0, color='red', linewidth=1.5, linestyle='--')
    axes[1].set_title('Residual Distribution', fontweight='bold')
    axes[1].set_xlabel('Residual')
    axes[1].set_ylabel('Frequency')

    plt.tight_layout()
    if save_path:
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        plt.savefig(save_path, dpi=150)
    plt.show()
    print(f"mean residual: {residuals.mean():.3f}  (closer to 0 = less bias)")


def plot_loss_curve(train_losses: list, val_losses: list, save_path: str = None):
    fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(train_losses, label='Train', color='#2980b9', linewidth=1.5)
    ax.plot(val_losses,   label='Val',   color='#e74c3c',  linewidth=1.5)
    ax.set_title('Training Loss (MSE)', fontsize=13, fontweight='bold')
    ax.set_xlabel('Epoch')
    ax.set_ylabel('MSE Loss')
    ax.legend()
    plt.tight_layout()
    if save_path:
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        plt.savefig(save_path, dpi=150)
    plt.show()


def plot_metric_comparison(metrics_dict: dict, save_path: str = None):
    """
    Side-by-side bar chart comparing MAE and RMSE across models.
    """
    models  = list(metrics_dict.keys())
    mae_vals  = [metrics_dict[m]['MAE']  for m in models]
    rmse_vals = [metrics_dict[m]['RMSE'] for m in models]

    x = np.arange(2)
    w = 0.35
    colours = ['#e74c3c', '#27ae60', '#2980b9', '#8e44ad'][:len(models)]

    fig, ax = plt.subplots(figsize=(8, 4))
    for i, (m, c) in enumerate(zip(models, colours)):
        ax.bar(x + i * w - w * (len(models) - 1) / 2,
               [metrics_dict[m]['MAE'], metrics_dict[m]['RMSE']],
               w, label=m, color=c, edgecolor='black')

    ax.set_xticks(x)
    ax.set_xticklabels(['MAE', 'RMSE'])
    ax.set_title('Model Comparison — Error Metrics', fontsize=12, fontweight='bold')
    ax.set_ylabel('Error')
    ax.legend()
    plt.tight_layout()
    if save_path:
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        plt.savefig(save_path, dpi=150)
    plt.show()


# ── Report ────────────────────────────────────────────────────────────────────

def generate_report(metrics_dict: dict, output_path: str = None) -> pd.DataFrame:
    """
    Build a metrics summary DataFrame and optionally save as CSV.
    """
    rows = []
    for model_name, m in metrics_dict.items():
        rows.append({'model': model_name, **m})
    report = pd.DataFrame(rows).set_index('model')

    if output_path:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        report.to_csv(output_path)
        print(f"report saved → {output_path}")

    return report


# ── Reproducibility ───────────────────────────────────────────────────────────

def set_seeds(seed: int = 42):
    """
    Set all random seeds for reproducibility across numpy and torch.
    """
    import random
    import torch
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark     = False
    print(f"seeds set to {seed}")
