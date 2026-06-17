import { F } from "../../lib/formatters";

export default function TornadoChart({ data }) {
  if (!data.valid) return null;
  const half = 48;

  return (
    <div className="tornado">
      <div className="tornado-axis">
        <span className="tornado-axis-end">Lower IRR</span>
        <span className="tornado-axis-mid">Base {F.pct(data.base)}</span>
        <span className="tornado-axis-end">Higher IRR</span>
      </div>
      {data.items.map((it) => {
        const downW = (Math.abs(it.downside) / data.maxMag) * half;
        const upW   = (Math.abs(it.upside)   / data.maxMag) * half;
        return (
          <div key={it.key} className="tornado-row">
            <div className="tornado-name">{it.label}</div>
            <div className="tornado-track">
              <div className="tornado-center" />
              <div className="tornado-bar down" style={{ width: `${downW}%`, left: `calc(50% - ${downW}%)` }} title={`${F.pct(it.low)} (${it.loLbl})`} />
              <div className="tornado-bar up"   style={{ width: `${upW}%`,   left: "50%" }}                  title={`${F.pct(it.high)} (${it.hiLbl})`} />
            </div>
            <div className="tornado-range">{F.pct(it.low)} → {F.pct(it.high)}</div>
          </div>
        );
      })}
    </div>
  );
}
