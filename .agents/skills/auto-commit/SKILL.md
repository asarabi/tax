---
name: auto-commit
description: Automatically inspect modified files, generate concise conventional commit messages, stage changes, and create git commits. Trigger when the user requests auto commit, git commit, or committing changes.
---

# Auto Commit Skill

Use this skill when the user asks to automatically commit changes, create a git commit, or run an auto-commit workflow.

## Guidelines & Steps

1. **Inspect Working Directory**:
   - Run `git status` to identify staged, unstaged, and untracked files.
   - Run `git diff` and `git diff --staged` to understand what was modified.

2. **Stage Relevant Changes**:
   - Run `git add <file>` or `git add .` to stage the changes intended for the commit.

3. **Draft Meaningful Conventional Commit Message**:
   - Structure: `<type>(<scope>): <short summary>`
     - **feat**: New feature or functional enhancement
     - **fix**: Bug fix or logic correction
     - **docs**: Documentation or text changes
     - **style**: CSS formatting or visual styling updates
     - **refactor**: Code restructuring without changing behavior
     - **chore**: Configuration, build scripts, or maintenance
   - Example: `feat(calculator): add calculation formula breakdown`

4. **Execute Commit**:
   - Run `git commit -m "<type>(<scope>): <short summary>"`

5. **Report Result**:
   - Confirm to the user the committed files and the commit hash/message created.
   - **IMPORTANT**: Do NOT execute `git push` unless the user explicitly asks to push. Keep changes in local git repository.
