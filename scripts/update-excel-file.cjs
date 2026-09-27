const fs = require('fs');
const XLSX = require('../node_modules/xlsx');

const f1 = 'C:/Users/HP-SYS/.gemini/antigravity/brain/0d3a4120-b02d-4792-ae76-7874b1cd7c14/.user_uploaded/media_1790546565242.xls';
const wb1 = XLSX.readFile(f1);
const attRows = XLSX.utils.sheet_to_json(wb1.Sheets['Attendance'], { header: 1 });

const f2 = 'C:/Users/HP-SYS/.gemini/antigravity/brain/0d3a4120-b02d-4792-ae76-7874b1cd7c14/.user_uploaded/media_1790546670210.xlsx';
const wb2 = XLSX.readFile(f2);
const branchRows = XLSX.utils.sheet_to_json(wb2.Sheets['Branches'], { header: 1 });
const empMapRows = XLSX.utils.sheet_to_json(wb2.Sheets['Employee_Map'], { header: 1 });

// Master branch map
const branchMap = {};
for (let i = 1; i < branchRows.length; i++) {
  const [bReg, bCode, bMgr] = branchRows[i];
  if (bCode) branchMap[String(bCode).trim().toUpperCase()] = { region: bReg ? String(bReg).trim() : '', manager: bMgr ? String(bMgr).trim() : '' };
}

// Master emp map
const empMap = {};
for (let i = 1; i < empMapRows.length; i++) {
  const [eName, ePF, eBranch, eCode, eMgr] = empMapRows[i];
  if (ePF) empMap[String(Math.floor(Number(ePF)) || ePF).trim()] = { name: eName ? String(eName).trim() : '', region: eBranch ? String(eBranch).trim() : '', branchCode: eCode ? String(eCode).trim().toUpperCase() : '', manager: eMgr ? String(eMgr).trim() : '' };
}

// Write consolidated SAfari.xlsx with all sheets
const wb = XLSX.utils.book_new();

// Copy over Branches, Employee_Map, Managers
XLSX.utils.book_append_sheet(wb, wb2.Sheets['Branches'], 'Branches');
XLSX.utils.book_append_sheet(wb, wb2.Sheets['Employee_Map'], 'Employee_Map');
XLSX.utils.book_append_sheet(wb, wb2.Sheets['Managers'], 'Managers');

// Prepare Raw_Attendance with 26 days and linked managers
const header = ['Name', 'PFNumber', 'PFAttendance', 'Region', 'Code'];
for (let d = 1; d <= 26; d++) header.push(d);
header.push('Manager');

const rawAttData = [header];

for (let r = 1; r < attRows.length; r++) {
  const row = attRows[r];
  if (!row || !row[0]) continue;
  const name = String(row[0]).trim();
  const pf = row[1] ? String(Math.floor(Number(row[1])) || row[1]).trim() : '';
  const pfAtt = row[2] ? String(Math.floor(Number(row[2])) || row[2]).trim() : pf;
  let reg = row[3] ? String(row[3]).trim() : '';
  let code = row[4] ? String(row[4]).trim().toUpperCase() : '';

  let manager = '';
  if (empMap[pf]) {
    manager = empMap[pf].manager;
    if (!reg && empMap[pf].region) reg = empMap[pf].region;
    if (!code && empMap[pf].branchCode) code = empMap[pf].branchCode;
  }
  if (!manager && code && branchMap[code]) {
    manager = branchMap[code].manager;
    if (!reg && branchMap[code].region) reg = branchMap[code].region;
  }

  const outRow = [name, pf, pfAtt, reg || 'الوسطى', code || 'SAF001'];
  for (let d = 1; d <= 26; d++) {
    outRow.push(row[4 + d] || 'OFF');
  }
  outRow.push(manager || 'إدارة عامة / غير معين');
  rawAttData.push(outRow);
}

const rawAttSheet = XLSX.utils.aoa_to_sheet(rawAttData);
XLSX.utils.book_append_sheet(wb, rawAttSheet, 'Raw_Attendance');

// Copy Dashboard
if (wb2.Sheets['Dashboard']) {
  XLSX.utils.book_append_sheet(wb, wb2.Sheets['Dashboard'], 'Dashboard');
}

XLSX.writeFile(wb, 'exmples/SAfari.xlsx');
console.log('Successfully updated exmples/SAfari.xlsx with 26 days and 317 employees!');
