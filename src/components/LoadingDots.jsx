export default function LoadingDots() {
  return (
    <div style={{
      display: 'flex', gap: '4px', padding: '12px 58px', alignItems: 'center',
    }}>
      <div style={{
        width: '7px', height: '7px', borderRadius: '50%',
        background: 'var(--text-muted)', animation: 'bounceDot 1.4s infinite ease-in-out both',
        animationDelay: '-0.32s',
      }} />
      <div style={{
        width: '7px', height: '7px', borderRadius: '50%',
        background: 'var(--text-muted)', animation: 'bounceDot 1.4s infinite ease-in-out both',
        animationDelay: '-0.16s',
      }} />
      <div style={{
        width: '7px', height: '7px', borderRadius: '50%',
        background: 'var(--text-muted)', animation: 'bounceDot 1.4s infinite ease-in-out both',
      }} />
    </div>
  );
}
