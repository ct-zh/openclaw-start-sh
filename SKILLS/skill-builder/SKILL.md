---
name: skill-builder
description: An expert guide and assistant for building, reviewing, and optimizing Claude Skills. Use this skill to generate new skills from scratch, audit existing skills against official best practices, or optimize skill performance.
version: 1.0.0
license: MIT
metadata:
  category: development
  tags: [skill-development, meta-skill, best-practices]
---

# Claude Skill Builder

## Overview
This skill acts as an expert architect for Claude Skills. It guides the user through the process of creating high-quality, reliable, and performant skills for Claude, ensuring strict adherence to Anthropic's official "Complete Guide to Building Skills for Claude". It covers the entire lifecycle from requirements gathering to drafting, auditing, and optimization.

## Goals
1.  **Create**: Generate robust, well-structured `SKILL.md` files and folder structures based on user intent.
2.  **Audit**: Review existing skill definitions for common errors (e.g., XML in YAML, bad naming conventions).
3.  **Optimize**: Suggest improvements for performance, such as progressive disclosure and prompt engineering techniques.

## Workflow

### Phase 1: Context & Intent Analysis
When triggered, first determine the user's goal:
- **New Skill**: Ask "What specific workflow or task do you want to automate?" and "What inputs will the skill receive?"
- **Audit/Optimize**: Ask the user to provide the existing `SKILL.md` content.

### Phase 2: Drafting (For New Skills)
Follow these steps to generate a skill:

1.  **Naming**: Choose a concise `kebab-case` name (e.g., `data-extractor`, not `Data Extractor` or `claude-data-extractor`).
    *   *Rule*: Do NOT start with "claude" or "anthropic".
2.  **YAML Frontmatter Construction**:
    *   Create a valid YAML block delimited by `---`.
    *   **Name**: Set the `name` field (max 64 chars).
    *   **Description**: Write a description (max 1024 chars) that clearly states **WHAT** the skill does and **WHEN** to use it. Include specific trigger phrases.
    *   *Security Rule*: Ensure NO XML tags (`<`, `>`) are present in the YAML block.
3.  **Instruction Body Construction**:
    *   **Overview**: A brief summary.
    *   **Inputs/Outputs**: Clearly define expected data formats.
    *   **Steps**: A numbered list of executable actions. Use "Chain of Thought" prompting if logic is complex.
    *   **Error Handling**: Explicit instructions on how to handle failures.
    *   **Examples**: Provide input-output pairs to ground the model.
4.  **Folder Structure**: Recommend a folder structure (e.g., `skill-name/SKILL.md`, `skill-name/references/`).

### Phase 3: Auditing (For Existing Skills)
Check the provided skill against the **Critical Validation Checklist**:

- [ ] **Folder Name**: Is it `kebab-case`?
- [ ] **File Name**: Is it exactly `SKILL.md`?
- [ ] **YAML Syntax**: Are `---` delimiters present?
- [ ] **YAML Security**: Are there ANY XML tags (`<`, `>`) in the YAML? (Must be REMOVED).
- [ ] **Naming**: Is `name` in `kebab-case`? Does it avoid reserved prefixes ("claude", "anthropic")?
- [ ] **Description**: Does it explain WHAT and WHEN?
- [ ] **Progressive Disclosure**: Is the `SKILL.md` concise (< 5000 words)? Are heavy details moved to `references/`?
- [ ] **Clarity**: Are instructions clear and actionable?

### Phase 4: Output & Optimization
- Present the final `SKILL.md` in a code block.
- Explain *why* certain design choices were made (e.g., "I moved the long template to a reference file to save context window").
- Add "Performance Notes" if necessary (e.g., "Quality is more important than speed").

## Style & Tone Guidelines
- **Deterministic**: Use code-like precision in instructions.
- **Encouraging**: When addressing "laziness", add phrases like "Take your time to do this thoroughly".
- **Structured**: Use Markdown headers, lists, and bold text for readability.

## Example Templates

### Basic SKILL.md Structure
```markdown
---
name: my-new-skill
description: Generates a weekly report based on raw CSV data. Use this when the user uploads a CSV and asks for a summary.
version: 1.0.0
---

# My New Skill

## Overview
This skill takes raw CSV data and transforms it into a formatted Markdown report.

## Inputs
- CSV file containing sales data.

## Process
1.  **Analyze Data**: Read the CSV header to understand columns.
2.  **Summarize**: Calculate total revenue and top 3 selling items.
3.  **Format**: Generate a report using the standard template.

## Error Handling
- If the CSV is empty, return "Error: No data provided."
```

## Troubleshooting Common Issues
- **Symptom**: Skill is slow.
  - **Fix**: Reduce `SKILL.md` size, move content to references.
- **Symptom**: Skill is ignored.
  - **Fix**: Rewrite `description` to be more specific about WHEN to use it.
