'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Sparkles } from 'lucide-react';
import { scrapeClusterLabels, type ScrapingResult } from '@/actions/admin/clustering-scraping';

export default function ClusterScrapeControls() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScrapingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScrape = async (mode: 'only-new' | 'all') => {
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const scrapingResult = await scrapeClusterLabels(mode);
      setResult(scrapingResult);
      
      // Refresh the page to show updated data
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al scraping de labels');
      console.error('Scraping error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-prata font-semibold text-gray-900 mb-4">
        Scraping de Color Labels
      </h2>
      
      <p className="text-sm text-gray-600 mb-6">
        Obtiene nombres legibles para los colores desde fuentes externas. 
        Los labels scraped no sobrescriben los labels editables.
      </p>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => handleScrape('only-new')}
          disabled={isLoading}
          className="
            flex items-center gap-2 px-4 py-2.5 
            bg-gray-900 text-white rounded-lg
            hover:bg-gray-800 
            disabled:bg-gray-400 disabled:cursor-not-allowed
            transition-colors font-medium
          "
        >
          <Sparkles className="w-5 h-5" />
          Actualizar Nuevos Labels
        </button>

        <button
          onClick={() => handleScrape('all')}
          disabled={isLoading}
          className="
            flex items-center gap-2 px-4 py-2.5 
            bg-blue-600 text-white rounded-lg
            hover:bg-blue-700 
            disabled:bg-gray-400 disabled:cursor-not-allowed
            transition-colors font-medium
          "
        >
          <RefreshCw className="w-5 h-5" />
          Forzar Refresh Completo
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
          <div>
            <p className="text-sm font-medium text-blue-900">
              Scrapeando labels de colores...
            </p>
            <p className="text-xs text-blue-700 mt-0.5">
              Esto puede tomar varios segundos
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-900">Error</p>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Success Result */}
      {result && !isLoading && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-900 mb-3">
            ✓ Scraping completado
          </p>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded p-3 border border-green-100">
              <p className="text-xs text-gray-600 mb-1">Procesados</p>
              <p className="text-2xl font-bold text-green-700">
                {result.processed}
              </p>
            </div>

            <div className="bg-white rounded p-3 border border-gray-100">
              <p className="text-xs text-gray-600 mb-1">Omitidos</p>
              <p className="text-2xl font-bold text-gray-700">
                {result.skipped}
              </p>
            </div>

            <div className="bg-white rounded p-3 border border-red-100">
              <p className="text-xs text-gray-600 mb-1">Fallidos</p>
              <p className="text-2xl font-bold text-red-700">
                {result.failed}
              </p>
            </div>
          </div>

          {/* Error Details */}
          {result.errors && result.errors.length > 0 && (
            <details className="mt-4">
              <summary className="text-xs text-gray-700 cursor-pointer hover:text-gray-900">
                Ver errores ({result.errors.length})
              </summary>
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {result.errors.map((err, idx) => (
                  <div key={idx} className="text-xs bg-white rounded p-2 border border-red-100">
                    <span className="font-mono text-red-700">{err.hex}</span>
                    <span className="text-gray-600 ml-2">→ {err.error}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
        <p className="text-xs font-medium text-gray-900 mb-2">
          ℹ️ Reglas de Scraping:
        </p>
        <ul className="text-xs text-gray-700 space-y-1.5 list-disc list-inside">
          <li>Los clusters bloqueados (locked) no se procesan</li>
          <li>Los clusters ocultos (hidden) solo se actualizan con "Refresh Completo"</li>
          <li>"Actualizar Nuevos" solo procesa clusters sin scraped_label o con hex modificado</li>
          <li>El campo <code className="bg-gray-200 px-1 rounded">label</code> nunca se sobreescribe automáticamente</li>
        </ul>
      </div>
    </div>
  );
}
