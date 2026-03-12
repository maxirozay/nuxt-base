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

    await cleanOldBackups()
    if (config.s3.privateBucket) {
      const backups = await listFromS3('backups', true)
      await Promise.all(
        backups.map((b) => {
          if (b.updatedAt && b.updatedAt < new Date(Date.now() - getBackupRetentionMS())) {
            return deleteFromS3(`backups/${b.name}`, true)
          }
        }),
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
