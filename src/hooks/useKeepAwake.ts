import { useEffect } from 'react';
import { NativeModules } from 'react-native';

const KeepAwake = NativeModules.KeepAwake as
  | { activate: () => void; deactivate: () => void }
  | undefined;

export function useKeepAwake(enabled = true): void {
  useEffect(() => {
    if (!enabled || !KeepAwake) return;
    KeepAwake.activate();
    return () => KeepAwake.deactivate();
  }, [enabled]);
}
