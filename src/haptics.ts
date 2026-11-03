// Retour haptique. Safari iOS n'a pas navigator.vibrate, mais basculer un
// <input type="checkbox" switch> déclenche le petit « tic » du système (iOS 18+).
let label: HTMLLabelElement | null = null;

export function haptic() {
  try {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(8);
      return;
    }
    if (!label) {
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      input.id = 'haptic-switch';
      input.style.display = 'none';
      label = document.createElement('label');
      label.htmlFor = input.id;
      label.style.display = 'none';
      document.body.append(input, label);
    }
    label.click();
  } catch {
    // pas de retour haptique disponible
  }
}
