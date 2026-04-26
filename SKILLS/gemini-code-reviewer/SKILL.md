# Code Reviewer (Gemini CLI)

## Intent
This skill guides the agent in conducting professional and thorough code reviews for both local development and remote Pull Requests. It focuses on identifying quality issues, ensuring best practices, and verifying that the code meets project standards.

## Review Process

1.  **Context Gathering**: Before starting the review, identify the scope of changes. This includes:
    *   Reading the diff of the current branch compared to the target branch (e.g., `main`).
    *   Identifying modified files, new files, and deleted files.
2.  **Preflight (Optional)**: If the changes are substantial, ask the user if they want to run `npm run preflight` (or the project's equivalent build/test command) before reviewing.
3.  **Detailed Analysis**: For each modified file, analyze:
    *   **Correctness**: Does the code do what it's supposed to? Are there any logical errors or edge cases missed?
    *   **Readability**: Is the code easy to understand? Are variable and function names descriptive?
    *   **Maintainability**: Is the code modular? Does it follow DRY (Don't Repeat Yourself) principles?
    *   **Security**: Are there any obvious security vulnerabilities (e.g., hardcoded secrets, injection risks)?
    *   **Performance**: Are there any glaring performance bottlenecks?
4.  **Feedback Synthesis**: Group findings into categories:
    *   **Blocking Issues**: Critical bugs, security flaws, or major architectural issues that must be fixed.
    *   **Suggestions**: Improvements for readability, performance, or minor style adjustments.
    *   **Questions**: Clarifications needed to understand the intent behind specific changes.

## Post-Review
*   After the review, ask the user if they want to switch back to the default branch (e.g., `main` or `master`).
*   Provide a summary of the review findings.

## Output Format
Structure your review using clear headings and bullet points. Use code snippets to illustrate points where necessary.

# Code Review Findings

## Blocking Issues
- [Issue 1 Description]
  - **File**: `path/to/file:line`
  - **Reason**: [Why it's a blocker]
  - **Suggested Fix**: [How to fix it]

## Suggestions
- [Suggestion 1 Description]
  - **File**: `path/to/file:line`
  - **Benefit**: [Why this is better]

## Questions
- [Question 1]?
