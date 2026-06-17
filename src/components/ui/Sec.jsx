export default function Sec({ title, children }) {
  return (
    <div className="sec">
      <div className="sec-title">{title}</div>
      {children}
    </div>
  );
}
