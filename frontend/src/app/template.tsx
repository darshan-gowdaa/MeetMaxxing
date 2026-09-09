export default function Template({ children }: { children: React.ReactNode }) {
 return (
 <div className="h-full flex flex-col animate-page-enter">
 {children}
 </div>
 );
}
