"""Logging placeholder for W6-T8."""

import logging


def get_logger(name: str = "training_pipeline") -> logging.Logger:
    """Return a configured logger.

    Placeholder implementation for Week 6 Task 8.
    """
    logger = logging.getLogger(name)
    if not logger.handlers:
        logging.basicConfig(level=logging.INFO)
    return logger
