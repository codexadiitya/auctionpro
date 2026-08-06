import { useState, useEffect } from 'react';

const listeners = new Set();
let memoryState = { toasts: [] };

function dispatch(action) {
  if (action.type === 'ADD_TOAST') {
    const id = Math.random().toString(36).substr(2, 9);
    const toast = { ...action.toast, id, open: true };
    memoryState = {
      ...memoryState,
      toasts: [...memoryState.toasts, toast].slice(-5), // keep last 5
    };
  } else if (action.type === 'DISMISS_TOAST') {
    memoryState = {
      ...memoryState,
      toasts: memoryState.toasts.filter((t) => t.id !== action.toastId),
    };
  }

  listeners.forEach((listener) => listener(memoryState));
}

export function toast({ title, description, variant = 'default' }) {
  dispatch({
    type: 'ADD_TOAST',
    toast: { title, description, variant },
  });
}

export function useToast() {
  const [state, setState] = useState(memoryState);

  useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId) => dispatch({ type: 'DISMISS_TOAST', toastId }),
  };
}
