# AI008 Training Pipeline - Week 6 Core Scaffold

This scaffold provides the minimum viable training framework for PHOENIX Sprint 2.
It is designed to support:

- AI009 Baseline Model
- AI010 Risk Refinement

## Week 6 Scope Covered

- W6-T1 Project Structure and Module Scaffolding
- base folders
- placeholder scripts
- import-ready package layout
- starter README

## Folder Structure

```text
training_pipeline/
|-- checkpoints/              # saved models and recovery artifacts
|-- configs/                  # YAML / JSON configs
|-- logs/                     # run logs, metric logs, error logs
|-- src/
|   |-- __init__.py
|   |-- main.py               # pipeline entry point
|   |-- core/
|   |   |-- __init__.py
|   |   |-- config_manager.py
|   |   |-- trainer.py
|   |   |-- checkpoint_manager.py
|   |   `-- logger.py
|   |-- data/
|   |   |-- __init__.py
|   |   |-- dataset_loader.py
|   |   `-- splitter.py
|   |-- preprocessing/
|   |   |-- __init__.py
|   |   |-- preprocess.py
|   |   `-- feature_loader.py
|   |-- models/
|   |   |-- __init__.py
|   |   `-- model_registry.py
|   |-- evaluation/
|   |   |-- __init__.py
|   |   |-- metrics.py
|   |   `-- validator.py
|   `-- utils/
|       |-- __init__.py
|       |-- paths.py
|       `-- seeds.py
`-- tests/
    `-- test_smoke.py
```

## Suggested Ownership by Week 6 Task

- W6-T1: full scaffold in this repo
- W6-T2: `src/core/config_manager.py`
- W6-T3: `src/data/dataset_loader.py`, `src/data/splitter.py`
- W6-T4: `src/preprocessing/preprocess.py`, `src/preprocessing/feature_loader.py`
- W6-T5: `src/core/trainer.py`, `src/models/model_registry.py`
- W6-T6: `src/evaluation/metrics.py`, `src/evaluation/validator.py`
- W6-T7: `src/core/checkpoint_manager.py`
- W6-T8: `src/core/logger.py`

## How to Run

### 1. Install dependency

From `ai-ml/training_pipeline`:

```bash
pip install pyyaml
```

### 2. Run with the Windows runner (recommended)

From `ai-ml/training_pipeline`:

```bat
run_pipeline.bat
```

The runner will prompt for a config file path.
If you press Enter, it uses:

```text
configs\default_config.yaml
```

### 3. Run directly with Python

From `ai-ml/training_pipeline`:

```bash
python -m src.main --config configs/default_config.yaml
```

From the repository root:

```bash
python ai-ml/training_pipeline/src/main.py --config ai-ml/training_pipeline/configs/default_config.yaml
```

## Design Rules

- each module should be usable independently where possible
- Week 6 should favor mock inputs over blocked integration
- config-driven behavior should be added without breaking module isolation
- file outputs should always go into `logs/` or `checkpoints/`
- avoid hardcoding dataset-specific assumptions

## Notes for PHOENIX

This structure aligns with PHOENIX's AI workflow where hazard, cyber, and fused risk features need to move cleanly from data loading to preprocessing, model training, evaluation, and handoff to downstream scoring tasks. The broader project focuses on AI-driven cyber risk modelling for bushfire and flood disaster contexts.
