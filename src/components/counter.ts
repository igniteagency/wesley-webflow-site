import { CountUp } from 'countup.js';

const calculateDuration = (value: number): number => {
  const absValue = Math.abs(value);
  const baseDuration = Math.log10(absValue + 1) * 0.8 + 1;
  return Math.min(baseDuration, 5);
};

const initCounters = (): void => {
  const counterElements = document.querySelectorAll('[data-el="counter"]');

  counterElements.forEach((element) => {
    const textContent = element.textContent?.trim() || '0';
    const endValue = parseFloat(textContent.replace(/[^\d.-]/g, '')) || 0;
    const duration = calculateDuration(Math.abs(endValue));

    const decimalPlaces = textContent.includes('.')
      ? textContent.split('.')[1].replace(/[^\d]/g, '').length
      : 0;

    const countUp = new CountUp(element, endValue, {
      startVal: 0,
      duration,
      decimalPlaces,
      enableScrollSpy: true,
    });

    if (!countUp.error) {
      countUp.start();
    } else {
      console.error('CountUp error:', countUp.error);
    }
  });
};

initCounters();
