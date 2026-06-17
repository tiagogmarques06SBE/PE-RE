import { useState, useEffect } from "react";

export default function NI({ id, label, value, onChange, pfx, sfx, step = "0.01", min, max }) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    if (parseFloat(text) !== value) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value;
    setText(raw);
    if (raw === "" || raw === "-" || raw === ".") return;
    const n = parseFloat(raw);
    if (isNaN(n)) return;
    if (min != null && n < +min) return;
    if (max != null && n > +max) return;
    onChange(n);
  };

  const handleBlur = () => {
    const n = parseFloat(text);
    if (text === "" || isNaN(n)) { setText(String(value)); return; }
    let clamped = n;
    if (min != null && clamped < +min) clamped = +min;
    if (max != null && clamped > +max) clamped = +max;
    if (clamped !== n) onChange(clamped);
    setText(String(clamped));
  };

  return (
    <div className="ni-wrap">
      <label className="ni-label" htmlFor={id}>{label}</label>
      <div className="ni-row">
        {pfx && <span className="ni-affix">{pfx}</span>}
        <input
          id={id} type="number" className="ni-input"
          value={text} step={step} min={min} max={max}
          onChange={handleChange} onBlur={handleBlur}
        />
        {sfx && <span className="ni-affix">{sfx}</span>}
      </div>
    </div>
  );
}
