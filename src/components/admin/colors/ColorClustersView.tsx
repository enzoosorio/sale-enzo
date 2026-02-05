"use client";

import { useEffect, useState } from "react";

interface ColorCluster {
  id: string;
  centroid_l: number;
  centroid_a: number;
  centroid_b: number;
  representative_hex: string;
  color_count: number;
  is_locked: boolean;
  is_hidden: boolean;
  label: string | null;
  created_at: string;
  updated_at: string;
}

interface ColorClusterCardProps {
  cluster: ColorCluster;
}

function ColorClusterCard({ cluster }: ColorClusterCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* Color Preview */}
      <div
        className="w-full h-32 rounded-lg mb-3 border-2 border-gray-300"
        style={{ backgroundColor: cluster.representative_hex }}
      />

      {/* Cluster Info */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm font-semibold">
            {cluster.representative_hex}
          </span>
          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
            {cluster.color_count} colors
          </span>
        </div>

        {cluster.label && (
          <div className="text-sm font-medium text-gray-700">
            {cluster.label}
          </div>
        )}

        {/* LAB Values */}
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex gap-3">
            <span>L: {cluster.centroid_l.toFixed(1)}</span>
            <span>A: {cluster.centroid_a.toFixed(1)}</span>
            <span>B: {cluster.centroid_b.toFixed(1)}</span>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex gap-2">
          {cluster.is_locked && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
              🔒 Locked
            </span>
          )}
          {cluster.is_hidden && (
            <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
              👁️ Hidden
            </span>
          )}
        </div>

        {/* ID (truncated) */}
        <div className="text-xs text-gray-400 font-mono truncate">
          {cluster.id}
        </div>
      </div>
    </div>
  );
}

interface ColorClustersViewProps {
  clusters: ColorCluster[];
}

export function ColorClustersView({ clusters }: ColorClustersViewProps) {
  const [sortBy, setSortBy] = useState<"count" | "recent" | "lightness">("count");
  const [showHidden, setShowHidden] = useState(false);

  const filteredClusters = clusters.filter(
    (c) => showHidden || !c.is_hidden
  );

  const sortedClusters = [...filteredClusters].sort((a, b) => {
    switch (sortBy) {
      case "count":
        return b.color_count - a.color_count;
      case "recent":
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      case "lightness":
        return b.centroid_l - a.centroid_l;
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Color Clusters</h2>
          <p className="text-sm text-gray-600 mt-1">
            {filteredClusters.length} total clusters • {clusters.reduce((sum, c) => sum + c.color_count, 0)} total colors
          </p>
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="count">Sort by Count</option>
            <option value="recent">Sort by Recent</option>
            <option value="lightness">Sort by Lightness</option>
          </select>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
              className="rounded"
            />
            Show Hidden
          </label>
        </div>
      </div>

      {/* Cluster Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {sortedClusters.map((cluster) => (
          <ColorClusterCard key={cluster.id} cluster={cluster} />
        ))}
      </div>

      {filteredClusters.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No clusters found.
        </div>
      )}
    </div>
  );
}
