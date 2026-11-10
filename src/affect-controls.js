import { AFFECT_PLACEMENT_FIELDS, DEFAULT_AFFECT_PLACEMENT, parseAffectPlacement } from './affect-placement.js';

export function mountAffectControls(panel, setPlacement) {
  const toggle = panel.querySelector('#show-affect');
  const picker = panel.querySelector('#affect-file');
  const status = panel.querySelector('#affect-import-status');
  let placement = DEFAULT_AFFECT_PLACEMENT;
  let importRevision = 0;
  const apply = () => setPlacement(placement, toggle.checked);
  const fields = AFFECT_PLACEMENT_FIELDS.map(field => {
    const input = panel.querySelector(`[name="${field.name}"]`);
    input.min = field.min;
    input.max = field.max;
    input.value = placement[field.name];
    input.addEventListener('input', () => {
      ++importRevision;
      status.textContent = '';
      input.setAttribute('aria-invalid', String(!input.validity.valid));
      if (!input.validity.valid) return;
      placement = { ...placement, [field.name]: input.valueAsNumber };
      apply();
    });
    return input;
  });
  toggle.addEventListener('change', apply);
  panel.querySelector('#affect-import').addEventListener('click', () => picker.click());
  picker.addEventListener('change', async () => {
    const file = picker.files[0];
    if (!file) return;
    const revision = ++importRevision;
    picker.value = '';
    status.textContent = '';
    try {
      if (file.size > 4096) throw new Error('Placement JSON must be at most 4 KB.');
      const imported = parseAffectPlacement(await file.text());
      if (revision !== importRevision) return;
      placement = imported;
      for (const input of fields) {
        input.value = placement[input.name];
        input.removeAttribute('aria-invalid');
      }
      apply();
      status.textContent = 'Placement loaded.';
    } catch (error) {
      if (revision === importRevision) status.textContent = error.message;
    }
  });
  panel.hidden = false;
}
