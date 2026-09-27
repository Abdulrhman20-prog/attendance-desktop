const { execSync, spawn } = require('child_process');
const path = require('path');

// 1. Clear terminal screen
process.stdout.write('\x1Bc');

// Terminal color helpers
const cyan = (text) => `\x1b[36m${text}\x1b[0m`;
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const yellow = (text) => `\x1b[33m${text}\x1b[0m`;
const magenta = (text) => `\x1b[35m${text}\x1b[0m`;
const bold = (text) => `\x1b[1m${text}\x1b[0m`;
const dim = (text) => `\x1b[2m${text}\x1b[0m`;

console.log(cyan('======================================================================'));
console.log(bold(magenta('   🌟 نظام متابعة الحضور والانصراف (سفاري SAfari) - إصدار سطح المكتب')));
console.log(cyan('======================================================================'));
console.log('');

// 2. Kill previous sessions on port 5173 (Windows)
console.log(yellow(' [1/3] 🔍 جاري فحص وإغلاق أي جلسات سابقة نشطة للسيرفر...'));

try {
  if (process.platform === 'win32') {
    // Find PID on port 5173
    const output = execSync('netstat -ano | findstr :5173', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const lines = output.trim().split('\n');
    const pids = new Set();
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && !isNaN(Number(pid)) && Number(pid) !== process.pid) {
        pids.add(pid);
      }
    }

    if (pids.size > 0) {
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid} /T`, { stdio: 'ignore' });
          console.log(green(`   ✓ تم إغلاق الجلسة السابقة بنجاح (PID: ${pid})`));
        } catch {
          // ignore if already exited
        }
      }
    } else {
      console.log(green('   ✓ لم يتم العثور على جلسات سابقة معلقة، المنفذ 5173 متاح وجاهز.'));
    }
  }
} catch (err) {
  // If findstr returned exit code 1, it means port is already free
  console.log(green('   ✓ المنفذ 5173 متاح وجاهز فوراً للتشغيل.'));
}

console.log('');
console.log(yellow(' [2/3] 🚀 تجهيز وتشغيل خادم التطوير (Vite Development Server)...'));
console.log(dim(' ---------------------------------------------------------------------'));
console.log(`   🌐 الرابط المحلي:   ${bold(green('http://localhost:5173/'))}`);
console.log(`   📁 قاعدة البيانات:  ${bold('SAfari.xlsx (310 موظف - 7 مدراء - 14 يوم)')}`);
console.log(`   ⌨️  للإيقاف في أي وقت: اضغط ${bold(yellow('Ctrl + C'))}`);
console.log(dim(' ---------------------------------------------------------------------'));
console.log('');

// 3. Launch Vite
const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const child = spawn(npxCmd, ['vite'], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
  shell: true
});

child.on('error', (err) => {
  console.error('\x1b[31m❌ خطأ أثناء تشغيل السيرفر:\x1b[0m', err.message);
});

child.on('exit', (code) => {
  console.log(yellow(`\n تم إيقاف السيرفر (كود الخروج: ${code}).`));
});
