import { useEffect } from 'react'
import { create } from 'zustand'

/** One-shot events understood by the Sillye dotLottie state machine. */
export type MascotEvent = 'fail' | 'success';

interface MascotState {
    /** A form field has focus; drives the `emailFocused` boolean input (Idle <-> Look). */
    inputFocused: boolean;
    /** Drives the `loading` boolean input (Idle/Look <-> Think). */
    loading: boolean;
    /** Last fired event; `nonce` changes on every fire so repeats are observable. */
    lastEvent: { name: MascotEvent; nonce: number } | null;
    setInputFocused: (focused: boolean) => void;
    setLoading: (loading: boolean) => void;
    fire: (name: MascotEvent) => void;
}

export const useMascotStore = create<MascotState>((set, get) => ({
    inputFocused: false,
    loading: false,
    lastEvent: null,
    setInputFocused: (inputFocused) => set({ inputFocused }),
    setLoading: (loading) => set({ loading }),
    fire: (name) => set({ lastEvent: { name, nonce: (get().lastEvent?.nonce ?? 0) + 1 } }),
}));

/**
 * Keeps Sillye "thinking" while an auth form request is in flight and returns `fire`
 * for one-shot reactions. Fire `fail`/`success` before `isLoading` flips back.
 */
export function useMascotFeedback(isLoading: boolean) {
    const fire = useMascotStore((state) => state.fire);
    const setLoading = useMascotStore((state) => state.setLoading);

    useEffect(() => {
        setLoading(isLoading);
    }, [isLoading, setLoading]);

    useEffect(() => () => setLoading(false), [setLoading]);

    return fire;
}
