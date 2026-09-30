# Asana-like Board: Data-Driven Playwright Tests

Automated UI tests for the [Asana-like demo app](https://create-asana-like-pr-39y5.bolt.host/).
Each scenario logs in, opens a project, and checks that a task:

1. is inside the expected **column** (To Do / In Progress / Done), and
2. has the expected **tags** on **its own card**.

All six scenarios come from one JSON file and run through one test implementation.

## Technologies

- [Playwright Test](https://playwright.dev/docs/intro) (`@playwright/test`)
- TypeScript
- Node.js 20.12+ (uses the built-in `process.loadEnvFile`, so `dotenv` isn't needed)

## Project structure

```
.
├── playwright.config.ts        # baseURL, reporters, timeouts, screenshots/traces, Chromium
├── package.json
├── tsconfig.json
├── .env.example                # optional overrides (copy to .env)
├── .gitignore
└── tests/
    ├── data/
    │   └── tasks.json          # the test scenarios (single source of truth)
    ├── pages/
    │   ├── login.page.ts       # LoginPage: reusable login
    │   └── project.page.ts     # ProjectPage: navigation, columns, task cards, tags
    └── task-validation.spec.ts # one data-driven test, generated per scenario
```

## Installation

```bash
npm install
npx playwright install
```

(`npx playwright install chromium` is enough, since only Chromium is configured.)

## Running

| Purpose                 | Command                                            |
| ----------------------- | -------------------------------------------------- |
| Run all tests           | `npx playwright test`                              |
| Run headed              | `npx playwright test --headed`                     |
| Run a specific file     | `npx playwright test tests/task-validation.spec.ts`|
| Run a single scenario   | `npx playwright test -g "Test Case 5"`             |
| Debug step by step      | `npx playwright test --debug`                      |
| View the HTML report    | `npx playwright show-report`                       |
| Type-check the project  | `npm run typecheck`                                |

### Configuration

Defaults work out of the box. To override them, copy `.env.example` to `.env` or set environment variables:

| Variable        | Default                                           |
| --------------- | ------------------------------------------------- |
| `BASE_URL`      | `https://create-asana-like-pr-39y5.bolt.host/`    |
| `TEST_USERNAME` | `admin`                                           |
| `TEST_PASSWORD` | `password123`                                     |

These are the demo credentials published with the exercise, so they're safe to include as defaults.

## Design

### Data-driven architecture

`tests/data/tasks.json` holds the scenarios:

```json
{
  "testCase": "Test Case 1",
  "project": "Web Application",
  "task": "Implement user authentication",
  "column": "To Do",
  "tags": ["Feature", "High Priority"]
}
```

`task-validation.spec.ts` loops over this array and registers one Playwright test per entry.
The test body is written once. Each test gets its own name (e.g. `Test Case 5: "Offline mode" is in "In Progress" on Mobile Application`),
so the report shows exactly which scenario failed, and tests run in parallel in isolated browser contexts.

### Page Object Model

| Page object   | Responsibility                                                                 |
| ------------- | ------------------------------------------------------------------------------ |
| `LoginPage`   | `login(username?, password?)`: opens the app, fills the form, confirms the form is gone |
| `ProjectPage` | `navigateToProject(name)`, `getColumn(name)`, `getTask(task, column)`, `verifyTaskInColumn(task, column)`, `verifyTaskTags(task, column, tags)` |

The spec contains no selectors. It only describes what to check, and the page objects decide how.

### How login works

A `beforeEach` hook calls `LoginPage.login()` for every test, so login code exists in one place.
Fields are found by accessible label or placeholder (`/username/i`, `/password/i`) and the button by role (`Sign in` / `Log in`).
Login counts as successful once the password field is hidden.

### How project navigation works

`navigateToProject(name)` clicks the project's button in the sidebar navigation,
then waits for the project name to appear as the `<h1>` in the page header. That confirms the right board is showing before any assertions run.

### How column validation works

A column is located **structurally**: it is the outermost element that contains the column's header
(e.g. `To Do`, `To Do 3` or `To Do (3)`) and **none of the other column headers**.
Any ancestor above it (the board, the page) would contain the other headers too, so this narrows to exactly one column.

The task title is then searched **only inside that column**:

```ts
const column = this.getColumn('To Do');
await expect(column.getByText('Implement user authentication', { exact: true })).toBeVisible();
```

If the task sits in any other column, the assertion fails. Seeing "To Do" and the task text somewhere on the page isn't enough.

### How tag validation works

Tags are checked **inside the task's own card**, never against the whole page.
The card is also located structurally: it is the outermost element inside the column that contains this task's title and
**no other task title**. Other titles are recognised as elements with the same tag and class as this one.
That region belongs to exactly one task, so a `Feature` tag on a neighbouring card can't satisfy the assertion:

```ts
const card = await projectPage.getTask('Offline mode', 'In Progress');
await expect(card.getByText('Feature', { exact: true })).toBeVisible();
await expect(card.getByText('High Priority', { exact: true })).toBeVisible();
```

This doesn't depend on CSS class names or test IDs the app might not have. If the app does add
`data-testid` attributes later, `getColumn` / `getTask` are the only two methods to change.

### Synchronisation

There are no `waitForTimeout` calls. The tests rely on Playwright's auto-waiting actions and web-first `expect` assertions, which retry until they pass or time out.

On failure, Playwright keeps a screenshot, a video and a trace (`npx playwright show-trace test-results/<test>/trace.zip`, or open it from the HTML report).

## Adding another test case

Add an object to `tests/data/tasks.json`. You don't need to write new test code:

```json
{
  "testCase": "Test Case 7",
  "project": "Mobile Application",
  "task": "Some new task",
  "column": "Done",
  "tags": ["Bug"]
}
```

If a scenario uses a column that isn't in `BOARD_COLUMNS` (`tests/pages/project.page.ts`), add its name there.
