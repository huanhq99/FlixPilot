import { storage } from './storage';

export interface LogEntry {
    id: string;
    timestamp: number;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
}

const LOG_STORAGE_KEY = 'streamhub_logs';
const MAX_LOGS = 100;

export const logger = {
    getLogs: (): LogEntry[] => {
        return storage.get<LogEntry[]>(LOG_STORAGE_KEY, []);
    },

    add: (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
        const logs = logger.getLogs();
        const newLog: LogEntry = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            message,
            type
        };
        
        const updatedLogs = [newLog, ...logs].slice(0, MAX_LOGS);
        storage.set(LOG_STORAGE_KEY, updatedLogs);
        return newLog;
    },

    clear: () => {
        storage.set(LOG_STORAGE_KEY, []);
    }
};
