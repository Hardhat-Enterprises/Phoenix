import os
import random
import numpy as np

def set_seed(seed: int = 42):
    os.environ["PYTHONHASHSEED"] = str(seed)
    random.seed(seed)
    np.random.seed(seed)

    try:
        import torch
        torch.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False
    except ImportError:
        pass


def get_reproducibility_config(seed=42):
    return {
        "seed": seed,
        "numpy": True,
        "python_random": True,
        "torch": "optional"
    }


if __name__ == "__main__":
    set_seed(42)
    print("Seed set successfully")
    print(get_reproducibility_config())