import { PortalPaciente } from '@/components/consultorio/clinico/PortalPaciente';

export default async function Pagina({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PortalPaciente slug={slug} />;
}
