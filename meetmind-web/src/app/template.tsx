export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-fade-scale h-full flex flex-col">
      {children}
    </div>
  );
}
