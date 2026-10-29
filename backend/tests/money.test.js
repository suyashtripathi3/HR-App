const test = require('node:test');
const assert = require('node:assert');
const { toMinorUnits, accountBalance, equalSplit, groupNet } = require('../src/utils/money');

test('₹250.00 is 25000 paise, not 2500000', () => {
  assert.strictEqual(toMinorUnits('250.00'), 25000);
  assert.strictEqual(toMinorUnits(250.5), 25050);
});

test('balance formula: transfer out is not an expense', () => {
  // opening 10000 + income 5000 - expenses 2000 - transfer out 1000 = 12000
  assert.strictEqual(
    accountBalance({ openingBalanceMinor: 1000000, incomeMinor: 500000, expenseMinor: 200000, transfersOutMinor: 100000 }),
    1200000
  );
});

test('equal split sums exactly to the total, remainder to earliest', () => {
  assert.deepStrictEqual(equalSplit(10000, 3), [3334, 3333, 3333]);
  assert.strictEqual(equalSplit(10000, 3).reduce((a, b) => a + b, 0), 10000);
});

test('group net: ₹900 dinner, payer paid all, equal 3-way', () => {
  // payer: 90000 - 30000 = +60000 (owed 600); others: 0 - 30000 = -30000
  assert.strictEqual(groupNet({ paidMinor: 90000, shareMinor: 30000 }), 60000);
  assert.strictEqual(groupNet({ paidMinor: 0, shareMinor: 30000 }), -30000);
});
