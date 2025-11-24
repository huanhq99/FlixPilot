import { useState, useCallback } from 'react';
import { AuthState } from '../types';

const STORAGE_KEY = 'streamhub_auth';

const DEFAULT_AUTH: AuthState = {
    isAuthenticated: false,
    user: null,
    serverUrl: '',
    accessToken: '',
    isAdmin: false,
    isGuest: false
};

export function useAuth() {
    const [authState, setAuthState] = useState<AuthState>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : DEFAULT_AUTH;
        } catch (e) {
            console.error('Failed to parse auth state', e);
            return DEFAULT_AUTH;
        }
    });

    const login = useCallback((auth: AuthState) => {
        setAuthState(auth);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    }, []);

    const logout = useCallback(() => {
        setAuthState(DEFAULT_AUTH);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    return { authState, login, logout, setAuthState };
}

