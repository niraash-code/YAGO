import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const ROOT_ENV = path.join(ROOT_DIR, '.env');
const TAURI_CONF = path.join(ROOT_DIR, 'src-tauri', 'tauri.conf.json');

function readEnv(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf-8');
    const vars = {};
    content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const [key, ...valueParts] = trimmed.split('=');
            vars[key.trim()] = valueParts.join('=').trim();
        }
    });
    return vars;
}

function updateTauriConf(port) {
    if (!fs.existsSync(TAURI_CONF)) {
        console.error(`Error: ${TAURI_CONF} not found.`);
        return;
    }

    const config = JSON.parse(fs.readFileSync(TAURI_CONF, 'utf-8'));
    const newDevUrl = `http://localhost:${port}`;

    if (config.build && config.build.devUrl !== newDevUrl) {
        console.log(`Updating tauri.conf.json devUrl to ${newDevUrl}`);
        config.build.devUrl = newDevUrl;
        fs.writeFileSync(TAURI_CONF, JSON.stringify(config, null, 2));
    } else {
        console.log("tauri.conf.json devUrl is up to date.");
    }
}

const envVars = readEnv(ROOT_ENV);
const port = envVars.VITE_PORT || '30000';

updateTauriConf(port);
console.log("Environment sync complete.");
