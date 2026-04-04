const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '..', 'content');
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'generated', 'library-content.ts');

const TEMPLATE_FOLDER = 'Plantillas';
const CONCEPTS_FOLDER = 'Conceptos';

function getFiles(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return [];
    for (const file of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            results = results.concat(getFiles(fullPath));
        } else if (file.endsWith('.md') || file.endsWith('.canvas')) {
            results.push(fullPath);
        }
    }
    return results;
}

function cleanLinks(content) {
    return content.replace(/\[\[([^\]]+)\]\]/g, (match, linkInner) => {
        try {
            const parts = linkInner.split('|');
            const cleanFileName = parts[0].split('/').pop();
            return parts[1] ? `[[${cleanFileName}|${parts[1]}]]` : `[[${cleanFileName}]]`;
        } catch (e) {
            return match;
        }
    });
}

const files = getFiles(CONTENT_DIR);
console.log(`Processing ${files.length} content files...`);

const entries = {};

for (const filePath of files) {
    let content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);

    const subFolder = fileName.startsWith('Plantilla_') ? TEMPLATE_FOLDER : CONCEPTS_FOLDER;
    const finalPath = `${subFolder}/${fileName}`;

    if (filePath.endsWith('.md')) {
        content = cleanLinks(content);
    }

    entries[finalPath] = content;
    console.log(`  -> ${finalPath}`);
}

const output = `// AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
// Run "npm run generate" to regenerate from content/ files

export const LIBRARY_CONTENT: Record<string, string> = ${JSON.stringify(entries, null, 4)};
`;

fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
fs.writeFileSync(OUTPUT_FILE, output, 'utf8');
console.log(`\nGenerated ${Object.keys(entries).length} content entries -> ${OUTPUT_FILE}`);
