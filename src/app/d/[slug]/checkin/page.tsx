import { CheckIn } from '@/components/consultorio/clinico/CheckIn';

export default async function Pagina({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CheckIn slug={slug} />;
}
