# LivePlus Playwright Framework — Architecture (Phase 1)

Enterprise layered architecture for Playwright + TypeScript.  
**Stack:** Playwright, TypeScript, Excel data, Azure DevOps CI/CD.

---

## 1. Folder Structure & Purpose

```
project-root/
│
├── tests/                  # Test specs only — thin orchestration + assertions
├── pages/                  # Page Object Model (POM) — UI locators & page actions
├── base/                   # Abstract base classes shared by pages/fixtures
├── fixtures/               # Custom Playwright fixtures (login, maximize, test context)
├── utils/                  # Low-level reusable actions (wait, click, browser CDP)
├── helpers/                # Domain helpers (name generators, workflow builders)
├── excel/                  # Excel read/write abstraction (data-driven testing)
├── logger/                 # Centralized logging
├── config/                 # Environment & runtime configuration
├── credentials/            # .env.example only — secrets never committed
├── constants/              # URLs, timeouts, paths, tags
├── test-data/              # Excel/JSON/CSV test data files (migration target)
├── runners/                # Smoke / regression suite configs (TestNG-like groups)
├── reports/                # JUnit & custom report output
├── screenshots/            # Manual / custom screenshot storage
├── videos/                 # Optional video artifact storage
├── api/                    # API clients for setup, teardown, validation
├── global-setup/           # One-time setup before all tests (env validation)
├── global-teardown/        # One-time cleanup after all tests
├── azure-pipeline/         # Azure DevOps YAML pipelines
├── playwright-report/      # HTML report (auto-generated, gitignored)
├── test-results/           # Traces, failure artifacts (auto-generated)
└── package.json
```

| Folder | Purpose | What goes here | What does NOT go here |
|--------|---------|----------------|------------------------|
| `tests/` | Executable test cases | `test()`, tags (`@smoke`), assertions, flow orchestration | Locator strings, Excel parsing, CDP maximize |
| `pages/` | Page Object Model | Locators, `login()`, `createPad()`, navigation per screen | Test assertions, Excel paths |
| `base/` | Shared abstractions | `BasePage` with `click()`, `fill()`, `waitForVisible()` | Business test logic |
| `fixtures/` | Playwright test extensions | `maximizedPage`, authenticated session, shared `test` export | Page-specific locators |
| `utils/` | Generic technical helpers | `waitAndClick`, `maximizeBrowserWindow` | Pad/well business rules |
| `helpers/` | Domain-specific helpers | `generatePadWellNames()`, workflow composers | Raw Playwright locators |
| `excel/` | Data layer | `ExcelReader.getValue()`, `upsertKeyValue()` | UI interactions |
| `logger/` | Observability | Structured `logger.info/warn/error` | Test steps |
| `config/` | Environment switching | `getEnvironmentConfig()`, QA/staging/prod URLs | Hardcoded credentials |
| `constants/` | Single source of truth | Timeouts, tags, file paths | Dynamic runtime values |
| `runners/` | Suite execution | `smoke.config.ts`, `regression.config.ts` | Individual test logic |
| `api/` | Backend integration | Token fetch, data seeding via REST | UI page objects |

---

## 2. Code Placement Rules

### Stay in `tests/` (Test Layer)
- Test title and `@smoke` / `@regression` tags
- Arrange → Act → Assert flow
- Business validation (`expect(padName).toBeVisible()`)
- Calling page objects: `await loginPage.login(email, password)`
- `test.setTimeout()` for long E2E flows

### Move to `utils/`
- `waitAndClick`, `waitAndFill`, `waitUntilVisible`
- `maximizeBrowserWindow` (CDP — **preserved from legacy specs**)
- Screenshot helpers, retry wrappers

### Move to `pages/`
- All `getByRole`, `locator('#id')` for a specific screen
- Multi-step UI flows: `LoginPage.login()`, `PadWellPage.fillDetails()`
- Screen-specific dropdown selection

### Move to `base/`
- `BasePage` with protected `click()`, `fill()`, `selectFromOptionsList()`
- Future: `BaseTest` hooks if needed

### Move to `excel/` + `test-data/`
- `ExcelReader` class
- Excel files under `test-data/` (legacy `Liveplus_TestData.xlsx` at root until Phase 2+)

### Move to `fixtures/`
- Browser maximize on every test: `maximizedPage` fixture
- Shared authenticated `page` after login (Phase 3+)

---

## 3. Naming Conventions

| Item | Convention | Example |
|------|------------|---------|
| Test files | `*.spec.ts` | `create-well-and-pad.spec.ts` |
| Page classes | PascalCase + `Page` | `LoginPage`, `PadWellPage` |
| Utils | camelCase functions | `waitAndClick`, `maximizeBrowserWindow` |
| Constants | SCREAMING_SNAKE | `SLOW_UI_MS`, `TAGS.SMOKE` |
| Folders | lowercase kebab or single word | `global-setup`, `test-data` |
| Tags | `@smoke`, `@regression` | Playwright `grep` / TestNG groups equivalent |

---

## 4. Industry-Standard Playwright Architecture

```
┌─────────────────────────────────────────┐
│              tests/ (Specs)               │  ← Thin tests
├─────────────────────────────────────────┤
│         fixtures/ (Test Context)        │  ← maximize, auth, env
├─────────────────────────────────────────┤
│           pages/ (Page Objects)         │  ← UI abstraction
├─────────────────────────────────────────┤
│     utils/ + helpers/ + excel/ + api/     │  ← Reusable services
├─────────────────────────────────────────┤
│    config/ + constants/ + credentials/  │  ← Configuration
└─────────────────────────────────────────┘
```

### TestNG-like execution (Playwright equivalent)

| TestNG | Playwright |
|--------|------------|
| `@Test(groups = "smoke")` | `test('... @smoke', ...)` + `grep: /@smoke/` |
| `testng.xml` suite | `runners/smoke.config.ts` |
| `@BeforeSuite` | `global-setup/global-setup.ts` |
| `@AfterSuite` | `global-teardown/global-teardown.ts` |
| `@BeforeMethod` | `test.beforeEach()` or fixtures |
| Parallel methods | `fullyParallel: true`, `workers` |

### NPM scripts
```bash
npm test                    # Full suite
npm run test:headed         # Headed Chromium
npm run test:smoke          # @smoke tagged tests
npm run test:regression     # @regression tagged tests
```

---

## 5. Anti-Patterns (Current → Target)

| Anti-pattern | Problem | Fix |
|--------------|---------|-----|
| Helpers duplicated in every `.spec.ts` | Drift, 4× maintenance | Centralize in `utils/` |
| `createwellandpad.ts` + `.spec.ts` duplicate | Confusion, double maintenance | One spec file only |
| Hardcoded credentials in tests | Security risk | `credentials/.env` + config |
| 400+ line spec files | Unreadable, brittle | Page objects per module |
| Fixed `waitForTimeout(5000)` | Flaky / slow | `waitUntilVisible` with timeout |
| Excel logic inline | No reuse | `ExcelReader` class |
| No tags | Can't run smoke/regression | Add `@smoke`, `@regression` |

---

## 6. Scalability & Maintainability

- **Parallel execution:** `fullyParallel: true` in `playwright.config.ts`
- **CI/CD:** `azure-pipeline/azure-pipelines.yml` publishes JUnit + HTML report
- **Data-driven:** `ExcelReader` + parameterized `test()` in later phases
- **Environment switching:** `TEST_ENV=qa|staging|prod`
- **Browser maximize:** Config launch args + `utils/browserUtils.maximizeBrowserWindow()` (unchanged behavior)

---

## 7. Safe Gradual Migration Plan (Phases 2–10)

| Phase | Action | Risk |
|-------|--------|------|
| 1 ✅ | Scaffold folders, utils, config (no spec changes) | None |
| 2 | Extract shared utils from one spec (`createwellandpad`) | Low — run test after |
| 3 | Introduce `LoginPage`, migrate login flow | Low |
| 4 | Add `PadWellPage`, migrate pad creation | Medium |
| 5 | Migrate `SaveandNext` to page objects | Medium |
| 6 | Move Excel to `test-data/`, use `ExcelReader` | Low |
| 7 | Add `@smoke` / `@regression` tags | None |
| 8 | Credentials via `.env` | Low |
| 9 | Remove duplicate `.ts` / `.spec.ts` files | Low |
| 10 | Full regression run + CI validation | — |

**Rule:** After each phase, run `npm run test:headed -- tests/createwellandpad.ts` to confirm maximize + login + flow still work.

---

## 8. Browser Maximize — Preserved Behavior

Two layers (both kept):

1. **playwright.config.ts** — Chromium launch args: `--start-maximized`, `--window-size=1920,1080`, `viewport: null`
2. **utils/browserUtils.ts** — CDP `Browser.setWindowBounds({ windowState: 'maximized' })`

Legacy specs still call inline `maximizeBrowserWindow()` until Phase 2 migration.  
New specs will use `fixtures/maximizedPage` or import from `utils/browserUtils`.

---

## 9. Current State (Phase 1 Complete)

- ✅ Enterprise folder structure created
- ✅ `utils/`, `excel/`, `logger/`, `config/`, `constants/` implemented
- ✅ `BasePage`, `LoginPage` scaffold ready
- ✅ `fixtures/` with `maximizedPage` ready
- ✅ Smoke/regression runners + Azure pipeline template
- ✅ Legacy `tests/` **unchanged** — all scripts still work as before

**Next:** Phase 2 — migrate first spec to use shared `utils/` and `fixtures/`.
