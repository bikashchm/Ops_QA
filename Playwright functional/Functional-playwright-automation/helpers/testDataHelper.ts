/** Generates unique pad/well names for data-driven pad creation flows. */
export function generatePadWellNames(): {
  padName: string;
  wellName: string;
  wellApi14Digits: string;
} {
  const random4Digit = Math.floor(1000 + Math.random() * 9000).toString();
  const wellApi14Digits = Array.from({ length: 14 }, () => Math.floor(Math.random() * 10)).join('');

  return {
    padName: `Liveplus playwright automation pad${random4Digit}`,
    wellName: `liveplus playwright automation well${random4Digit}`,
    wellApi14Digits,
  };
}
