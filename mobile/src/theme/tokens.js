// Design tokens for HisabRakho — single source of truth for colours,
// type sizes and spacing. Components use these, never hardcoded colours.
export const colors = {
  light: {
    navy: '#102A43',
    primary: '#3B82F6',
    mint: '#7EF0CB',
    background: '#F5F8FC',
    card: '#FFFFFF',
    text: '#172B4D',
    secondaryText: '#64748B',
    expense: '#DC5555',
    income: '#158567',
  },
  dark: {
    navy: '#102A43',
    primary: '#3B82F6',
    mint: '#7EF0CB',
    background: '#102A43',
    card: '#1B3A56',
    text: '#F5F8FC',
    secondaryText: '#94A3B8',
    expense: '#DC5555',
    income: '#7EF0CB',
  },
};

export const typography = {
  balance: { fontSize: 34, fontWeight: '700' },
  screenTitle: { fontSize: 26, fontWeight: '600' },
  sectionHeading: { fontSize: 19, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  label: { fontSize: 13, fontWeight: '500' },
  metadata: { fontSize: 12, fontWeight: '400' },
};

export const spacing = { xs: 8, sm: 16, md: 24, lg: 32 };
