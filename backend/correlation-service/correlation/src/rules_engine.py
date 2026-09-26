from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import yaml


BASE_DIR = Path(__file__).resolve().parents[1]
CONFIG_PATH = BASE_DIR / "config" / "rules.yaml"


class RulesEngineError(Exception):
    pass


def load_rules() -> Dict[str, Any]:
    if not CONFIG_PATH.exists():
        raise RulesEngineError(
            f"Rules configuration not found: {CONFIG_PATH}"
        )

    with CONFIG_PATH.open("r", encoding="utf-8") as file:
        config = yaml.safe_load(file) or {}

    return config


RULES = load_rules()


def get_model_version() -> str:
    return RULES.get(
        "model",
        {},
    ).get(
        "version",
        "correlation-1.0.0",
    )


def get_threshold() -> float:
    return float(
        RULES.get(
            "threshold",
            0.2,
        )
    )


def get_enabled_checks() -> List[str]:
    return list(
        RULES.get(
            "checks",
            {},
        ).get(
            "enabled",
            [],
        )
    )


def _normalise(value: Optional[str]) -> str:
    if not value:
        return ""

    return " ".join(
        str(value).lower().split()
    )


def build_content(text: Optional[str], url: Optional[str]) -> str:
    return " ".join(
        value
        for value in [
            _normalise(text),
            _normalise(url),
        ]
        if value
    )


# -------------------------------------------------------------------
# IMPORTANT
# -------------------------------------------------------------------
#
# The Integration Guide identifies E1-E7 and says which checks are
# enabled, but it does not contain the actual algorithms for those
# checks.
#
# Do not silently invent them here.
#
# Each function below is therefore an explicit extension point for
# the actual correlation specification.
# -------------------------------------------------------------------


def evaluate_e1(
    content: str,
    hazard: Dict[str, Any],
) -> Tuple[bool, Dict[str, Any]]:
    """
    Implement E1 from docs/SPECIFICATION.md.

    The Integration Guide does not define the E1 algorithm.
    """
    return False, {}


def evaluate_e2(
    content: str,
    hazard: Dict[str, Any],
) -> Tuple[bool, Dict[str, Any]]:
    """
    Implement E2 from docs/SPECIFICATION.md.
    """
    return False, {}


def evaluate_e3(
    content: str,
    hazard: Dict[str, Any],
) -> Tuple[bool, Dict[str, Any]]:
    """
    Implement E3 from docs/SPECIFICATION.md.
    """
    return False, {}


def evaluate_e4(
    content: str,
    hazard: Dict[str, Any],
) -> Tuple[bool, Dict[str, Any]]:
    """
    Implement E4 from docs/SPECIFICATION.md.
    """
    return False, {}


def evaluate_e5(
    content: str,
    hazard: Dict[str, Any],
) -> Tuple[bool, Dict[str, Any]]:
    """
    Implement E5 from docs/SPECIFICATION.md.
    """
    return False, {}


def evaluate_e7(
    content: str,
    hazard: Dict[str, Any],
) -> Tuple[bool, Dict[str, Any]]:
    """
    Implement E7 from docs/SPECIFICATION.md.
    """
    return False, {}


CHECK_FUNCTIONS = {
    "E1": evaluate_e1,
    "E2": evaluate_e2,
    "E3": evaluate_e3,
    "E4": evaluate_e4,
    "E5": evaluate_e5,
    "E7": evaluate_e7,
}


def analyse_against_hazard(
    text: Optional[str],
    url: Optional[str],
    hazard: Dict[str, Any],
) -> Dict[str, Any]:
    content = build_content(text, url)

    enabled_checks = get_enabled_checks()
    weights = RULES.get("weights", {})

    checks_fired: List[str] = []
    check_details: Dict[str, Any] = {}

    weighted_sum = 0.0
    evaluated_weight = 0.0

    for check_name in enabled_checks:
        function = CHECK_FUNCTIONS.get(check_name)

        if function is None:
            continue

        result, details = function(
            content,
            hazard,
        )

        configured_weight = weights.get(check_name)

        if configured_weight is None:
            # The supplied Integration Guide does not provide the
            # actual weight. Do not invent one.
            continue

        weight = float(configured_weight)

        evaluated_weight += weight

        if result:
            weighted_sum += weight
            checks_fired.append(check_name)

        if details:
            check_details[check_name] = details

    score = (
        weighted_sum / evaluated_weight
        if evaluated_weight > 0
        else 0.0
    )

    threshold = get_threshold()

    is_related = score >= threshold

    return {
        "is_hazard_related": is_related,
        "correlation_probability": round(
            score,
            6,
        ),
        "checks_fired": checks_fired,
        "check_details": check_details,
    }


def classify_relationship(
    content: str,
    hazard: Dict[str, Any],
    checks_fired: List[str],
) -> str:
    """
    Relationship classification is intentionally kept separate from
    hazard correlation.

    The guide documents the allowed taxonomy, but does not provide
    enough information in this Integration Guide to reconstruct the
    classification algorithm.
    """

    if not checks_fired:
        return "unrelated"

    # Safe default until the relationship-classification rules from
    # docs/SPECIFICATION.md are available.
    return "mentions_hazard"