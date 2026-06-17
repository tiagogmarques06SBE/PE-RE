export default function InvalidPanel({ message }) {
  return (
    <div className="main-panel">
      <div className="card" style={{ color: "#64748b", fontSize: 13 }}>
        {message || "Adjust inputs in the sidebar to see outputs."}
      </div>
    </div>
  );
}
