import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

export interface GenerateProgressState {
    historyId: string | null;
    progress: number;
    aiQuestions: any[];
    lastGenerateType: 'all' | 'selected' | null;
    lastQuestionCount: number | null;
    selectedDocIds: string[];
    knowledgeBaseId?: string | null;
    error: boolean;
}

interface GenerateProgressContextType {
    progressState: GenerateProgressState | null;
    setProgressState: (state: GenerateProgressState | null) => void;
    startProgress: (historyId: string, lastGenerateType: 'all' | 'selected', lastQuestionCount: number, selectedDocIds?: string[], knowledgeBaseId?: string | null) => void;
    updateProgress: (progress: number, aiQuestions?: any[]) => void;
    setError: (error: boolean) => void;
    clearProgress: () => void;
}

const GenerateProgressContext = createContext<GenerateProgressContextType | undefined>(undefined);

export const GenerateProgressProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [progressState, setProgressState] = useState<GenerateProgressState | null>(null);
    const STORAGE_KEY = 'aiGenerateProgressState';

    // 初始化时从 localStorage 恢复进度状态
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed: GenerateProgressState = JSON.parse(saved);
                // 基本字段校验
                if (parsed && typeof parsed === 'object' && ('historyId' in parsed)) {
                    setProgressState(parsed);
                }
            }
        } catch (e) {
            // ignore corrupted storage
            localStorage.removeItem(STORAGE_KEY);
        }
    }, []);

    // 状态变化时持久化到 localStorage（null 则删除）
    useEffect(() => {
        if (progressState) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(progressState));
            } catch {
                // ignore quota exceeded
            }
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, [progressState]);

    const startProgress = useCallback((
        historyId: string,
        lastGenerateType: 'all' | 'selected',
        lastQuestionCount: number,
        selectedDocIds: string[] = [],
        knowledgeBaseId: string | null = null
    ) => {
        setProgressState({
            historyId,
            progress: 0,
            aiQuestions: [],
            lastGenerateType,
            lastQuestionCount,
            selectedDocIds,
            knowledgeBaseId,
            error: false,
        });
    }, []);

    const updateProgress = useCallback((progress: number, aiQuestions?: any[]) => {
        setProgressState((prev) => {
            if (!prev) return null;
            return {
                ...prev,
                progress,
                aiQuestions: aiQuestions || prev.aiQuestions,
                error: false,
            };
        });
    }, []);

    const setError = useCallback((error: boolean) => {
        setProgressState((prev) => {
            if (!prev) return null;
            return {
                ...prev,
                error,
                progress: error ? -1 : prev.progress,
            };
        });
    }, []);

    const clearProgress = useCallback(() => {
        setProgressState(null);
    }, []);

    return (
        <GenerateProgressContext.Provider
            value={{
                progressState,
                setProgressState,
                startProgress,
                updateProgress,
                setError,
                clearProgress,
            }}
        >
            {children}
        </GenerateProgressContext.Provider>
    );
};

export const useGenerateProgressContext = () => {
    const context = useContext(GenerateProgressContext);
    if (context === undefined) {
        throw new Error('useGenerateProgressContext must be used within a GenerateProgressProvider');
    }
    return context;
};

