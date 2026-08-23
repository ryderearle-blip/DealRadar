export function dialogWrapTarget(currentIndex: number, focusableCount: number, shiftKey: boolean) {
  if (focusableCount <= 0) return null;
  if (currentIndex < 0) return shiftKey ? focusableCount - 1 : 0;
  if (shiftKey && currentIndex === 0) return focusableCount - 1;
  if (!shiftKey && currentIndex === focusableCount - 1) return 0;
  return null;
}

export function isDialogDismissKey(key: string) {
  return key === 'Escape';
}
