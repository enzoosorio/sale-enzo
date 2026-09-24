# Evaluación de Vite

La portada y el shell público se compilan y abren con Next.js 16.3.6. El catálogo todavía no puede medirse con datos reales porque falta el esquema base de Supabase. Por tanto no hay evidencia de que migrar a Vite reduzca LCP, CLS o trabajo del navegador.

Vite ofrecería una compilación más simple para un frontend cliente. En este proyecto implicaría sustituir App Router, Server Components, SSR de producto para SEO, middleware de sesión, Server Actions, optimización de imágenes y metadatos. Supabase seguiría siendo el backend, pero las rutas API administrativas requerirían un servicio o plataforma de funciones. No conviene convertir las acciones a endpoints hasta demostrar una mejora en la página de productos con datos reales.

Después de restaurar el esquema, medir sobre el build de producción: LCP, CLS, bytes JS iniciales, carga de imágenes, latencia de RPC y FPS de transición de filtros en móvil. Corregir primero consultas, imágenes y animaciones que dominen esos valores. Plantear un prototipo Vite solo si la medición muestra que el coste del framework, y no los datos o el contenido, es el cuello de botella.
