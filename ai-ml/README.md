# AI/ML GitHub Workflow Guide

This guide outlines how the AI/ML team should use GitHub for all project tasks.

---

## Branch Structure

- `main` → final stable version (**do not work here**)
- `dev` → integration branch (**do not work here directly**)
- `task branch` → branch created for each assigned task
- `your branch` → your personal working branch created from the task branch

---

## Workflow

### 1. Start from your assigned task branch

Examples:
- `ai-ml/ai003-data-cleaning`
- `ai-ml/ai004-feature-engineering`
- `ai-ml/ai005-synthetic-data`

Pull the latest version:

```bash
git fetch origin
git checkout <task-branch>
git pull origin <task-branch>
````

---

### 2. Create your own personal branch

Create your branch **from the task branch** using:

```bash
git checkout -b ai-ml/<task-id>/<your-name>-<short-description>
```

Example:

```bash
git checkout -b ai-ml/ai005/john-scenario-logic
```

Recommended naming format:

```text
ai-ml/<task-id>/<your-name>-<short-description>
```

Examples:

```text
ai-ml/ai001/john-scenario-logic
ai-ml/ai002/sarah-data-generator
ai-ml/ai003/alex-validation
```

---

### 3. Do your work and push

```bash
git add .
git commit -m "add initial task logic"
git push -u origin <your-branch>
```

---

### 4. Open a Pull Request (PR)

Create a PR with:

* **base:** task branch
* **compare:** your branch

Example:

```text
ai-ml/ai005/john-scenario-logic → ai-ml/ai005-synthetic-data
```

Task leads have access to review and merge PRs into the task branch.

Once the task is complete, the task branch will be merged into `dev`.

---

## Important Rules

* do **not** work directly on `main`
* do **not** work directly on `dev`
* do **not** work directly on the task branch
* always create your own branch
* always open PR into the task branch
* only task leads should merge PRs into the task branch

---

## Workflow Summary

```text
your branch → task branch → dev → main
```

---

## Need Help?

If you face any issues with:

* permissions
* merge conflicts
* branch creation
* PR approvals

please reach out to the AI/ML lead.
