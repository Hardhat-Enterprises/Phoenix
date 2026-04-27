"""
src/utils/config_validator.py
W6-T2 — Configuration validation logic.

Validates a loaded config dict against CONFIG_SCHEMA:
  - checks all required keys are present
  - fills in defaults for optional missing keys
  - checks types
  - checks allowed values for enum fields
  - validates split ratios sum to ~1.0
"""

try:
    from .config_schema import CONFIG_SCHEMA
except ImportError:
    from utils.config_schema import CONFIG_SCHEMA


class ConfigValidationError(Exception):
    """Raised when config fails validation."""
    pass


def validate_config(config: dict) -> dict:
    """
    Validate config against schema. Fills in defaults for missing optional keys.

    Args:
        config: Raw config dict (from YAML / JSON load).

    Returns:
        config dict with defaults applied.

    Raises:
        ConfigValidationError: On any missing required key, wrong type, or bad value.
    """
    errors = []

    for section, fields in CONFIG_SCHEMA.items():
        if section not in config:
            # If entire section is missing, check if any field in it is required
            missing_required = [k for k, (_, req, _, _) in fields.items() if req]
            if missing_required:
                errors.append(
                    f"Missing required config section '{section}' "
                    f"(required fields: {missing_required})"
                )
            else:
                # All optional — insert section with defaults
                config[section] = {}

        section_cfg = config.get(section, {})

        for key, (expected_type, required, allowed, default) in fields.items():
            if key not in section_cfg:
                if required:
                    errors.append(f"Missing required key: [{section}].{key}")
                else:
                    section_cfg[key] = default
                continue

            value = section_cfg[key]

            # Type check (bool is subclass of int in Python, handle explicitly)
            if expected_type is bool:
                if not isinstance(value, bool):
                    errors.append(
                        f"[{section}].{key} must be bool, got {type(value).__name__}"
                    )
            elif expected_type is float:
                # Accept int as float (e.g. 1 instead of 1.0)
                if not isinstance(value, (int, float)):
                    errors.append(
                        f"[{section}].{key} must be float, got {type(value).__name__}"
                    )
                else:
                    section_cfg[key] = float(value)
            elif not isinstance(value, expected_type):
                errors.append(
                    f"[{section}].{key} must be {expected_type.__name__}, "
                    f"got {type(value).__name__}"
                )

            # Allowed values check
            if allowed is not None and value not in allowed:
                errors.append(
                    f"[{section}].{key} = '{value}' is not valid. "
                    f"Allowed: {allowed}"
                )

        config[section] = section_cfg

    # Cross-field validation: splits must sum to ~1.0
    if "dataset" in config:
        splits = (
            config["dataset"].get("train_split", 0)
            + config["dataset"].get("val_split", 0)
            + config["dataset"].get("test_split", 0)
        )
        if not (0.999 <= splits <= 1.001):
            errors.append(
                f"dataset splits must sum to 1.0, got {splits:.4f} "
                f"(train={config['dataset'].get('train_split')}, "
                f"val={config['dataset'].get('val_split')}, "
                f"test={config['dataset'].get('test_split')})"
            )

    if errors:
        msg = "\n  ".join(errors)
        raise ConfigValidationError(f"Config validation failed:\n  {msg}")

    return config
