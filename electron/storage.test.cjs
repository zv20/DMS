const { app } = require('electron');
const { runStorageProjectionTest } = require('./storage-test-runner.cjs');

app.whenReady().then(() => {
  try {
    runStorageProjectionTest();
    console.log('SQLite storage projection test passed.');
  } finally {
    app.quit();
  }
}).catch((error) => { console.error(error); process.exitCode = 1; app.quit(); });
