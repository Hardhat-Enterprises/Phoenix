"""Public configuration management interface for W6-T2."""

from pathlib import Path
from typing import Any, Dict

try:
    from ..utils.config_loader import load_config as _load_config
    from ..utils.config_loader import load_config_from_dict as _load_config_from_dict
    from ..utils.config_validator import ConfigValidationError
except ImportError:
    from utils.config_loader import load_config as _load_config
    from utils.config_loader import load_config_from_dict as _load_config_from_dict
    from utils.config_validator import ConfigValidationError


def load_config(config_path: str | Path) -> Dict[str, Any]:
    """Load a YAML or JSON config file through the shared config loader."""
    return _load_config(config_path)


def load_config_from_dict(data: Dict[str, Any], validate: bool = True) -> Dict[str, Any]:
    """Load config data from a Python dict."""
    return _load_config_from_dict(data, validate=validate)


__all__ = ["ConfigValidationError", "load_config", "load_config_from_dict"]
