const XLSX = require('../node_modules/xlsx');

const wb = XLSX.readFile('exmples/SAfari.xlsx');
console.log('Sheet names:', wb.SheetNames);

const rawAtt = XLSX.utils.sheet_to_json(wb.Sheets['Raw_Attendance'], { header: 1 });
console.log('Raw_Attendance headers (first 10):', rawAtt[0].slice(0, 10));
console.log('Raw_Attendance total rows:', rawAtt.length);
console.log('Raw_Attendance headers length:', rawAtt[0].length);
console.log('Raw_Attendance column 0..4:', rawAtt[0].slice(0, 5));
console.log('Raw_Attendance days columns:', rawAtt[0].slice(5, 35));
console.log('Raw_Attendance last columns:', rawAtt[0].slice(30));

const empMap = XLSX.utils.sheet_to_json(wb.Sheets['Employee_Map'], { header: 1 });
console.log('Employee_Map total rows:', empMap.length);
console.log('Employee_Map headers:', empMap[0]);

const branches = XLSX.utils.sheet_to_json(wb.Sheets['Branches'], { header: 1 });
console.log('Branches total rows:', branches.length);
console.log('Branches headers:', branches[0]);

// Find employees in Raw_Attendance whose manager or region is missing or unlinked
const unlinked = [];
for (let r = 1; r < rawAtt.length; r++) {
  const row = rawAtt[r];
  if (!row || !row[0]) continue;
  const name = row[0];
  const pf = row[1];
  const region = row[3];
  const code = row[4];
  const mgr = row[row.length - 1]; // or col 37
  if (!mgr || mgr === '0' || !region || region === 'NaN' || !code || code === 'NaN' || code === '42') {
    unlinked.push({ r, name, pf, region, code, mgr });
  }
}
console.log('Unlinked/special count:', unlinked.length);
console.log('Sample unlinked:', unlinked.slice(0, 15));
