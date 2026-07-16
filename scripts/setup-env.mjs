import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ENV_PATH = path.resolve(process.cwd(), '.env');
const ENV_EXAMPLE_PATH = path.resolve(process.cwd(), '.env.example');

function generateSecret() {
    return crypto.randomBytes(32).toString('base64');
}

function run() {
    // 1. Ensure .env exists
    if (!fs.existsSync(ENV_PATH)) {
        if (fs.existsSync(ENV_EXAMPLE_PATH)) {
            fs.copyFileSync(ENV_EXAMPLE_PATH, ENV_PATH);
            console.log('Created .env from .env.example');
        } else {
            fs.writeFileSync(ENV_PATH, '', 'utf-8');
            console.log('Created empty .env');
        }
    }

    // 2. Read existing env
    const content = fs.readFileSync(ENV_PATH, 'utf-8');
    const lines = content.split('\n');
    
    // Parse arguments (e.g. KEY=VALUE)
    const args = process.argv.slice(2);
    const updates = {};
    
    let shouldGenerateSecret = false;
    
    for (const arg of args) {
        if (arg === '--generate-secret') {
            shouldGenerateSecret = true;
            continue;
        }
        
        const eqIdx = arg.indexOf('=');
        if (eqIdx !== -1) {
            const key = arg.substring(0, eqIdx).trim();
            const value = arg.substring(eqIdx + 1).trim();
            updates[key] = value;
        }
    }

    let hasRealAuthSecret = false;
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('AUTH_SECRET=')) {
            const val = trimmed.split('=')[1]?.replace(/^"|"$/g, '');
            if (val && val !== 'replace-with-a-random-secret') {
                hasRealAuthSecret = true;
            }
            break;
        }
    }
    
    if (shouldGenerateSecret && !hasRealAuthSecret && !updates['AUTH_SECRET']) {
        updates['AUTH_SECRET'] = generateSecret();
    }

    // 3. Apply updates
    let newContent = '';
    const updatedKeys = new Set();

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const trimmed = line.trim();
        
        // Skip comments and empty lines
        if (trimmed && !trimmed.startsWith('#')) {
            const eqIdx = line.indexOf('=');
            if (eqIdx !== -1) {
                const key = line.substring(0, eqIdx).trim();
                
                // Automatically purge legacy NextAuth URLs to avoid strict CSRF origin mismatches
                if (key === 'AUTH_URL' || key === 'NEXTAUTH_URL') {
                    continue;
                }
                
                if (key in updates) {
                    line = `${key}=${updates[key].replace(/^"|"$/g, '')}`;
                    updatedKeys.add(key);
                }
            }
        }
        newContent += line;
        // Don't add newline at the end if it's the last line and it was empty
        if (i < lines.length - 1 && line !== '') {
            newContent += '\n';
        }
    }

    // 4. Append keys that weren't found
    for (const [key, value] of Object.entries(updates)) {
        if (!updatedKeys.has(key)) {
            if (newContent && !newContent.endsWith('\n')) {
                newContent += '\n';
            }
            newContent += `${key}=${value.replace(/^"|"$/g, '')}\n`;
        }
    }

    // 5. Write back
    fs.writeFileSync(ENV_PATH, newContent, 'utf-8');
    console.log(`Successfully updated ${Object.keys(updates).length} environment variables.`);
}

try {
    run();
} catch (err) {
    console.error('Error updating .env:', err);
    process.exit(1);
}
