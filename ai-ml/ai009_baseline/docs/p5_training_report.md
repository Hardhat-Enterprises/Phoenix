# AI009 P5 - Training and Checkpointing Report

## Objective
This phase focuses on training the baseline model and saving it in a reusable format for later validation and evaluation.

## Work Completed
- Created a script-based training workflow for the baseline model
- Loaded configuration from the shared config file
- Loaded cleaned data from the P2 output
- Defined feature columns and target column from config
- Applied train, validation, and test split logic
- Trained a baseline Logistic Regression model
- Saved the trained model as a reusable checkpoint file

## Output
- baseline_logisticregression_v1.pkl

## Notes
This saved model checkpoint is required by P6 so that final evaluation metrics and outputs can be generated.