'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClusterInfo } from '@/lib/admin/getClusterInfo';
import { updateClusterLabel, acceptSuggestedLabel } from '@/actions/admin/clustering';
import { Lock, EyeOff, Check } from 'lucide-react';

interface ClusterTableProps {
  clusters: ClusterInfo[];
}

export default function ClusterTable({ clusters }: ClusterTableProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const handleEditStart = (cluster: ClusterInfo) => {
    setEditingId(cluster.id);
    setEditingValue(cluster.label || '');
  };

  const handleEditSave = async (clusterId: string) => {
    setSaving(true);
    
    try {
      const result = await updateClusterLabel(clusterId, editingValue);
      
      if (result.success) {
        setEditingId(null);
        // Refresh the page data to show updated label
        router.refresh();
      } else {
        alert(`Error al guardar: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving label:', error);
      alert('Error al guardar el label');
    } finally {
      setSaving(false);
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingValue('');
  };

  const handleAcceptSuggested = async (clusterId: string) => {
    setAcceptingId(clusterId);
    
    try {
      const result = await acceptSuggestedLabel(clusterId);
      
      if (result.success) {
        router.refresh();
      } else {
        alert(`Error al aceptar: ${result.error}`);
      }
    } catch (error) {
      console.error('Error accepting suggested label:', error);
      alert('Error al aceptar el label');
    } finally {
      setAcceptingId(null);
    }
  };

  if (clusters.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <p className="text-gray-500">No hay clusters de colores disponibles</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Color
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                HEX
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Count
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Suggested Label
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Label (Editable)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {clusters.map((cluster) => (
              <tr 
                key={cluster.id} 
                className="hover:bg-gray-50 transition-colors"
              >
                {/* Color Preview */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-10 h-10 rounded border-2 border-gray-300 shadow-sm"
                      style={{ backgroundColor: cluster.representative_hex }}
                      title={cluster.representative_hex}
                    />
                    {cluster.is_locked && (
                      <span title="Locked">
                        <Lock className="w-4 h-4 text-gray-500" />
                      </span>
                    )}
                    {cluster.is_hidden && (
                      <span title="Hidden">
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      </span>
                    )}
                  </div>
                </td>

                {/* HEX Code */}
                <td className="px-4 py-3">
                  <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                    {cluster.representative_hex}
                  </code>
                </td>

                {/* Color Count */}
                <td className="px-4 py-3">
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      {cluster.color_count || 0}
                    </span>
                    {cluster.weighted_count && (
                      <span className="text-xs text-gray-500 ml-1">
                        ({cluster.weighted_count.toFixed(1)})
                      </span>
                    )}
                  </div>
                </td>

                {/* Suggested Label (computed perceptually) */}
                <td className="px-4 py-3">
                  {cluster.suggested_label ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">
                          {cluster.suggested_label}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Perceptual
                        </p>
                      </div>
                      {cluster.suggested_label !== cluster.label && !cluster.is_locked && (
                        <button
                          onClick={() => handleAcceptSuggested(cluster.id)}
                          disabled={acceptingId === cluster.id}
                          className="
                            flex items-center gap-1 px-2 py-1 text-xs
                            bg-blue-100 text-blue-700 rounded
                            hover:bg-blue-200 
                            disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
                            transition-colors
                          "
                          title="Aplicar este label al campo editable"
                        >
                          <Check className="w-3 h-3" />
                          {acceptingId === cluster.id ? '...' : 'Aplicar'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">
                      Sin calcular
                    </span>
                  )}
                </td>

                {/* Editable Label */}
                <td className="px-4 py-3">
                  {editingId === cluster.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        disabled={saving}
                        className="
                          flex-1 px-2 py-1 text-sm border border-gray-300 rounded
                          focus:outline-none focus:ring-2 focus:ring-blue-500
                          disabled:bg-gray-100 disabled:cursor-not-allowed
                        "
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !saving) handleEditSave(cluster.id);
                          if (e.key === 'Escape' && !saving) handleEditCancel();
                        }}
                      />
                      <button
                        onClick={() => handleEditSave(cluster.id)}
                        disabled={saving}
                        className="
                          px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700
                          disabled:bg-gray-400 disabled:cursor-not-allowed
                        "
                      >
                        {saving ? '...' : '✓'}
                      </button>
                      <button
                        onClick={handleEditCancel}
                        disabled={saving}
                        className="
                          px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400
                          disabled:cursor-not-allowed
                        "
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEditStart(cluster)}
                      disabled={cluster.is_locked}
                      className="
                        text-sm text-gray-900 hover:text-blue-600 
                        disabled:text-gray-400 disabled:cursor-not-allowed
                        text-left
                      "
                    >
                      {cluster.label || (
                        <span className="text-gray-400 italic">Sin label</span>
                      )}
                    </button>
                  )}
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    {!cluster.suggested_label && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        Needs Calculation
                      </span>
                    )}
                    {cluster.suggested_label && cluster.label === cluster.suggested_label && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        ✓ Synced
                      </span>
                    )}
                    {cluster.suggested_label && cluster.label && cluster.label !== cluster.suggested_label && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Custom Label
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Footer Stats */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Total clusters: {clusters.length}</span>
          <div className="flex gap-4">
            <span>
              Labeled: {clusters.filter(c => c.suggested_label).length}
            </span>
            <span>
              Custom: {clusters.filter(c => c.label && c.label !== c.suggested_label).length}
            </span>
            <span>
              Locked: {clusters.filter(c => c.is_locked).length}
            </span>
            <span>
              Hidden: {clusters.filter(c => c.is_hidden).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
