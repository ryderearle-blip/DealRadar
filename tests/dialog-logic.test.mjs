import test from 'node:test';
import assert from 'node:assert/strict';
import { dialogWrapTarget, isDialogDismissKey } from '../app/dialog-logic.ts';

test('dialog focus wraps only when Tab reaches an edge', () => {
  assert.equal(dialogWrapTarget(0, 4, true), 3);
  assert.equal(dialogWrapTarget(3, 4, false), 0);
  assert.equal(dialogWrapTarget(1, 4, false), null);
  assert.equal(dialogWrapTarget(2, 4, true), null);
});

test('dialog focus enters safely and handles empty sheets', () => {
  assert.equal(dialogWrapTarget(-1, 3, false), 0);
  assert.equal(dialogWrapTarget(-1, 3, true), 2);
  assert.equal(dialogWrapTarget(-1, 0, false), null);
});

test('only Escape dismisses an open dialog', () => {
  assert.equal(isDialogDismissKey('Escape'), true);
  assert.equal(isDialogDismissKey('Esc'), false);
  assert.equal(isDialogDismissKey('Enter'), false);
});
