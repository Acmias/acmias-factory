import { ValidarDocumento } from '@/components/consultorio/clinico/ValidarDocumento';

export default async function Pagina({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ValidarDocumento slug={slug} />;
}
