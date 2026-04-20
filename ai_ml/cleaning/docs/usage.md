# AI003 Usage Guide

## Purpose
This guide explains how to run the AI003 data cleaning demo pipeline.

## Steps
1. Open terminal in the project folder
2. Navigate to:
   `ai-ml/cleaning/logging`
3. Run:
   `py run_demo.py`

## What the script does
- loads the dummy dataset
- detects missing values
- removes duplicate rows
- normalises categorical values
- compares before vs after dataset quality
- generates a cleaned CSV output

## Output
- console logs
- before vs after summary
- `cleaned_output.csv`