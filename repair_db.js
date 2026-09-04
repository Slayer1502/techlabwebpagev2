const Database = require('better-sqlite3');
const fs = require('fs');

async function repair() {
    console.log('--- Database Repair Tool ---');
    const oldPath = 'techlab.sqlite';
    const newPath = 'techlab_fixed.sqlite';
    const backupPath = 'techlab_backup_' + Date.now() + '.sqlite';

    if (fs.existsSync(newPath)) fs.unlinkSync(newPath);

    const db = new Database(oldPath);
    try {
        console.log('Starting VACUUM INTO...');
        db.prepare(`VACUUM INTO '${newPath}'`).run();
        console.log('Successfully created rebuilt database file.');
        db.close();

        console.log('Backing up old database...');
        fs.renameSync(oldPath, backupPath);

        console.log('Replacing with fixed database...');
        fs.renameSync(newPath, oldPath);

        console.log('Repair complete! Old file backed up to: ' + backupPath);
    } catch (e) {
        console.error('Repair failed:', e.message);
        db.close();
    }
}

repair();
