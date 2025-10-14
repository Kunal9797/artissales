/**
 * Toast Provider
 * Queue-based toast notification system with portal rendering
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Toast, ToastProps } from '../components/ui/Toast';

export interface ToastItem {
  id: number;
  kind: 'success' | 'error' | 'info' | 'warning';
  text: string;
  duration?: number;
}

interface ToastContextValue {
  show: (toast: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue>({
  show: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

interface ToastProviderProps {
  children: ReactNode;
}

let toastId = 0;

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = ++toastId;
    const newToast: ToastItem = {
      ...toast,
      id,
      duration: toast.duration ?? 3000,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss after duration
    if (newToast.duration) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, newToast.duration);
    }
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value: ToastContextValue = {
    show,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast Portal - renders above all content */}
      {toasts.length > 0 && (
        <View style={styles.portal} pointerEvents="box-none">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              kind={toast.kind}
              text={toast.text}
              onDismiss={() => dismiss(toast.id)}
            />
          ))}
        </View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  portal: {
    position: 'absolute',
    bottom: 80, // Above bottom navigation/tabs
    left: 16,
    right: 16,
    gap: 8,
    alignItems: 'stretch',
  },
});
