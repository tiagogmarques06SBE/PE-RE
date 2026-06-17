export default function MCard({ label, val, sub, hi, subClass }) {
  return (
    <div className={`mcard${hi ? " hi" : ""}`}>
      <div className="mcard-label">{label}</div>
      <div className="mcard-val">{val}</div>
      {sub && <div className={`mcard-sub${subClass ? ` ${subClass}` : ""}`}>{sub}</div>}
    </div>
  );
}
