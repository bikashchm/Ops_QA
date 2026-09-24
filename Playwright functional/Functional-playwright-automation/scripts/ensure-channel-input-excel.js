const XLSX = require('xlsx');

const path = 'test-data/excel/Liveplus_TestData.xlsx';
const sheet = 'Sheet1';
const wb = XLSX.readFile(path);
const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, defval: '' });

const defaults = {
  ChannelInput_Flowmeters: '2',
  ChannelInput_Densometers: '2',
  ChannelInput_AdditivesSmoothingPoints: '50',
  ChannelInput_SmoothChannels:
    "Treating Pressure|Bottomhole Pressure|Dead String Pressure|Clean Flow Rate|Slurry Flow Rate|Proppant Conc|Slurry Density|Nitrogen Flow Rate|CO2 Clean Flow Rate|Step Number/Total|Add'l Display Channel #1|Add'l Display Channel #2|Add'l Display Channel #3|Add'l Display Channel #4",
  ChannelInput_Unit_TreatingPressure: 'psi',
  ChannelInput_Unit_BottomholePressure: 'psi',
  ChannelInput_Unit_DeadStringPressure: 'psi',
  ChannelInput_Unit_CleanFlowRate: 'bpm',
  ChannelInput_Unit_SlurryFlowRate: 'bpm',
  ChannelInput_Unit_ProppantConc: 'ppg',
  ChannelInput_Unit_SlurryDensity: 'lbm/gal',
  ChannelInput_Unit_NitrogenFlowRate: 'scfm',
  ChannelInput_Unit_CO2CleanFlowRate: 'bpm',
  ChannelInput_UserDefinedName1: 'abc',
  ChannelInput_UserDefinedName2: 'abc1',
  ChannelInput_UserDefinedName3: 'abc2',
  ChannelInput_UnitType1: 'Activation Energy',
  ChannelInput_UnitType2: 'Build Rate Angle (Wellbore)',
  ChannelInput_UnitType3: 'Additive Mass Concentration',
  ChannelInput_ExpectedUnit1: '(kcal/mol)',
  ChannelInput_ExpectedUnit2: '(deg/100 ft)',
  ChannelInput_ExpectedUnit3: '(lb/Mgal)',
  ChannelInput_Formula1: 'COSH',
  ChannelInput_Formula2: 'LOG10',
  ChannelInput_Formula3: 'SIGN',
};

const map = new Map();
for (let i = 0; i < rows.length; i++) {
  const k = String(rows[i][0] || '').trim();
  if (k) map.set(k.toLowerCase(), i);
}

let added = 0;
for (const [k, v] of Object.entries(defaults)) {
  const idx = map.get(k.toLowerCase());
  if (idx === undefined) {
    rows.push([k, v]);
    added++;
    map.set(k.toLowerCase(), rows.length - 1);
  } else if (!String(rows[idx][1] || '').trim()) {
    rows[idx][1] = v;
    added++;
  }
}

wb.Sheets[sheet] = XLSX.utils.aoa_to_sheet(rows);
XLSX.writeFile(wb, path);
console.log('ChannelInput keys added/filled:', added);
