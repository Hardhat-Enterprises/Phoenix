from utils.config_loader import load_config

def main():
    config = load_config("configs/default_config.yaml")

    print("Model:", config["model"]["type"])
    print("Epochs:", config["training"]["epochs"])

if __name__ == "__main__":
    main()