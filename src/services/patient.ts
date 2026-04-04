import { App, Vault, TFile, TFolder, TAbstractFile, moment } from 'obsidian';
import { LIBRARY_CONTENT } from '../generated/library-content';
import { ensureFolder } from './vault-utils';
import { PATIENTS_SUBFOLDER } from '../constants';

export function detectCanvasModels(app: App, rootFolder: string): Record<string, string> {
    const models: Record<string, string> = {};

    // 1. Built-in models from library content
    for (const relativePath of Object.keys(LIBRARY_CONTENT)) {
        if (relativePath.includes('Plantilla_Canvas')) {
            const fileName = relativePath.split('/').pop() || '';
            let cleanName = fileName
                .replace('Plantilla_Canvas_', '')
                .replace('.canvas', '')
                .replace(/_/g, ' ')
                .trim();
            if (cleanName === 'Plantilla_Canvas') {
                cleanName = 'Tolin';
            }
            models[cleanName] = relativePath;
        }
    }

    // 2. User-created templates from vault Plantillas folder
    const templatePath = `${rootFolder}/Plantillas`;
    const folder = app.vault.getAbstractFileByPath(templatePath);
    if (folder && folder instanceof TFolder) {
        for (const child of folder.children) {
            if (child instanceof TFile && child.extension === 'canvas') {
                // Skip built-in templates (already registered above)
                if (child.name.startsWith('Plantilla_Canvas')) continue;
                const cleanName = child.basename.replace(/_/g, ' ');
                models[cleanName] = child.path;
            }
        }
    }

    return models;
}

export interface CreatePatientOptions {
    name: string;
    selectedModel: string;
    rootFolder: string;
    nextId: number;
}

export async function createPatient(
    app: App,
    options: CreatePatientOptions
): Promise<TFile | null> {
    const { name, selectedModel, rootFolder, nextId } = options;
    const vault = app.vault;
    const safeName = name.replace(/[\\/:*?"<>|]/g, '');
    const rootPatients = `${rootFolder}/${PATIENTS_SUBFOLDER}`;

    await ensureFolder(vault, rootPatients);

    const expedientId = String(nextId).padStart(3, '0');
    const folder = `${rootPatients}/${safeName}`;

    if (vault.getAbstractFileByPath(folder)) {
        return null;
    }

    await vault.createFolder(folder);
    await vault.createFolder(`${folder}/Historial`);

    // Patient note from template
    const textTemplateKey = Object.keys(LIBRARY_CONTENT).find(k =>
        k.includes('Plantilla_Paciente') || k.includes('Plantilla_Nota')
    );

    let noteContent = textTemplateKey ? LIBRARY_CONTENT[textTemplateKey] : '';

    if (noteContent) {
        noteContent = noteContent
            .replace(/\{\{NOMBRE\}\}/g, name)
            .replace(/\{\{FECHA\}\}/g, moment().format('DD/MM/YYYY'))
            .replace(/\{\{ID\}\}/g, expedientId);
    } else {
        noteContent = `# Expediente #${expedientId}: ${name}\n\n[[Tablero.canvas|>> ABRIR TABLERO]]`;
    }

    // Canvas from selected model (built-in or user-created)
    const models = detectCanvasModels(app, rootFolder);
    const canvasKey = models[selectedModel];
    let canvasContent = '{"nodes":[],"edges":[]}';

    if (canvasKey) {
        if (LIBRARY_CONTENT[canvasKey]) {
            canvasContent = LIBRARY_CONTENT[canvasKey];
        } else {
            // User-created template: read from vault
            const templateFile = vault.getAbstractFileByPath(canvasKey);
            if (templateFile instanceof TFile) {
                canvasContent = await vault.read(templateFile);
            }
        }
    }

    const noteFile = await vault.create(
        `${folder}/${expedientId}_Ficha_${safeName}.md`,
        noteContent
    );
    await vault.create(`${folder}/Tablero.canvas`, canvasContent);

    return noteFile;
}

export function findPatientFicha(app: App, rootFolder: string, patientName: string): TFile | null {
    const patientPath = `${rootFolder}/${PATIENTS_SUBFOLDER}/${patientName}`;
    const folder = app.vault.getAbstractFileByPath(patientPath);
    if (!folder || !(folder instanceof TFolder)) return null;

    return folder.children.find(
        (f: TAbstractFile): f is TFile =>
            f instanceof TFile && f.name.includes('Ficha') && f.extension === 'md'
    ) || null;
}
