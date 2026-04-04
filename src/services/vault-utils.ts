import { Vault } from 'obsidian';

export async function ensureFolder(vault: Vault, folderPath: string): Promise<void> {
    const parts = folderPath.split('/');
    let currentPath = '';
    for (const part of parts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        if (!vault.getAbstractFileByPath(currentPath)) {
            await vault.createFolder(currentPath);
        }
    }
}

export async function ensureParentFolder(vault: Vault, filePath: string): Promise<void> {
    const parentPath = filePath.split('/').slice(0, -1).join('/');
    if (parentPath) {
        await ensureFolder(vault, parentPath);
    }
}
