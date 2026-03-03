import fs from 'fs';
import readline from 'readline';

const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile || !outputFile) {
  console.error('Usage: node transform_auth.js <input_file> <output_file>');
  process.exit(1);
}

const outputStream = fs.createWriteStream(outputFile);
outputStream.write('BEGIN;\n');

const rl = readline.createInterface({
  input: fs.createReadStream(inputFile),
  crlfDelay: Infinity
});

let inCopyBlock = false;
let columns = [];
let idIndex = -1;
let emailIndex = -1;
let createdAtIndex = -1;
let count = 0;

rl.on('line', (line) => {
  const trimmedLine = line.trim();

  // 1. Look for the COPY statement start
  if (!inCopyBlock) {
    // Specifically looking for COPY "auth"."users" as requested, but keeping it flexible for slight variations
    // Matches: COPY "auth"."users" ("id", "email", ...) FROM stdin;
    if (trimmedLine.startsWith('COPY "auth"."users"') || trimmedLine.startsWith('COPY auth.users')) {
       console.log('Found COPY block: ' + trimmedLine);
       
       // Extract content inside parentheses
       const match = trimmedLine.match(/\((.*)\)/);
       if (match && match[1]) {
         // Parse columns: "col1", "col2", ...
         // Remove quotes and whitespace
         columns = match[1].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
         
         idIndex = columns.indexOf('id');
         emailIndex = columns.indexOf('email');
         createdAtIndex = columns.indexOf('created_at');
         
         if (idIndex === -1 || emailIndex === -1) {
           console.error('Error: Could not find "id" or "email" columns in COPY statement.');
           // Don't exit, just don't process lines? Or exit?
           // Better to exit to warn user.
           process.exit(1); 
         }
         
         inCopyBlock = true;
         // Do not process this line as data
         return; 
       }
    }
    return; // Skip all lines before COPY block
  }

  // 2. Look for the end of the COPY block
  if (trimmedLine === '\\.') {
    inCopyBlock = false;
    console.log('End of COPY block reached.');
    return;
  }

  // 3. Process data lines
  if (inCopyBlock && trimmedLine) {
    // COPY format is tab-separated text by default (even with binary it's different, but --data-only --use-copy usually text)
    // However, if strings contain tabs, they might be escaped or use a different format.
    // Standard text format: tabs separate columns. \N is null.
    // We assume standard text format here.
    
    // Split by tab
    const values = line.split('\t');
    
    // Safety check on column count match?
    // Not strictly necessary if we just need specific indices.
    
    const id = values[idIndex]; 
    const email = values[emailIndex];
    const createdAt = createdAtIndex !== -1 ? values[createdAtIndex] : null;

    if (id && email && id !== '\\N' && email !== '\\N') {
      // Escape single quotes for SQL
      const safeId = id.replace(/'/g, "''");
      const safeEmail = email.replace(/'/g, "''");
      
      let sql;
      if (createdAt && createdAt !== '\\N') {
        const safeCreatedAt = createdAt.replace(/'/g, "''");
        sql = `INSERT INTO auth.users (id, email, created_at) VALUES ('${safeId}', '${safeEmail}', '${safeCreatedAt}') ON CONFLICT (id) DO NOTHING;\n`;
      } else {
        sql = `INSERT INTO auth.users (id, email) VALUES ('${safeId}', '${safeEmail}') ON CONFLICT (id) DO NOTHING;\n`;
      }
      
      outputStream.write(sql);
      count++;
    }
  }
});

rl.on('close', () => {
  outputStream.write('COMMIT;\n');
  outputStream.end();
  console.log(`Transformation complete. Generated ${count} INSERT statements.`);
});
