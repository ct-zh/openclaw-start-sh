# Frontend Business Logic Checklist

## Dify App Logic
- [ ] **Urgent**: Ensure correct handling of App types (Chatbot, Workflow, Agent, etc.) in the UI.
- [ ] **Urgent**: Validate API keys and App IDs before initiating requests.
- [ ] **Suggestion**: Use consistent error handling for API failures, displaying user-friendly messages.

## Workflow Execution
- [ ] **Urgent**: Handle the "Human-in-the-Loop" (HITL) state correctly, pausing and resuming execution as expected.
- [ ] **Urgent**: Correctly map node outputs to subsequent node inputs in the workflow graph.
- [ ] **Suggestion**: Provide visual feedback (e.g., loading spinners, progress bars) during long-running workflow executions.

## Security & Compliance
- [ ] **Urgent**: Never hardcode sensitive information (API keys, secrets) in the frontend code.
- [ ] **Urgent**: Sanitize user inputs to prevent XSS attacks when rendering dynamic content.
- [ ] **Suggestion**: Follow the project's permission model when displaying or hiding specific UI elements.

## Internationalization (i18n)
- [ ] **Urgent**: Use the project's i18n library (e.g., `next-i18next`) for all user-facing text.
- [ ] **Suggestion**: Ensure RTL (Right-to-Left) support for relevant languages if required by the project.
