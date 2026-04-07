import { App, TFile, moment } from 'obsidian';
import { PATIENTS_SUBFOLDER } from '../constants';

/**
 * Detects the highest session number in a patient ficha by scanning for "# Sesión N" headers.
 */
function detectLastSessionNumber(content: string): number {
    const matches = content.matchAll(/^# Sesión (\d+)/gm);
    let max = 0;
    for (const match of matches) {
        const num = parseInt(match[1], 10);
        if (num > max) max = num;
    }
    return max;
}

function buildSessionTemplate(sessionNumber: number): string {
    const fecha = moment().format('DD/MM/YYYY');
    return (
        `\n\n# Sesión ${sessionNumber}\n` +
        `**Fecha:** ${fecha}\n\n` +
        `## Síntesis de la sesión anterior\n\n\n` +
        `## Temas importantes de tratar hoy\n\n\n` +
        `## Agenda de sesión\n\n\n` +
        `## Notas de sesión\n\n\n` +
        `## Tareas para el paciente\n\n`
    );
}

/**
 * Checks if the active file is a patient ficha inside the clinical root folder.
 */
function getPatientFicha(app: App, rootFolder: string): TFile | null {
    const file = app.workspace.getActiveFile();
    if (!file) return null;
    if (file.extension !== 'md') return null;
    if (!file.path.includes(`${rootFolder}/${PATIENTS_SUBFOLDER}/`)) return null;
    if (!file.name.includes('_Ficha_')) return null;
    return file;
}

/**
 * Appends a new session planning template to the active patient ficha.
 * Returns the new session number, or null if the active file is not a valid ficha.
 */
export async function appendSessionTemplate(app: App, rootFolder: string): Promise<number | null> {
    const file = getPatientFicha(app, rootFolder);
    if (!file) return null;

    const content = await app.vault.read(file);
    const lastNum = detectLastSessionNumber(content);
    const nextNum = lastNum + 1;
    const template = buildSessionTemplate(nextNum);

    await app.vault.modify(file, content + template);
    return nextNum;
}
