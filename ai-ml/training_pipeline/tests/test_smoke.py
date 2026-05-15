"""Basic smoke test for scaffold setup."""

from pathlib import Path
import shutil
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.utils import paths as path_utils


def test_runtime_dirs_can_be_created(monkeypatch) -> None:
    """Smoke test for runtime directory creation."""
    sandbox_root = PROJECT_ROOT / "tests" / "_tmp_runtime_dirs"
    if sandbox_root.exists():
        shutil.rmtree(sandbox_root)

    configs_dir = sandbox_root / "configs"
    logs_dir = sandbox_root / "logs"
    checkpoints_dir = sandbox_root / "checkpoints"

    monkeypatch.setattr(path_utils, "CONFIGS_DIR", configs_dir)
    monkeypatch.setattr(path_utils, "LOGS_DIR", logs_dir)
    monkeypatch.setattr(path_utils, "CHECKPOINTS_DIR", checkpoints_dir)

    path_utils.ensure_runtime_dirs()

    assert configs_dir.is_dir()
    assert logs_dir.is_dir()
    assert checkpoints_dir.is_dir()

    shutil.rmtree(sandbox_root)
