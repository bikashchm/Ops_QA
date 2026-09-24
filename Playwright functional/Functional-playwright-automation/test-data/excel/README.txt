LivePlus Excel Test Data
========================

Location: test-data/excel/

Workbooks
---------
- Liveplus_TestData.xlsx      Main runtime workbook (env sheets + write-back)
- LivePlus_Sample_TestData.xlsx Template / reference structure

Sheet structure
---------------

Sheet: QA | Staging | Prod
| Key              | Value                          |
|------------------|--------------------------------|
| EmailAddress     | user@company.com               |
| Password         | ********                       |
| Padname          | (written by createwellandpad)  |
| WellName         | (written by createwellandpad)  |
| CompanyButtonName| Liveplus playwright            |

Sheet: TestResults
| TestName | Environment | Status | Timestamp | Notes |

Legacy compatibility
--------------------
- Column A / Column B key-value on Sheet1 is still supported
- Header / Data column format is also supported

Initialize
----------
npm run init:excel
