import ClusteringMain from "@/components/admin/clusteringPage/ClusteringMain";
import { getClustersInfo } from "@/lib/admin/getClusterInfo";

export default async function ClusteringPage() {

    const clusters = await getClustersInfo();

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-prata font-bold text-gray-900 mb-2">
            Clustering de colores
          </h1>
          <p className="text-gray-600">
            Gestione el clustering de colores para optimizar la organización de productos por tonalidades similares
          </p>
        </div>

        {/* Content */}
        <ClusteringMain clusters={clusters} />
      </div>
    </main>
  );
}
