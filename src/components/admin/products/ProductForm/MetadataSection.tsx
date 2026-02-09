import { VariantMetadataInput } from "@/types/products/product_form_data";
import { Plus, X } from "lucide-react";

interface MetadataSectionProps {
  metadataInputs: VariantMetadataInput[];
  onChange: (metadataInputs: VariantMetadataInput[]) => void;
  disabled?: boolean;
}

/**
 * MetadataSection - Dynamic key-value metadata inputs for product variants
 * 
 * PURPOSE:
 * - Semantic search enrichment
 * - RAG contextualization
 * - Long-tail attribute signals
 * 
 * BEHAVIOR:
 * - Pure client-side form state (no DB operations)
 * - Optional (does not interfere with flow if unused)
 * - Persisted only on final form submit
 * - Transforms to JSONB object in server action
 * 
 * EDGE CASES HANDLED:
 * - Duplicate keys (last value wins)
 * - Whitespace trimming
 * - Empty entries (removed on submit)
 */
export const MetadataSection = ({
  metadataInputs,
  onChange,
  disabled = false
}: MetadataSectionProps) => {
  
  const addMetadataEntry = () => {
    onChange([...metadataInputs, { key: "", value: "" }]);
  };

  const removeMetadataEntry = (index: number) => {
    const newInputs = metadataInputs.filter((_, i) => i !== index);
    onChange(newInputs);
  };

  const updateMetadataEntry = (index: number, field: "key" | "value", value: string) => {
    const newInputs = [...metadataInputs];
    newInputs[index] = { ...newInputs[index], [field]: value };
    onChange(newInputs);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-900">
            Metadata (Optional)
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            Add key-value pairs to enrich semantic search and RAG context
          </p>
        </div>
        <button
          type="button"
          onClick={addMetadataEntry}
          disabled={disabled}
          className="flex items-center gap-2 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Metadata
        </button>
      </div>

      {metadataInputs.length > 0 && (
        <div className="space-y-2">
          {metadataInputs.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={entry.key}
                  onChange={(e) => updateMetadataEntry(index, "key", e.target.value)}
                  disabled={disabled}
                  placeholder="Key (e.g., team, sport, material)"
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:opacity-50"
                />
                <input
                  type="text"
                  value={entry.value}
                  onChange={(e) => updateMetadataEntry(index, "value", e.target.value)}
                  disabled={disabled}
                  placeholder="Value"
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:opacity-50"
                />
              </div>
              <button
                type="button"
                onClick={() => removeMetadataEntry(index)}
                disabled={disabled}
                className="p-1.5 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Remove metadata entry"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {metadataInputs.length === 0 && (
        <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-sm text-gray-500">
            No metadata added yet. Click "Add Metadata" to start.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Examples: team, sport, material, edition, season, player
          </p>
        </div>
      )}
    </div>
  );
};
