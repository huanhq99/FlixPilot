import { useRef, useCallback, TouchEvent } from 'react';

interface SwipeHandlers {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
}

interface SwipeConfig {
    threshold?: number;  // 触发滑动的最小距离
    preventScrollOnHorizontal?: boolean;  // 水平滑动时阻止垂直滚动
}

export function useSwipe(handlers: SwipeHandlers, config: SwipeConfig = {}) {
    const { threshold = 50, preventScrollOnHorizontal = false } = config;
    
    const touchStart = useRef<{ x: number; y: number } | null>(null);
    const touchEnd = useRef<{ x: number; y: number } | null>(null);

    const onTouchStart = useCallback((e: TouchEvent) => {
        touchEnd.current = null;
        touchStart.current = {
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY
        };
    }, []);

    const onTouchMove = useCallback((e: TouchEvent) => {
        touchEnd.current = {
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY
        };
        
        // 如果是水平滑动且配置了阻止滚动
        if (preventScrollOnHorizontal && touchStart.current && touchEnd.current) {
            const deltaX = Math.abs(touchEnd.current.x - touchStart.current.x);
            const deltaY = Math.abs(touchEnd.current.y - touchStart.current.y);
            if (deltaX > deltaY && deltaX > 10) {
                e.preventDefault();
            }
        }
    }, [preventScrollOnHorizontal]);

    const onTouchEnd = useCallback(() => {
        if (!touchStart.current || !touchEnd.current) return;

        const deltaX = touchEnd.current.x - touchStart.current.x;
        const deltaY = touchEnd.current.y - touchStart.current.y;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        // 判断是水平还是垂直滑动
        if (absX > absY) {
            // 水平滑动
            if (absX > threshold) {
                if (deltaX > 0) {
                    handlers.onSwipeRight?.();
                } else {
                    handlers.onSwipeLeft?.();
                }
            }
        } else {
            // 垂直滑动
            if (absY > threshold) {
                if (deltaY > 0) {
                    handlers.onSwipeDown?.();
                } else {
                    handlers.onSwipeUp?.();
                }
            }
        }

        touchStart.current = null;
        touchEnd.current = null;
    }, [handlers, threshold]);

    return {
        onTouchStart,
        onTouchMove,
        onTouchEnd
    };
}

export default useSwipe;
