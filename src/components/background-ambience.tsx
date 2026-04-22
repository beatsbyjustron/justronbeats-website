export function BackgroundAmbience() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-24 top-20 h-96 w-96 rounded-full bg-[#34d399] opacity-20 blur-3xl mix-blend-multiply animate-blob" />
      <div className="absolute right-[-5rem] top-1/3 h-[28rem] w-[28rem] rounded-full bg-[#34d399] opacity-20 blur-3xl mix-blend-multiply animate-blob [animation-delay:-4s]" />
      <div className="absolute bottom-[-7rem] left-1/3 h-[30rem] w-[30rem] rounded-full bg-[#34d399] opacity-20 blur-3xl mix-blend-multiply animate-blob [animation-delay:-8s]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_38%,rgba(9,9,11,0.45)_100%)]" />
    </div>
  );
}
