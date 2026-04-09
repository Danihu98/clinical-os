import { App, TFile, TFolder, TAbstractFile, moment } from 'obsidian';
import { ProcessType } from '../types';
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
    processType: ProcessType;
    selectedModel: string;
    rootFolder: string;
    nextId: number;
    extraData?: ProcessExtraData;
}

export interface ProcessExtraData {
    // child: responsible adult
    guardianName?: string;
    guardianRut?: string;
    guardianPhone?: string;
    guardianEmail?: string;
    // couple
    partnerName?: string;
    payer?: string;
    // family
    familyMembers?: string;
    indexPatient?: string;
    // group
    groupMembers?: string;
    // supervision
    supervisees?: string;
}

export async function createPatient(
    app: App,
    options: CreatePatientOptions
): Promise<TFile | null> {
    const { name, processType, selectedModel, rootFolder, nextId, extraData } = options;
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

    // Build note content based on process type
    const fecha = moment().format('DD/MM/YYYY');
    let noteContent: string;

    if (processType === 'individual') {
        noteContent = buildIndividualTemplate(name, expedientId, fecha);
    } else {
        noteContent = buildProcessTemplate(processType, name, expedientId, fecha, extraData);
    }

    // Canvas from selected model (built-in or user-created)
    const models = detectCanvasModels(app, rootFolder);
    const canvasKey = models[selectedModel];
    let canvasContent = '{"nodes":[],"edges":[]}';

    if (canvasKey) {
        if (LIBRARY_CONTENT[canvasKey]) {
            canvasContent = LIBRARY_CONTENT[canvasKey];
        } else {
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

function buildIndividualTemplate(name: string, id: string, fecha: string): string {
    // Use the existing template from library if available
    const textTemplateKey = Object.keys(LIBRARY_CONTENT).find(k =>
        k.includes('Plantilla_Paciente') || k.includes('Plantilla_Nota')
    );

    let content = textTemplateKey ? LIBRARY_CONTENT[textTemplateKey] : '';

    if (content) {
        return content
            .replace(/\{\{NOMBRE\}\}/g, name)
            .replace(/\{\{FECHA\}\}/g, fecha)
            .replace(/\{\{ID\}\}/g, id);
    }

    return `# Expediente #${id}: ${name}\n\n[[Tablero.canvas|>> ABRIR TABLERO]]`;
}

function buildProcessTemplate(
    type: ProcessType,
    name: string,
    id: string,
    fecha: string,
    extra?: ProcessExtraData,
): string {
    const frontmatter =
        `---\ntitle: "${name}"\ncreated: "${fecha}"\ntags:\nstatus: coordinando\n` +
        `expediente: "${id}"\nhonorarios: 0\ntipo_proceso: "${type}"\n---\n\n`;

    const sessionBlock =
        `---\n\n### Registro de sesiones\n\n` +
        `| **Fecha** | **Duración** | **Resumen de la sesión** | **Tareas/Pendientes** | **Próxima cita** |\n` +
        `| --------- | ------------ | ------------------------ | --------------------- | ---------------- |\n` +
        `| | | | | |\n\n` +
        `---\n\n### Notas generales\n\n---\n\n# Sesión 1\n\n`;

    switch (type) {
        case 'child':
            return frontmatter +
                `# Ficha de identificación — Proceso infanto-juvenil\n\n` +
                `## Datos del paciente\n` +
                `- **Nombre completo:** ${name}\n` +
                `- **Edad:**\n- **Género:**\n- **Curso/Nivel escolar:**\n` +
                `- **Fecha de registro:** ${fecha}\n` +
                `- **Número de expediente:** ${id}\n\n` +
                `## Adulto responsable\n` +
                `- **Nombre:** ${extra?.guardianName ?? ''}\n` +
                `- **RUT:** ${extra?.guardianRut ?? ''}\n` +
                `- **Teléfono:** ${extra?.guardianPhone ?? ''}\n` +
                `- **Correo electrónico:** ${extra?.guardianEmail ?? ''}\n` +
                `- **Relación con el paciente:**\n\n` +
                `---\n\n# Antecedentes relevantes\n\n` +
                `- **Motivo de consulta:**\n` +
                `- **Historial médico relevante:**\n` +
                `- **Antecedentes del desarrollo:**\n` +
                `- **Contexto familiar:**\n` +
                `- **Contexto escolar:**\n` +
                `- **Procesos psicoterapéuticos previos:**\n` +
                `- **Notas adicionales:**\n\n` +
                sessionBlock;

        case 'couple':
            return frontmatter +
                `# Ficha de identificación — Terapia de pareja\n\n` +
                `## Paciente 1\n` +
                `- **Nombre completo:** ${name}\n` +
                `- **Edad:**\n- **Género:**\n` +
                `- **Teléfono:**\n- **Correo electrónico:**\n- **RUT:**\n\n` +
                `## Paciente 2\n` +
                `- **Nombre completo:** ${extra?.partnerName ?? ''}\n` +
                `- **Edad:**\n- **Género:**\n` +
                `- **Teléfono:**\n- **Correo electrónico:**\n- **RUT:**\n\n` +
                `## Datos del proceso\n` +
                `- **Responsable de pago:** ${extra?.payer ?? ''}\n` +
                `- **Fecha de registro:** ${fecha}\n` +
                `- **Número de expediente:** ${id}\n\n` +
                `---\n\n# Antecedentes relevantes\n\n` +
                `- **Motivo de consulta:**\n` +
                `- **Tiempo de relación:**\n` +
                `- **Convivencia:** Sí / No\n` +
                `- **Hijos:** Sí / No — Edades:\n` +
                `- **Procesos de terapia de pareja previos:**\n` +
                `- **Notas adicionales:**\n\n` +
                sessionBlock;

        case 'family':
            return frontmatter +
                `# Ficha de identificación — Terapia familiar\n\n` +
                `## Paciente índice\n` +
                `- **Nombre:** ${extra?.indexPatient ?? name}\n` +
                `- **Edad:**\n- **Rol en la familia:**\n\n` +
                `## Miembros del grupo familiar\n` +
                `${extra?.familyMembers ?? '- \n- \n- '}\n\n` +
                `## Datos del proceso\n` +
                `- **Responsable de pago:**\n` +
                `- **Fecha de registro:** ${fecha}\n` +
                `- **Número de expediente:** ${id}\n\n` +
                `---\n\n# Antecedentes relevantes\n\n` +
                `- **Motivo de consulta:**\n` +
                `- **Estructura familiar:**\n` +
                `- **Dinámica familiar:**\n` +
                `- **Procesos terapéuticos previos:**\n` +
                `- **Notas adicionales:**\n\n` +
                sessionBlock;

        case 'group':
            return frontmatter +
                `# Ficha de identificación — Terapia grupal\n\n` +
                `## Datos del grupo\n` +
                `- **Nombre del grupo:** ${name}\n` +
                `- **Fecha de inicio:** ${fecha}\n` +
                `- **Número de expediente:** ${id}\n` +
                `- **Temática:**\n` +
                `- **Modalidad:** Abierto / Cerrado\n\n` +
                `## Integrantes\n` +
                `${extra?.groupMembers ?? '- \n- \n- '}\n\n` +
                `---\n\n# Antecedentes relevantes\n\n` +
                `- **Objetivos del grupo:**\n` +
                `- **Criterios de inclusión:**\n` +
                `- **Notas adicionales:**\n\n` +
                sessionBlock;

        case 'supervision':
            return frontmatter +
                `# Ficha de identificación — Supervisión clínica\n\n` +
                `## Datos del proceso\n` +
                `- **Nombre del proceso:** ${name}\n` +
                `- **Fecha de inicio:** ${fecha}\n` +
                `- **Número de expediente:** ${id}\n` +
                `- **Modalidad:** Individual / Grupal\n` +
                `- **Frecuencia:**\n\n` +
                `## Supervisados\n` +
                `${extra?.supervisees ?? '- \n- '}\n\n` +
                `---\n\n# Antecedentes relevantes\n\n` +
                `- **Objetivo de la supervisión:**\n` +
                `- **Contexto institucional:**\n` +
                `- **Notas adicionales:**\n\n` +
                sessionBlock;

        default:
            return buildIndividualTemplate(name, id, fecha);
    }
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
