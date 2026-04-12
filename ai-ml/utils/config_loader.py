"""
src/utils/config_loader.py
W6-T2 — Configuration Management System (main interface).

Usage:
    from src.utils.config_loader import load_config

    config = load_config("configs/default.yaml")
    print(config["training"]["learning_rate"])

Environment variable overrides:
    Any config value can be overridden at runtime using env vars with the
    pattern:  PIPELINE_<SECTION>__<KEY>=value

    Examples:
        PIPELINE_TRAINING__EPOCHS=100
        PIPELINE_DATASET__PATH=/data/new_dataset.csv
        PIPELINE_MODEL__TYPE=isolation_forest

    Type coercion is automatic (bool, int, float, str).
"""

import os
import json
import copy
from pathlib import Path
from typing import Union

from utils.config_validator import validate_config, ConfigValidationError

try:
    import yaml
    _YAML_AVAILABLE = True
except ImportError:
    _YAML_AVAILABLE = False


# ── Helpers ──────────────────────────────────────────────────────────────────

def _coerce(value: str):
    """Auto-coerce a string env var value to bool / int / float / str."""
    if value.lower() in ("true", "yes", "1"):
        return True
    if value.lower() in ("false", "no", "0"):
        return False
    try:
        return int(value)
    except ValueError:
        pass
    try:
        return float(value)
    except ValueError:
        pass
    return value


def _deep_merge(base: dict, override: dict) -> dict:
    """Recursively merge override into base (non-destructive on base)."""
    result = copy.deepcopy(base)
    for key, val in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(val, dict):
            result[key] = _deep_merge(result[key], val)
        else:
            result[key] = val
    return result


# ── Environment overrides ─────────────────────────────────────────────────────

_ENV_PREFIX = "PIPELINE_"


def _apply_env_overrides(config: dict) -> dict:
    """
    Scan environment for PIPELINE_<SECTION>__<KEY> variables and apply them.

    Example:
        PIPELINE_TRAINING__LEARNING_RATE=0.0005
        → config["training"]["learning_rate"] = 0.0005
    """
    overrides = {}
    for env_key, env_val in os.environ.items():
        if not env_key.startswith(_ENV_PREFIX):
            continue
        remainder = env_key[len(_ENV_PREFIX):]           # e.g. TRAINING__LEARNING_RATE
        if "__" not in remainder:
            continue
        section, key = remainder.split("__", 1)
        section = section.lower()
        key = key.lower()
        if section not in overrides:
            overrides[section] = {}
        overrides[section][key] = _coerce(env_val)

    if overrides:
        config = _deep_merge(config, overrides)

    return config


# ── Loaders ───────────────────────────────────────────────────────────────────

def _load_yaml(path: Path) -> dict:
    if not _YAML_AVAILABLE:
        raise ImportError(
            "PyYAML is not installed. Run: pip install pyyaml"
        )
    with open(path, "r") as f:
        return yaml.safe_load(f) or {}


def _load_json(path: Path) -> dict:
    with open(path, "r") as f:
        return json.load(f)


# ── Public API ────────────────────────────────────────────────────────────────

def load_config(config_path: Union[str, Path], validate: bool = True) -> dict:
    """
    Load a YAML or JSON config file, apply env overrides, and validate.

    Args:
        config_path: Path to .yaml, .yml, or .json config file.
        validate:    If True (default), run schema validation + defaults fill.

    Returns:
        Validated config dict with all defaults applied.

    Raises:
        FileNotFoundError:      If config file does not exist.
        ValueError:             If file format is not supported.
        ConfigValidationError:  If config fails schema validation.
    """
    path = Path(config_path)

    if not path.exists():
        raise FileNotFoundError(f"Config file not found: {path}")

    suffix = path.suffix.lower()
    if suffix in (".yaml", ".yml"):
        raw = _load_yaml(path)
    elif suffix == ".json":
        raw = _load_json(path)
    else:
        raise ValueError(
            f"Unsupported config format '{suffix}'. Use .yaml, .yml, or .json"
        )

    # Apply environment variable overrides
    raw = _apply_env_overrides(raw)

    # Validate and fill defaults
    if validate:
        raw = validate_config(raw)

    return raw


def load_config_from_dict(data: dict, validate: bool = True) -> dict:
    """
    Load config directly from a Python dict (useful for testing).

    Args:
        data:     Config as a plain dict.
        validate: If True, run schema validation.

    Returns:
        Validated config dict.
    """
    config = copy.deepcopy(data)
    config = _apply_env_overrides(config)
    if validate:
        config = validate_config(config)
    return config
