const fs = require('fs');
const path = require('path');
const XLSX = require('../node_modules/xlsx');

// Let's inspect the sheets and build a consolidated dataset from the user input and SAfari.xlsx
const wb = XLSX.readFile('exmples/SAfari.xlsx');

// 1. Branches sheet: Branch, Code, Manager Name
const branchesSheet = XLSX.utils.sheet_to_json(wb.Sheets['Branches'], { header: 1 });
const branchToManager = {};
const branchToRegion = {};
for (let i = 1; i < branchesSheet.length; i++) {
  const [bReg, bCode, bMgr] = branchesSheet[i];
  if (bCode) {
    const codeKey = String(bCode).trim().toUpperCase();
    if (bMgr) branchToManager[codeKey] = String(bMgr).trim();
    if (bReg) branchToRegion[codeKey] = String(bReg).trim();
  }
}

// 2. Employee_Map sheet: Employee Name, PFNumber, Branch, Code, Manager
const empMapSheet = XLSX.utils.sheet_to_json(wb.Sheets['Employee_Map'], { header: 1 });
const empToManager = {};
const empToBranch = {};
const empToRegion = {};
for (let i = 1; i < empMapSheet.length; i++) {
  const [eName, ePF, eBranch, eCode, eMgr] = empMapSheet[i];
  if (ePF) {
    const pfKey = String(Math.floor(Number(ePF)) || ePF).trim();
    if (eMgr) empToManager[pfKey] = String(eMgr).trim();
    if (eCode) empToBranch[pfKey] = String(eCode).trim().toUpperCase();
    if (eBranch) empToRegion[pfKey] = String(eBranch).trim();
  }
}

console.log('Known branches count:', Object.keys(branchToManager).length);
console.log('Known employees in map:', Object.keys(empToManager).length);

// Let's check how many unique managers exist
const managersSet = new Set(Object.values(branchToManager));
console.log('Managers:', Array.from(managersSet));
