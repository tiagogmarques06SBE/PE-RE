export default function ErrorBanner({ errors }) {
  if (!errors?.length) return null;
  return (
    <div className="error-banner" role="alert">
      <strong>Cannot compute returns</strong>
      {errors.map((e, i) => <div key={i}>{e}</div>)}
    </div>
  );
}
