'use client';

import { useState, useCallback, useEffect } from 'react';

interface UseResizableProps {
    initialWidth: number;
    minWidth: number;
    maxWidth: number;
    storageKey: string;
}

export function useResizable({
    initialWidth,
    minWidth,
    maxWidth,
    storageKey,
}: UseResizableProps) {
    const [width, setWidth] = useState<number>(initialWidth);
    const [isResizing, setIsResizing] = useState(false);
    const [startPos, setStartPos] = useState<number>(0);
    const [startWidth, setStartWidth] = useState<number>(initialWidth);

    // Load from localStorage on mount
    useEffect(() => {
        const savedWidth = localStorage.getItem(storageKey);
        if (savedWidth) {
            const parsedWidth = parseInt(savedWidth, 10);
            if (!isNaN(parsedWidth)) {
                setWidth(Math.min(Math.max(parsedWidth, minWidth), maxWidth));
            }
        }
    }, [storageKey, minWidth, maxWidth]);

    const startResizing = useCallback((e: React.MouseEvent) => {
        setIsResizing(true);
        setStartPos(e.clientX);
        setStartWidth(width);
    }, [width]);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    // Save to localStorage when resizing stops
    useEffect(() => {
        if (!isResizing && width !== initialWidth) {
            localStorage.setItem(storageKey, width.toString());
        }
    }, [isResizing, width, storageKey, initialWidth]);

    const resize = useCallback(
        (e: MouseEvent) => {
            if (isResizing) {
                const delta = e.clientX - startPos;
                const newWidth = startWidth + delta;
                if (newWidth >= minWidth && newWidth <= maxWidth) {
                    setWidth(newWidth);
                }
            }
        },
        [isResizing, startPos, startWidth, minWidth, maxWidth]
    );

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResizing);
        } else {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        }

        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizing, resize, stopResizing]);

    return { width, isResizing, startResizing };
}
