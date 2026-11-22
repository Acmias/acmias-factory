import { RecipeImpreso } from '@/components/consultorio/clinico/RecipeImpreso';

export default async function Pagina({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  return <RecipeImpreso slug={slug} id={id} />;
}
