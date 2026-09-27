const fs = require('fs');
const path = require('path');
const XLSX = require('../node_modules/xlsx');

const f1 = 'C:/Users/HP-SYS/.gemini/antigravity/brain/0d3a4120-b02d-4792-ae76-7874b1cd7c14/.user_uploaded/media_1790546565242.xls';
const wb1 = XLSX.readFile(f1);
const attRows = XLSX.utils.sheet_to_json(wb1.Sheets['Attendance'], { header: 1 });
const ghyabRows = XLSX.utils.sheet_to_json(wb1.Sheets['الغياب'], { header: 1 });

const f2 = 'C:/Users/HP-SYS/.gemini/antigravity/brain/0d3a4120-b02d-4792-ae76-7874b1cd7c14/.user_uploaded/media_1790546670210.xlsx';
const wb2 = XLSX.readFile(f2);
const rawAttRows = XLSX.utils.sheet_to_json(wb2.Sheets['Raw_Attendance'], { header: 1 });
const branchRows = XLSX.utils.sheet_to_json(wb2.Sheets['Branches'], { header: 1 });
const empMapRows = XLSX.utils.sheet_to_json(wb2.Sheets['Employee_Map'], { header: 1 });

// 1. Build master branch map: Code -> { region, manager }
const branchMap = {};
for (let i = 1; i < branchRows.length; i++) {
  const [bReg, bCode, bMgr] = branchRows[i];
  if (bCode) {
    const codeKey = String(bCode).trim().toUpperCase();
    branchMap[codeKey] = {
      region: bReg ? String(bReg).trim() : '',
      manager: bMgr ? String(bMgr).trim() : ''
    };
  }
}

// 2. Build master emp map: PF -> { name, region, branchCode, manager }
const empMap = {};
for (let i = 1; i < empMapRows.length; i++) {
  const [eName, ePF, eBranch, eCode, eMgr] = empMapRows[i];
  if (ePF) {
    const pfKey = String(Math.floor(Number(ePF)) || ePF).trim();
    empMap[pfKey] = {
      name: eName ? String(eName).trim() : '',
      region: eBranch ? String(eBranch).trim() : '',
      branchCode: eCode ? String(eCode).trim().toUpperCase() : '',
      manager: eMgr ? String(eMgr).trim() : ''
    };
  }
}

// 3. Helper to parse cell text
function parseStatus(rawVal) {
  const str = (rawVal || '').toString().trim();
  if (!str || str === '0' || str === '-') {
    return { status: 'off', shift: 'none', rawText: 'OFF', isOvertime: false };
  }

  let shift = 'none';
  if (str.toUpperCase().includes('AM')) shift = 'AM';
  else if (str.toUpperCase().includes('PM')) shift = 'PM';

  const upper = str.toUpperCase();
  let isOvertime = upper.includes('OVERTIME');
  let status = 'present';

  if (upper.includes('SICK')) {
    status = 'sick';
  } else if (upper.includes('AL') || upper.includes('LEAVE')) {
    status = 'leave';
  } else if (upper.includes('ABS')) {
    status = 'absent';
  } else if (upper.includes('DELAY') || upper.includes('LATE')) {
    status = 'late';
  } else if (upper.includes('OVERTIME')) {
    status = 'overtime';
  } else if (upper.includes('ONTIME') || upper.includes('ON TIME')) {
    status = 'present';
  } else if (upper === 'OFF' || upper.startsWith('OFF')) {
    status = isOvertime ? 'overtime' : 'off';
  } else if (upper.includes('HOLIDAY')) {
    status = 'off';
  }

  return { status, shift, rawText: str, isOvertime };
}

// 4. Normalize region label in Arabic & English
function normalizeRegion(reg) {
  const r = (reg || '').toString().trim().toLowerCase();
  if (r.includes('central') || r.includes('وسط')) return 'الوسطى (Central)';
  if (r.includes('east') || r.includes('شرق')) return 'الشرقية (Eastern)';
  if (r.includes('west') || r.includes('غرب')) return 'الغربية (Western)';
  if (r.includes('north') || r.includes('شمال')) return 'الشمالية (Northern)';
  if (r.includes('south') || r.includes('جنوب')) return 'الجنوبية (Southern)';
  return reg ? String(reg).trim() : 'إدارة عامة / غير محدد';
}

// Map of all 317 employees by PFNumber
const recordsMap = new Map();

// Process File 1 Attendance sheet (days 1..26)
for (let r = 1; r < attRows.length; r++) {
  const row = attRows[r];
  if (!row || !row[0]) continue;
  const name = String(row[0]).trim();
  const pf = row[1] ? String(Math.floor(Number(row[1])) || row[1]).trim() : '';
  if (!pf) continue;
  const pfAtt = row[2] ? String(Math.floor(Number(row[2])) || row[2]).trim() : pf;
  let reg = row[3] ? String(row[3]).trim() : '';
  let code = row[4] ? String(row[4]).trim().toUpperCase() : '';

  let manager = '';
  // Check EmpMap first
  if (empMap[pf]) {
    manager = empMap[pf].manager;
    if (!reg && empMap[pf].region) reg = empMap[pf].region;
    if (!code && empMap[pf].branchCode) code = empMap[pf].branchCode;
  }
  // Check BranchMap
  if (!manager && code && branchMap[code]) {
    manager = branchMap[code].manager;
    if (!reg && branchMap[code].region) reg = branchMap[code].region;
  }

  // Days 1..26
  const days = {};
  for (let d = 1; d <= 26; d++) {
    const val = row[4 + d]; // index 5 is day 1, index 30 is day 26
    const parsed = parseStatus(val);
    days[d] = {
      dayNumber: d,
      dateStr: `اليوم ${d}`,
      rawText: parsed.rawText,
      status: parsed.status,
      shift: parsed.shift,
      isOvertime: parsed.isOvertime
    };
  }

  const isUnlinked = !manager || manager === 'إدارة عامة / غير معين' || manager === '0' || !code || code === '42';
  const finalManager = manager && manager !== '0' ? manager : 'إدارة عامة / غير معين';
  const finalRegion = normalizeRegion(reg);
  const finalCode = code && code !== '42' ? code : (code === '42' ? 'SAF-42' : 'غير محدد');

  const day1 = days[1] || { status: 'present', shift: 'AM', rawText: 'AM : onTime' };

  recordsMap.set(pf, {
    id: `safari-emp-${pf}`,
    employeeId: pf,
    employeeName: name,
    pfAttendance: pfAtt,
    region: finalRegion,
    branchCode: finalCode,
    managerName: finalManager,
    department: finalRegion,
    date: 'اليوم 1',
    activeDayNumber: 1,
    status: day1.status,
    shift: day1.shift,
    rawStatus: day1.rawText,
    lateMinutes: day1.status === 'late' ? 30 : 0,
    isUnlinked,
    days
  });
}

// Add any missing from File 2 Raw_Attendance (days 1..21)
for (let r = 1; r < rawAttRows.length; r++) {
  const row = rawAttRows[r];
  if (!row || !row[0]) continue;
  const name = String(row[0]).trim();
  const pf = row[1] ? String(Math.floor(Number(row[1])) || row[1]).trim() : '';
  if (!pf) continue;

  if (!recordsMap.has(pf)) {
    const pfAtt = row[2] ? String(Math.floor(Number(row[2])) || row[2]).trim() : pf;
    let reg = row[3] ? String(row[3]).trim() : '';
    let code = row[4] ? String(row[4]).trim().toUpperCase() : '';
    let manager = row[37] ? String(row[37]).trim() : '';

    if (!manager && empMap[pf]) {
      manager = empMap[pf].manager;
      if (!reg && empMap[pf].region) reg = empMap[pf].region;
      if (!code && empMap[pf].branchCode) code = empMap[pf].branchCode;
    }
    if (!manager && code && branchMap[code]) {
      manager = branchMap[code].manager;
      if (!reg && branchMap[code].region) reg = branchMap[code].region;
    }

    const days = {};
    for (let d = 1; d <= 26; d++) {
      let val = d <= 21 ? row[4 + d] : '';
      const parsed = parseStatus(val);
      days[d] = {
        dayNumber: d,
        dateStr: `اليوم ${d}`,
        rawText: parsed.rawText,
        status: parsed.status,
        shift: parsed.shift,
        isOvertime: parsed.isOvertime
      };
    }

    const isUnlinked = !manager || manager === 'إدارة عامة / غير معين' || manager === '0' || !code || code === '42';
    const finalManager = manager && manager !== '0' ? manager : 'إدارة عامة / غير معين';
    const finalRegion = normalizeRegion(reg);
    const finalCode = code && code !== '42' ? code : (code === '42' ? 'SAF-42' : 'غير محدد');
    const day1 = days[1] || { status: 'present', shift: 'AM', rawText: 'AM : onTime' };

    recordsMap.set(pf, {
      id: `safari-emp-${pf}`,
      employeeId: pf,
      employeeName: name,
      pfAttendance: pfAtt,
      region: finalRegion,
      branchCode: finalCode,
      managerName: finalManager,
      department: finalRegion,
      date: 'اليوم 1',
      activeDayNumber: 1,
      status: day1.status,
      shift: day1.shift,
      rawStatus: day1.rawText,
      lateMinutes: day1.status === 'late' ? 30 : 0,
      isUnlinked,
      days
    });
  }
}

// Overlay any specific attendance from الغياب sheet (for days 24, 25, 26)
for (let r = 1; r < ghyabRows.length; r++) {
  const gRow = ghyabRows[r];
  if (!gRow || !gRow[0]) continue;
  const pf = String(Math.floor(Number(gRow[1])) || gRow[1]).trim();
  const rec = recordsMap.get(pf);
  if (rec) {
    for (let i = 0; i < 3; i++) {
      const dayNum = 24 + i;
      const gVal = (gRow[4 + i] || '').toString().trim();
      if (gVal) {
        const parsed = parseStatus(gVal);
        rec.days[dayNum] = {
          dayNumber: dayNum,
          dateStr: `اليوم ${dayNum}`,
          rawText: parsed.rawText,
          status: parsed.status,
          shift: parsed.shift,
          isOvertime: parsed.isOvertime
        };
      }
    }
  }
}

const finalRecords = Array.from(recordsMap.values());
console.log('Total consolidated employees:', finalRecords.length);

const unlinkedList = finalRecords.filter(r => r.isUnlinked);
console.log('Unlinked employees count:', unlinkedList.length);
console.log('Unlinked sample:', unlinkedList.map(u => ({ name: u.employeeName, pf: u.employeeId, manager: u.managerName })));

const managerCounts = {};
finalRecords.forEach(r => {
  managerCounts[r.managerName] = (managerCounts[r.managerName] || 0) + 1;
});
console.log('Manager distribution:', managerCounts);
