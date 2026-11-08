import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateCompositeProgress,
  calculateProgressPercentage,
  diagnoseWeakAreas,
  formatIndianCurrencyLakhs,
} from './progress.ts';

test('calculateProgressPercentage computes correctly', () => {
  assert.equal(calculateProgressPercentage(24, 30), 80);
  assert.equal(calculateProgressPercentage(18, 20), 90);
  assert.equal(calculateProgressPercentage(0, 10), 0);
  assert.equal(calculateProgressPercentage(5, 0), 0);
});

test('calculateCompositeProgress weights topics and quizzes accurately', () => {
  // 24/30 = 80% (weights 48%), 18/20 = 90% (weights 36%) => 48 + 36 = 84%
  const composite = calculateCompositeProgress(24, 30, 18, 20);
  assert.equal(composite, 84);
});

test('diagnoseWeakAreas flags topics below 75% accuracy', () => {
  const results = [
    { topic: 'Recursion', score: 3, total: 10 }, // 30% -> weak
    { topic: 'Python Basics', score: 9, total: 10 }, // 90% -> strong
    { topic: 'Trigonometry', score: 6, total: 10 }, // 60% -> weak
  ];
  const weak = diagnoseWeakAreas(results);
  assert.deepEqual(weak, ['Recursion', 'Trigonometry']);
});

test('formatIndianCurrencyLakhs formats properly', () => {
  assert.equal(formatIndianCurrencyLakhs(12), '₹12L+');
  assert.equal(formatIndianCurrencyLakhs(15), '₹15L+');
});
