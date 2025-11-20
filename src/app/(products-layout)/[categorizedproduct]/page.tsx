

export default async function CategorizedProductPage({
  params,
}: {
  params: Promise<{ categorizedproduct: string }>
}) {
  const { categorizedproduct } = await params
  return <div>My Post: {categorizedproduct}</div>
}