/**
 * Opens enterprise report bundle after test execution.
 * Usage: npm run report:open
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const summaryHtml = path.join(root, 'reports', 'execution-summary.html');
const playwrightHtml = path.join(root, 'playwright-report', 'index.html');
const allureHtml = path.join(root, 'reports', 'allure-report', 'index.html');

console.log('\n=== LivePlus Enterprise Reports ===\n');

if (fs.existsSync(summaryHtml)) {
  console.log(`Execution Summary : file://${summaryHtml}`);
}
if (fs.existsSync(playwrightHtml)) {
  console.log(`Playwright HTML    : file://${playwrightHtml}`);
}
if (fs.existsSync(allureHtml)) {
  console.log(`Allure Report      : file://${allureHtml}`);
}
if (fs.existsSync(path.join(root, 'logs', 'automation.log'))) {
  console.log(`Automation Log     : ${path.join(root, 'logs', 'automation.log')}`);
}

const preferred = fs.existsSync(summaryHtml)
  ? summaryHtml
  : fs.existsSync(playwrightHtml)
    ? playwrightHtml
    : null;

if (preferred && process.platform === 'win32') {
  execSync(`start "" "${preferred}"`, { stdio: 'ignore', shell: true });
} else if (preferred) {
  console.log(`\nOpen: ${preferred}`);
}
