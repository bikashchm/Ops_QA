/**
 * Generates Allure HTML report from Playwright allure-playwright results.
 * Usage: npm run report:allure
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const resultsDir = path.resolve(__dirname, '..', 'reports', 'allure-results');
const outputDir = path.resolve(__dirname, '..', 'reports', 'allure-report');

if (!fs.existsSync(resultsDir) || fs.readdirSync(resultsDir).length === 0) {
  console.log('No Allure results found — skipping report generation.');
  process.exit(0);
}

fs.mkdirSync(outputDir, { recursive: true });

execSync(
  `npx allure generate "${resultsDir}" -o "${outputDir}" --clean`,
  { stdio: 'inherit', cwd: path.resolve(__dirname, '..') },
);

console.log(`Allure report generated: ${outputDir}`);
