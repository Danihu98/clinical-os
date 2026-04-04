export interface ClinicalOSSettings {
    rootFolder: string;
    defaultModel: string;
    defaultFee: number;
}

export const DEFAULT_SETTINGS: ClinicalOSSettings = {
    rootFolder: 'Espacio Clínico',
    defaultModel: '',
    defaultFee: 0,
};

export interface Session {
    id: string;
    patientName: string;
    date: string;       // YYYY-MM-DD
    fee: number;
    boletaPending: boolean;
}

export interface ClinicalOSData {
    nextPatientId: number;
    settings: ClinicalOSSettings;
    sessions: Session[];
}

export const DEFAULT_DATA: ClinicalOSData = {
    nextPatientId: 1,
    settings: { ...DEFAULT_SETTINGS },
    sessions: [],
};
