import fs from 'fs';
import path from 'path';
import { ConfigManager } from '../config/ConfigManager';
import {
  EXCEL_DATA_DIR,
  LEGACY_TEST_DATA_FILE,
  LIVEPLUS_TEST_DATA_FILE,
} from '../constants/paths';
import { logger } from '../logger';
import { ExcelReader } from './ExcelReader';
import { ExcelWriter } from './ExcelWriter';
import type { KeyValueOptions, TestResultRecord } from './types';
import { EXCEL_SHEETS } from './types';
import {
  buildChannelInputFlowData,
  buildChannelInputTestData,
  ensureChannelInputExcelKeys,
  type ChannelInputFlowData,
  type ChannelInputTestData,
} from './channelInputTestData';
import { buildHeatTransferTestData, buildHeatTransferFlowData, type HeatTransferTestData, type HeatTransferFlowData } from './heatTransferTestData';
import {
  buildEditFluidTestData,
  buildMaterialSelectionData,
  type EditFluidTestData,
  type MaterialSelectionData,
} from './materialTestData';
import {
  buildMaterialUsageFlowData,
  buildMaterialUsageTestData,
  ensureMaterialUsageExcelKeys,
  type MaterialUsageFlowData,
  type MaterialUsageTestData,
} from './materialUsageTestData';
import {
  buildPostJobDataFlowData,
  buildPostJobDataTestData,
  ensurePostJobDataExcelKeys,
  type PostJobDataFlowData,
  type PostJobDataTestData,
} from './postJobDataTestData';
import {
  buildEntryFrictionFlowData,
  buildEntryFrictionTestData,
  ensureEntryFrictionExcelKeys,
  type EntryFrictionFlowData,
  type EntryFrictionTestData,
} from './entryFrictionTestData';
import {
  buildDashboardFlowData,
  buildDashboardTestData,
  ensureDashboardExcelKeys,
  type DashboardFlowData,
  type DashboardTestData,
} from './dashboardTestData';
import {
  buildReservoirParametersFlowData,
  buildReservoirParametersTestData,
  ensureReservoirParametersExcelKeys,
  type ReservoirParametersFlowData,
  type ReservoirParametersTestData,
} from './reservoirParametersTestData';
import {
  buildDesignTreatmentFlowData,
  buildDesignTreatmentTestData,
  ensureDesignTreatmentExcelKeys,
  type DesignTreatmentFlowData,
  type DesignTreatmentTestData,
} from './designTreatmentTestData';
import {
  buildTreatmentTotalsFlowData,
  buildTreatmentTotalsTestData,
  ensureTreatmentTotalsExcelKeys,
  type TreatmentTotalsFlowData,
  type TreatmentTotalsTestData,
} from './treatmentTotalsTestData';
import {
  buildDrilledHoleFlowData,
  buildDrilledHoleTestData,
  ensureDrilledHoleExcelKeys,
  type DrilledHoleFlowData,
  type DrilledHoleTestData,
} from './drilledHoleTestData';
import {
  buildCasingFlowData,
  buildCasingTestData,
  ensureCasingExcelKeys,
  type CasingFlowData,
  type CasingTestData,
} from './casingTestData';
import {
  buildSurfaceLineTubingFlowData,
  buildSurfaceLineTubingTestData,
  ensureSurfaceLineTubingExcelKeys,
  type SurfaceLineTubingFlowData,
  type SurfaceLineTubingTestData,
} from './surfaceLineTubingTestData';
import {
  buildPerforationIntervalsFlowData,
  buildPerforationIntervalsTestData,
  ensurePerforationIntervalsExcelKeys,
  type PerforationIntervalsFlowData,
  type PerforationIntervalsTestData,
} from './perforationIntervalsTestData';
import {
  buildDirectionalSurveyFlowData,
  buildDirectionalSurveyTestData,
  ensureDirectionalSurveyExcel,
  type DirectionalSurveyFlowData,
  type DirectionalSurveyTestData,
} from './directionalSurveyTestData';
import {
  buildPathSummaryFlowData,
  buildPathSummaryTestData,
  ensurePathSummaryExcelKeys,
  type PathSummaryFlowData,
  type PathSummaryTestData,
} from './pathSummaryTestData';
import {
  buildPlotPadWellData,
  buildPlotDirectNavData,
  buildPlotBaselineData,
  ensurePlotBaselineExcelKeys,
  PLOT_BASELINE_USER_DEFINED_KEY,
  PLOT_BASELINE_PAD_PLOT_KEY,
  type PlotPadWellData,
  type PlotDirectNavData,
  type PlotBaselineData,
} from './plotTestData';
import {
  buildVersionControlTestConfig,
  buildVersionControlMasterOnlyPadWell,
  ensureVersionControlExcelKeys,
  type VersionControlTestConfig,
  type VersionControlMasterOnlyPadWell,
} from './versionControlTestData';

export type {
  EditFluidTestData,
  EditFluidMaterialData,
  MaterialSelectionData,
  MaterialChemicalData,
  EditFluidChemicalData,
} from './materialTestData';
export type {
  HeatTransferTestData,
  HeatTransferFlowData,
  HeatTransferDefaults,
  HeatTransferFillValues,
  HeatTransferGridValues,
} from './heatTransferTestData';
export type {
  ChannelInputTestData,
  ChannelInputFlowData,
  ChannelInputUnits,
  ChannelInputUserDefined,
} from './channelInputTestData';
export type {
  ReservoirParametersTestData,
  ReservoirParametersFlowData,
  ReservoirParametersDefaults,
  ReservoirParametersFillValues,
} from './reservoirParametersTestData';
export type {
  DesignTreatmentTestData,
  DesignTreatmentFlowData,
  DesignTreatmentRowData,
  DesignTreatmentTotals,
} from './designTreatmentTestData';
export type {
  TreatmentTotalsTestData,
  TreatmentTotalsFlowData,
} from './treatmentTotalsTestData';
export type {
  DrilledHoleTestData,
  DrilledHoleFlowData,
  DrilledHoleRowData,
} from './drilledHoleTestData';
export type {
  CasingTestData,
  CasingFlowData,
  CasingRowData,
} from './casingTestData';
export type {
  SurfaceLineTubingTestData,
  SurfaceLineTubingFlowData,
  SurfaceLineTubingRowData,
} from './surfaceLineTubingTestData';
export type {
  PerforationIntervalsTestData,
  PerforationIntervalsFlowData,
  PerforationClusterData,
} from './perforationIntervalsTestData';
export type {
  DirectionalSurveyTestData,
  DirectionalSurveyFlowData,
  DirectionalSurveyRow,
} from './directionalSurveyTestData';
export type { PathSummaryTestData, PathSummaryFlowData } from './pathSummaryTestData';
export type { PlotPadWellData, PlotDirectNavData, PlotBaselineData } from './plotTestData';
export type {
  VersionControlTestConfig,
  VersionControlChangeHistoryEntry,
  VersionControlMasterOnlyPadWell,
} from './versionControlTestData';
export type {
  EntryFrictionTestData,
  EntryFrictionFlowData,
  EntryFrictionCramerParams,
} from './entryFrictionTestData';
export type {
  DashboardTestData,
  DashboardFlowData,
} from './dashboardTestData';

export interface TestDataManagerOptions {
  fileName?: string;
  /** Override environment sheet resolution */
  environment?: string;
}

/**
 * Enterprise facade for Excel test data.
 * - Environment-aware sheet selection
 * - Key-value read/write
 * - Test result write-back
 */
export class TestDataManager {
  private readonly filePath: string;
  private readonly reader: ExcelReader;
  private readonly writer: ExcelWriter;
  private readonly environment: string;

  constructor(options: TestDataManagerOptions = {}) {
    this.filePath = TestDataManager.resolveFilePath(options.fileName);
    this.reader = new ExcelReader(this.filePath);
    this.writer = new ExcelWriter(this.filePath);
    this.environment = (options.environment ?? ConfigManager.getEnvironmentName()).toLowerCase();
  }

  static getDefault(): TestDataManager {
    return new TestDataManager();
  }

  static resolveFilePath(fileName?: string): string {
    if (fileName && path.isAbsolute(fileName)) return fileName;

    const preferred = fileName ?? 'Liveplus_TestData.xlsx';
    const structuredPath = path.join(EXCEL_DATA_DIR, preferred);

    if (fs.existsSync(structuredPath)) return structuredPath;
    if (fs.existsSync(LIVEPLUS_TEST_DATA_FILE)) return LIVEPLUS_TEST_DATA_FILE;
    if (fs.existsSync(LEGACY_TEST_DATA_FILE)) return LEGACY_TEST_DATA_FILE;

    return structuredPath;
  }

  getFilePath(): string {
    return this.filePath;
  }

  getEnvironmentSheetName(): string {
    switch (this.environment) {
      case 'uat':
      case 'qa':
        return EXCEL_SHEETS.QA;
      case 'stage':
      case 'staging':
        return EXCEL_SHEETS.STAGING;
      case 'prod':
        return EXCEL_SHEETS.PROD;
      default:
        return EXCEL_SHEETS.QA;
    }
  }

  /** Resolves best sheet: env sheet -> Data -> Sheet1 -> first sheet */
  resolveDataSheet(explicitSheet?: string): string {
    if (explicitSheet && this.reader.exists()) {
      const names = this.safeSheetNames();
      if (names.includes(explicitSheet)) return explicitSheet;
    }

    const candidates = [
      this.getEnvironmentSheetName(),
      EXCEL_SHEETS.DATA,
      EXCEL_SHEETS.LEGACY,
    ];

    const sheetNames = this.safeSheetNames();
    for (const candidate of candidates) {
      if (sheetNames.includes(candidate)) return candidate;
    }

    return sheetNames[0] ?? EXCEL_SHEETS.LEGACY;
  }

  private safeSheetNames(): string[] {
    try {
      return this.reader.getSheetNames();
    } catch {
      return [];
    }
  }

  /**
   * Read key with environment sheet fallback to legacy Sheet1/Data.
   */
  get(key: string, options: KeyValueOptions = {}): string {
    const { sheetName, fallback = '', required = false } = options;

    const sheetsToTry = sheetName
      ? [sheetName]
      : [this.resolveDataSheet(), EXCEL_SHEETS.DATA, EXCEL_SHEETS.LEGACY];

    for (const sheet of sheetsToTry) {
      try {
        const value = this.reader.getKeyValue(key, sheet);
        if (value !== undefined && value !== '') return value;
      } catch {
        logger.warn(`Unable to read key "${key}" from sheet "${sheet}"`);
      }
    }

    if (required && !fallback) {
      throw new Error(`Required test data key "${key}" not found in ${this.filePath}`);
    }

    return fallback;
  }

  getRequired(key: string, sheetName?: string): string {
    return this.get(key, { sheetName, required: true });
  }

  getAll(sheetName?: string): Record<string, string> {
    const sheet = sheetName ?? this.resolveDataSheet();
    return this.reader.getAllKeyValues(sheet);
  }

  set(key: string, value: string, sheetName?: string): void {
    const sheet = sheetName ?? this.resolveDataSheet();
    this.writer.upsertKeyValue(key, value, sheet);
  }

  setMany(entries: Record<string, string>, sheetName?: string): void {
    const sheet = sheetName ?? this.resolveDataSheet();
    for (const [key, value] of Object.entries(entries)) {
      this.writer.upsertKeyValue(key, value, sheet);
    }
  }

  recordTestResult(record: TestResultRecord): void {
    this.writer.writeTestResult({
      ...record,
      environment: record.environment ?? this.environment,
    });
  }

  /**
   * Login credentials for every script — always from Excel Sheet1 keys:
   * `Email` (or `EmailAddress`) and `Password`. No env fallback.
   */
  getCredentials(): { email: string; password: string } {
    const email =
      this.get('Email', { fallback: '' }).trim() ||
      this.get('EmailAddress', { fallback: '' }).trim();
    const password = this.get('Password', { fallback: '' }).trim();

    if (!email) {
      throw new Error(
        'Login email not found. Set "Email" in test-data/excel/Liveplus_TestData.xlsx Sheet1.',
      );
    }
    if (!password) {
      throw new Error(
        'Login password not found. Set "Password" in test-data/excel/Liveplus_TestData.xlsx Sheet1.',
      );
    }

    return { email, password };
  }

  getPadWellData(): {
    padName: string;
    wellName: string;
    wellApi: string;
    companyButtonName: string;
  } {
    return {
      padName: this.getRequired('Padname'),
      wellName: this.getRequired('WellName'),
      wellApi: this.get('WellAPI', { fallback: '' }),
      companyButtonName: this.get('CompanyButtonName', { fallback: 'Liveplus playwright' }),
    };
  }

  /**
   * Write-back after create pad/well. Shared Padname/WellName plus Plot and Version Control
   * keys so every suite searches the newly created pad/well.
   */
  writeCreatedPadAndWell(padName: string, wellName: string, wellApi: string): void {
    this.setMany({
      Padname: padName,
      WellName: wellName,
      WellAPI: wellApi,
      PlotPadname: padName,
      PlotWellName: wellName,
      VersionControlPadname: padName,
      VersionControlWellName: wellName,
      VersionControlOtherUserWellName: wellName,
      VersionControlSameUserWellName: wellName,
      VersionControlMasterOnlyPadname: padName,
      VersionControlMasterOnlyWellName: wellName,
    });
  }

  /**
   * Plot suite pad/well — always shared Excel Padname / WellName
   * (same as WellAndTreatment / createwellandpad).
   */
  getPlotPadWellData(): PlotPadWellData {
    const data = buildPlotPadWellData((key, options) => this.get(key, options));
    if (!data.padName || !data.wellName) {
      throw new Error(
        `Padname / WellName missing in ${this.filePath}. Run createwellandpad.spec.ts first.`,
      );
    }
    return data;
  }

  /** Direct-URL navigation ids for Measured Data / Schematic plot validation. */
  getPlotDirectNavData(): PlotDirectNavData {
    return buildPlotDirectNavData((key, options) => this.get(key, options));
  }

  /** Permanent baseline plot names (never deleted). Writes Excel keys if missing. */
  getPlotBaselineData(): PlotBaselineData {
    ensurePlotBaselineExcelKeys(
      (key, options) => this.get(key, options),
      (key, value) => this.set(key, value),
    );
    return buildPlotBaselineData((key, options) => this.get(key, options));
  }

  readPlotFromExcel(kind: 'userDefined' | 'pad'): string {
    const baseline = this.getPlotBaselineData();
    return kind === 'userDefined' ? baseline.userDefinedName : baseline.padPlotName;
  }

  /** Persist a baseline plot name. Overwrites so Dashboard always reads the latest created plots. */
  savePlotToExcel(kind: 'userDefined' | 'pad', name: string): void {
    const key = kind === 'userDefined' ? PLOT_BASELINE_USER_DEFINED_KEY : PLOT_BASELINE_PAD_PLOT_KEY;
    this.set(key, name.trim());
  }

  /**
   * Utilities → Version Control — pad/well always from shared Excel Padname / WellName.
   * Writes missing VersionControlBaseOwner / OwnerEmail (and related) keys when absent.
   */
  getVersionControlTestConfig(): VersionControlTestConfig {
    ensureVersionControlExcelKeys(
      (key, options) => this.get(key, options),
      (key, value) => this.set(key, value),
    );
    return buildVersionControlTestConfig(
      (key, options) => this.get(key, options),
      this.getPadWellData(),
    );
  }

  /** Pad/well that has only the master version (no extra versions created). */
  getVersionControlMasterOnlyPadWell(): VersionControlMasterOnlyPadWell {
    return buildVersionControlMasterOnlyPadWell(
      (key, options) => this.get(key, options),
      this.getPadWellData(),
    );
  }

  /** Fluids, proppants, and chemicals from Excel (Fluid1-4, Proppant1-4, Chemical1-4, etc.). */
  getMaterialSelectionData(): MaterialSelectionData {
    return buildMaterialSelectionData((key, options) => this.get(key, options));
  }

  /** Report → Material Usage grid expectations (writes missing MaterialUsage_* keys first). */
  getMaterialUsageTestData(): MaterialUsageTestData {
    ensureMaterialUsageExcelKeys(
      (key, options) => this.get(key, options),
      (key, value) => this.set(key, value),
    );
    this.reader.reload();
    return buildMaterialUsageTestData((key, options) => this.get(key, options));
  }

  /** Pad, well, and Material Usage grid expectations from Excel. */
  getMaterialUsageFlowData(): MaterialUsageFlowData {
    ensureMaterialUsageExcelKeys(
      (key, options) => this.get(key, options),
      (key, value) => this.set(key, value),
    );
    this.reader.reload();
    return buildMaterialUsageFlowData((key, options) => this.get(key, options), this.getPadWellData());
  }

  /** Report → Post Job Data values (writes missing PostJobData_* keys first). */
  getPostJobDataTestData(): PostJobDataTestData {
    ensurePostJobDataExcelKeys(
      (key, options) => this.get(key, options),
      (key, value) => this.set(key, value),
    );
    return buildPostJobDataTestData((key, options) => this.get(key, options));
  }

  /** Pad, well, and Post Job Data values from Excel. */
  getPostJobDataFlowData(): PostJobDataFlowData {
    ensurePostJobDataExcelKeys(
      (key, options) => this.get(key, options),
      (key, value) => this.set(key, value),
    );
    return buildPostJobDataFlowData((key, options) => this.get(key, options));
  }

  /** Analysis → Entry Friction values (writes missing EntryFriction_* keys first). */
  getEntryFrictionTestData(): EntryFrictionTestData {
    ensureEntryFrictionExcelKeys(
      (key, options) => this.get(key, options),
      (key, value) => this.set(key, value),
    );
    this.reader.reload();
    return buildEntryFrictionTestData((key, options) => this.get(key, options));
  }

  /** Pad, well, and Entry Friction values from Excel. */
  getEntryFrictionFlowData(): EntryFrictionFlowData {
    ensureEntryFrictionExcelKeys(
      (key, options) => this.get(key, options),
      (key, value) => this.set(key, value),
    );
    this.reader.reload();
    return buildEntryFrictionFlowData(
      (key, options) => this.get(key, options),
      this.getPadWellData(),
    );
  }

  /** Dashboard names / plot lists (writes missing Dashboard_* keys first). */
  getDashboardTestData(): DashboardTestData {
    ensureDashboardExcelKeys(
      (key, options) => this.get(key, options),
      (key, value) => this.set(key, value),
    );
    return buildDashboardTestData((key, options) => this.get(key, options));
  }

  /** Pad, well, and Dashboard values from Excel. Includes PlotBaseline* plots after Surf PRC / Btm PRC. */
  getDashboardFlowData(): DashboardFlowData {
    ensureDashboardExcelKeys(
      (key, options) => this.get(key, options),
      (key, value) => this.set(key, value),
    );
    return buildDashboardFlowData(
      (key, options) => this.get(key, options),
      this.getPadWellData(),
      this.getPlotBaselineData(),
    );
  }

  /** Primary fluid, wellbore, rheology, thermal, and chemical data for edit-fluid. */
  getEditFluidTestData(): EditFluidTestData {
    return buildEditFluidTestData((key, options) => this.get(key, options));
  }

  /** Heat Transfer Parameters defaults, fill values, and temperature grid from Excel. */
  getHeatTransferTestData(): HeatTransferTestData {
    return buildHeatTransferTestData((key, options) => this.get(key, options));
  }

  /** Pad, well, and Heat Transfer field values from Excel (same pattern as material tests). */
  getHeatTransferFlowData(): HeatTransferFlowData {
    return buildHeatTransferFlowData((key, options) => this.get(key, options));
  }

  /** Channel Input field values from Excel (writes missing ChannelInput_* keys first). */
  getChannelInputTestData(): ChannelInputTestData {
    ensureChannelInputExcelKeys(
      (key, options) => this.get(key, options),
      (key, value) => this.set(key, value),
    );
    return buildChannelInputTestData((key, options) => this.get(key, options));
  }

  /** Pad, well, and Channel Input values from Excel. */
  getChannelInputFlowData(): ChannelInputFlowData {
    ensureChannelInputExcelKeys(
      (key, options) => this.get(key, options),
      (key, value) => this.set(key, value),
    );
    return buildChannelInputFlowData((key, options) => this.get(key, options));
  }

  /** Reservoir Parameters field values from Excel (writes missing ReservoirParameters_* keys first). */
  getReservoirParametersTestData(): ReservoirParametersTestData {
    ensureReservoirParametersExcelKeys(
      (key, options) => this.get(key, options),
      (key, value) => this.set(key, value),
    );
    return buildReservoirParametersTestData((key, options) => this.get(key, options));
  }

  /** Pad, well, and Reservoir Parameters values from Excel. */
  getReservoirParametersFlowData(): ReservoirParametersFlowData {
    ensureReservoirParametersExcelKeys(
      (key, options) => this.get(key, options),
      (key, value) => this.set(key, value),
    );
    return buildReservoirParametersFlowData((key, options) => this.get(key, options));
  }

  /** Design Treatment Schedule values from Excel (adds/updates DesignTreatment_* keys first). */
  getDesignTreatmentTestData(): DesignTreatmentTestData {
    ensureDesignTreatmentExcelKeys(
      (key, options) => this.get(key, options),
      (key, value) => this.set(key, value),
    );
    return buildDesignTreatmentTestData((key, options) => this.get(key, options));
  }

  /** Pad, well, and Design Treatment Schedule values from Excel. */
  getDesignTreatmentFlowData(): DesignTreatmentFlowData {
    ensureDesignTreatmentExcelKeys(
      (key, options) => this.get(key, options),
      (key, value) => this.set(key, value),
    );
    return buildDesignTreatmentFlowData((key, options) => this.get(key, options));
  }

  /** Treatment Totals tab assertion values from Excel (writes missing TreatmentTotals_* keys first). */
  getTreatmentTotalsTestData(): TreatmentTotalsTestData {
    ensureTreatmentTotalsExcelKeys(
      (key, options) => this.get(key, options),
      (key, value) => this.set(key, value),
    );
    this.reader.reload();
    return buildTreatmentTotalsTestData((key, options) => this.get(key, options));
  }

  /** Pad, well, and Treatment Totals values from Excel. */
  getTreatmentTotalsFlowData(): TreatmentTotalsFlowData {
    ensureTreatmentTotalsExcelKeys(
      (key, options) => this.get(key, options),
      (key, value) => this.set(key, value),
    );
    this.reader.reload();
    return buildTreatmentTotalsFlowData((key, options) => this.get(key, options));
  }

  /** Drilled Hole grid values from Excel (writes missing DrilledHole_* keys first). */
  getDrilledHoleTestData(): DrilledHoleTestData {
    ensureDrilledHoleExcelKeys(
      (key, options) => this.get(key, options),
      (key, value) => this.set(key, value),
    );
    return buildDrilledHoleTestData((key, options) => this.get(key, options));
  }

  /** Pad, well, and Drilled Hole values from Excel (shared Padname / WellName). */
  getDrilledHoleFlowData(): DrilledHoleFlowData {
    ensureDrilledHoleExcelKeys(
      (key, options) => this.get(key, options),
      (key, value) => this.set(key, value),
    );
    return buildDrilledHoleFlowData(
      (key, options) => this.get(key, options),
      this.getPadWellData(),
    );
  }

  /** Casing grid values from Excel (writes missing Casing_* keys first). */
  getCasingTestData(): CasingTestData {
    ensureCasingExcelKeys(
      (key, options) => this.get(key, options),
      (key, value) => this.set(key, value),
    );
    return buildCasingTestData((key, options) => this.get(key, options));
  }

  /** Pad, well, and Casing values from Excel (shared Padname / WellName). */
  getCasingFlowData(): CasingFlowData {
    ensureCasingExcelKeys(
      (key, options) => this.get(key, options),
      (key, value) => this.set(key, value),
    );
    return buildCasingFlowData(
      (key, options) => this.get(key, options),
      this.getPadWellData(),
    );
  }

  /** Surface Line/Tubing grid values from Excel (writes missing SLT_* keys first). */
  getSurfaceLineTubingTestData(): SurfaceLineTubingTestData {
    ensureSurfaceLineTubingExcelKeys(
      (key, options) => this.get(key, options),
      (key, value) => this.set(key, value),
    );
    return buildSurfaceLineTubingTestData((key, options) => this.get(key, options));
  }

  /** Pad, well, and Surface Line/Tubing values from Excel (shared Padname / WellName). */
  getSurfaceLineTubingFlowData(): SurfaceLineTubingFlowData {
    ensureSurfaceLineTubingExcelKeys(
      (key, options) => this.get(key, options),
      (key, value) => this.set(key, value),
    );
    return buildSurfaceLineTubingFlowData(
      (key, options) => this.get(key, options),
      this.getPadWellData(),
    );
  }

  /** Perforation Intervals values from Excel (writes missing PI_* keys first). */
  getPerforationIntervalsTestData(): PerforationIntervalsTestData {
    ensurePerforationIntervalsExcelKeys(
      (key, options) => this.get(key, options),
      (key, value) => this.set(key, value),
    );
    return buildPerforationIntervalsTestData((key, options) => this.get(key, options));
  }

  /** Pad, well, and Perforation Intervals values from Excel (shared Padname / WellName). */
  getPerforationIntervalsFlowData(): PerforationIntervalsFlowData {
    ensurePerforationIntervalsExcelKeys(
      (key, options) => this.get(key, options),
      (key, value) => this.set(key, value),
    );
    return buildPerforationIntervalsFlowData(
      (key, options) => this.get(key, options),
      this.getPadWellData(),
    );
  }

  /** Directional Survey mode + `directionalSurvey` sheet rows (creates sheet if missing). */
  getDirectionalSurveyTestData(): DirectionalSurveyTestData {
    this.ensureDirectionalSurveyReady();
    return buildDirectionalSurveyTestData(
      (key, options) => this.get(key, options),
      (sheet) => this.reader.readRows(sheet),
    );
  }

  /** Pad, well, and Directional Survey paste data from Excel. */
  getDirectionalSurveyFlowData(): DirectionalSurveyFlowData {
    this.ensureDirectionalSurveyReady();
    return buildDirectionalSurveyFlowData(
      (key, options) => this.get(key, options),
      (sheet) => this.reader.readRows(sheet),
      this.getPadWellData(),
    );
  }

  private ensureDirectionalSurveyReady(): void {
    this.reader.reload();
    ensureDirectionalSurveyExcel(
      (key, options) => this.get(key, options),
      (key, value) => this.set(key, value),
      (sheet) => this.reader.readRows(sheet),
      (sheet, rows) => this.writer.writeRows(sheet, rows, true),
      this.reader.getSheetNames(),
    );
    this.reader.reload();
  }

  /** Path Summary expected values from Excel (writes missing PathSummary_* keys first). */
  getPathSummaryTestData(): PathSummaryTestData {
    ensurePathSummaryExcelKeys(
      (key, options) => this.get(key, options),
      (key, value) => this.set(key, value),
    );
    return buildPathSummaryTestData((key, options) => this.get(key, options));
  }

  /** Pad, well, and Path Summary values from Excel (shared Padname / WellName). */
  getPathSummaryFlowData(): PathSummaryFlowData {
    ensurePathSummaryExcelKeys(
      (key, options) => this.get(key, options),
      (key, value) => this.set(key, value),
    );
    return buildPathSummaryFlowData(
      (key, options) => this.get(key, options),
      this.getPadWellData(),
    );
  }

  /** @deprecated Use getEditFluidTestData */
  getEditFluidMaterialData(): EditFluidTestData {
    return this.getEditFluidTestData();
  }

  readRows(sheetName?: string) {
    return this.reader.readRows(sheetName ?? this.resolveDataSheet());
  }

  readAsObjects(sheetName?: string) {
    return this.reader.readAsObjects(sheetName ?? this.resolveDataSheet());
  }

  getSheetNames(): string[] {
    return this.reader.getSheetNames();
  }
}
