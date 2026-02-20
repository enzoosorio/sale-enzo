
import ClusterRecalculateControls from './ClusterRecalculateControls';
import ClusterTable from './ClusterTable';
import { ClusterInfo } from '@/lib/admin/getClusterInfo';

interface ClusteringMainProps {
  clusters: ClusterInfo[];
}

export default function ClusteringMain({ clusters }: ClusteringMainProps) {
  return (
    <section className="space-y-6">
      {/* Recalculation Controls */}
      <ClusterRecalculateControls />

      {/* Clusters Table */}
      <ClusterTable clusters={clusters} />
    </section>
  );
}
