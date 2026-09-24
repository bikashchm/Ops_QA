/**
 * Initializes sample Excel workbooks under test-data/excel/.
 * Run: node scripts/init-excel-test-data.js
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const excelDir = path.resolve(__dirname, '..', 'test-data', 'excel');
const legacyFile = path.resolve(__dirname, '..', 'Liveplus_TestData.xlsx');
const mainFile = path.join(excelDir, 'Liveplus_TestData.xlsx');
const sampleFile = path.join(excelDir, 'LivePlus_Sample_TestData.xlsx');

fs.mkdirSync(excelDir, { recursive: true });

function buildEnvSheet(rows) {
  return [['Key', 'Value'], ...rows];
}

function createSampleWorkbook() {
  const wb = XLSX.utils.book_new();

  const qaRows = buildEnvSheet([
    ['EmailAddress', 'vaibhav.garg@walkingtree.tech'],
    ['Password', 'Vaibhav@01'],
    ['Padname', ''],
    ['WellName', ''],
    ['CompanyButtonName', 'Liveplus playwright'],
    ['Prospect', 'live plus field'],
    ['Operator', 'QA Operator'],
    ['ServiceCompany', 'QA service'],
  ]);

  const stagingRows = buildEnvSheet([
    ['EmailAddress', 'staging.user@company.com'],
    ['Password', 'ChangeMe@01'],
    ['Padname', ''],
    ['WellName', ''],
    ['CompanyButtonName', 'Liveplus playwright'],
  ]);

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(qaRows), 'QA');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(stagingRows), 'Staging');
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Key', 'Value'],
      ['Note', 'Legacy Sheet1-compatible data'],
    ]),
    'Sheet1',
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['TestName', 'Environment', 'Status', 'Timestamp', 'Notes'],
    ]),
    'TestResults',
  );

  XLSX.writeFile(wb, sampleFile);
  console.log(`Created sample workbook: ${sampleFile}`);
}

if (fs.existsSync(legacyFile) && !fs.existsSync(mainFile)) {
  fs.copyFileSync(legacyFile, mainFile);
  console.log(`Copied legacy workbook to: ${mainFile}`);
} else if (fs.existsSync(mainFile)) {
  console.log(`Workbook already exists: ${mainFile}`);
} else {
  createSampleWorkbook();
  fs.copyFileSync(sampleFile, mainFile);
  console.log(`Created main workbook from sample: ${mainFile}`);
}

if (!fs.existsSync(sampleFile)) {
  createSampleWorkbook();
}

console.log('Excel test-data initialization complete.');
