import fs from 'fs/promises'

export default defineTask({
  meta: {
    name: 'backup',
    description: 'Backup DB',
  },
  async run() {
    const timestamp = new Date().toISOString()
    const backupName = `backups/backup-${timestamp}.sql`
    const config = useRuntimeConfig()

    await createDatabaseBackup(backupName, config.db, config.backup.dumpArgs)
    if (config.s3.privateBucket) {
      await uploadToS3(
        backupName,
        await fs.readFile(backupName),
        'application/octet-stream',
        'private',
        true,
      )
    }

    return {
      result: {
        success: true,
        backupName,
        timestamp,
      },
    }
  },
})
