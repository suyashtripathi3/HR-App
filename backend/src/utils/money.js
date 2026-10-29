// Money is always integer minor units (paise for INR) in the API/DB.
// ₹250.00 === 25000 paise. Formatting to ₹ happens only in the UI.
// These pure functions are the core of the Phase 3 balance rules and
// are unit-tested before any UI is built on top of them.

function toMinorUnits(rupees) {
  // Accept a string/number like "250.50" and return paise, avoiding float drift.
  const [whole = '0', frac = ''] = String(rupees).trim().split('.');
  const sign = whole.startsWith('-') ? -1 : 1;
  const w = BigInt(whole.replace('-', '') || '0');
  const f = (frac + '00').slice(0, 2).padEnd(2, '0');
  return sign * Number(w * 100n + BigInt(f));
}

function formatMinorUnits(amountMinor, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amountMinor / 100);
}

// balance = opening + income - expenses + transfersIn - transfersOut
// Transfers move money between accounts; they are NOT income/expenses.
function accountBalance({ openingBalanceMinor = 0, incomeMinor = 0, expenseMinor = 0, transfersInMinor = 0, transfersOutMinor = 0 }) {
  return openingBalanceMinor + incomeMinor - expenseMinor + transfersInMinor - transfersOutMinor;
}

// Equal split: shares must sum exactly to the total.
// Remainder paise go deterministically to the earliest participants.
// e.g. ₹100.00 (10000 paise) / 3 => [3334, 3333, 3333]
function equalSplit(amountMinor, participantCount) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) throw new Error('amountMinor must be a positive safe integer');
  if (!Number.isSafeInteger(participantCount) || participantCount <= 0) throw new Error('participantCount must be positive');
  const base = Math.floor(amountMinor / participantCount);
  const remainder = amountMinor % participantCount;
  return Array.from({ length: participantCount }, (_, i) => base + (i < remainder ? 1 : 0));
}

// Group net per member, corrected for financial correctness:
// Net = Paid - Share - SettlementsReceived + SettlementsPaid
// Receiving a settlement reduces what others owe you; paying one reduces
// what you owe. Positive => should receive money, negative => owes money.
// (The shared plan stated the settlement signs the other way round;
// that version does not settle to zero, so it is corrected here.)
function groupNet({ paidMinor = 0, shareMinor = 0, settlementsReceivedMinor = 0, settlementsPaidMinor = 0 }) {
  return paidMinor - shareMinor - settlementsReceivedMinor + settlementsPaidMinor;
}

module.exports = { toMinorUnits, formatMinorUnits, accountBalance, equalSplit, groupNet };
