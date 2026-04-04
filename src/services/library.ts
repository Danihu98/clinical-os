import { Vault } from 'obsidian';
import { LIBRARY_CONTENT } from '../generated/library-content';
import { ensureParentFolder } from './vault-utils';

export async function seedLibrary(vault: Vault, rootFolder: string): Promise<void> {
    if (!vault.getAbstractFileByPath(rootFolder)) {
        await vault.createFolder(rootFolder);
    }

    for (const [relativePath, content] of Object.entries(LIBRARY_CONTENT)) {
        const fullPath = `${rootFolder}/${relativePath}`;
        if (!vault.getAbstractFileByPath(fullPath)) {
            await ensureParentFolder(vault, fullPath);
            await vault.create(fullPath, content);
        }
    }
}
