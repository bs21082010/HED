export function generateStaticParams() {
  return Array.from({ length: 8 }, (_, i) => ({ id: String(i + 1) }));
}

export default function DormLayout({ children }: { children: React.ReactNode }) {
  return children;
}
