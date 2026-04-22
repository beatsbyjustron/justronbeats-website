export function BackgroundAmbience() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-24 top-20 h-96 w-96 rounded-full bg-[#39FF14] opacity-20 blur-3xl animate-blob" />
      <div className="delay-2000 absolute right-[-5rem] top-1/3 h-[28rem] w-[28rem] rounded-full bg-[#39FF14] opacity-20 blur-3xl animate-blob" />
      <div className="delay-4000 absolute bottom-[-7rem] left-1/3 h-[30rem] w-[30rem] rounded-full bg-[#39FF14] opacity-20 blur-3xl animate-blob" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_38%,rgba(9,9,11,0.45)_100%)]" />
    </div>
  );
}
