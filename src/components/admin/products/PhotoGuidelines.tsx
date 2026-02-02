"use client";

import { Lightbulb } from "lucide-react";

export function PhotoGuidelines() {
  const guidelines = [
    {
      title: "Use Neutral Backgrounds",
      description: "Plain white or light gray backgrounds work best for product photography"
    },
    {
      title: "Ensure Good Lighting",
      description: "Use natural light or soft, diffused artificial lighting to avoid harsh shadows"
    },
    {
      title: "Center the Product",
      description: "Keep the product centered and fill most of the frame for consistency"
    },
    {
      title: "Avoid Harsh Shadows",
      description: "Use soft, even lighting from multiple angles to minimize shadows"
    },
    {
      title: "Consistent Framing",
      description: "Maintain similar angles, distance, and composition across all product images"
    },
    {
      title: "High Resolution",
      description: "Use high-quality images (at least 1000x1000px) for best results"
    }
  ];

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="flex items-start gap-3 mb-4">
        <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div>
          <h3 className="text-lg font-semibold text-blue-900 mb-1">
            Photo Best Practices
          </h3>
          <p className="text-sm text-blue-700">
            Follow these guidelines for professional-looking product images
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
