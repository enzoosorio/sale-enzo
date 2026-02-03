"use client";

import { Lightbulb } from "lucide-react";

export function PhotoGuidelines() {
  const guidelines = [
    {
      title: "Use Fondos Neutros",
      description: "Los fondos blancos o grises claros funcionan mejor para fotografía de productos"
    },
    {
      title: "Asegure Buena Iluminación",
      description: "Use luz natural o luz artificial difusa suave para evitar sombras duras"
    },
    {
      title: "Centre el Producto",
      description: "Mantenga el producto centrado y llene la mayor parte del marco para consistencia"
    },
    {
      title: "Evite Sombras Duras",
      description: "Use iluminación suave y uniforme desde múltiples ángulos para minimizar sombras"
    },
    {
      title: "Encuadre Consistente",
      description: "Mantenga ángulos, distancia y composición similares en todas las imágenes"
    },
    {
      title: "Alta Resolución",
      description: "Use imágenes de alta calidad (al menos 1000x1000px) para mejores resultados"
    }
  ];

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="flex items-start gap-3 mb-4">
        <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div>
          <h3 className="text-lg font-semibold text-blue-900 mb-1">
            Mejores Prácticas para Fotografía
          </h3>
          <p className="text-sm text-blue-700">
            Siga estas pautas para imágenes de productos con aspecto profesional
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {guidelines.map((guideline, index) => (
          <div key={index} className="flex gap-3">
            <div className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
              {index + 1}
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-0.5">
                {guideline.title}
              </h4>
              <p className="text-xs text-gray-600">
                {guideline.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
