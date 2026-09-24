"""Generate the local-only, deterministic search catalog in supabase/seed.sql."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def uid(kind: str, value: str | int) -> str:
    return str(__import__("uuid").UUID(hashlib.md5(f"sale-enzo:{kind}:{value}".encode()).hexdigest()))


def sql(value: object) -> str:
    if value is None:
        return "null"
    if isinstance(value, (dict, list)):
        value = json.dumps(value, ensure_ascii=False, sort_keys=True)
    return "'" + str(value).replace("'", "''") + "'"


categories = [
    ("poleras", "Poleras y Hoodies", ["hoodies", "Poleras con capucha", "poleras-gym", "Poleras de gimnasio"]),
    ("casacas", "Casacas", ["casacas-lluvia", "Casacas para lluvia", "cortavientos", "Cortavientos"]),
    ("shorts", "Shorts", ["shorts-running", "Shorts para correr", "shorts-futbol", "Shorts de fútbol"]),
    ("pantalones", "Pantalones y Joggers", ["joggers", "Joggers", "pantalones-entrenamiento", "Pantalones de entrenamiento"]),
    ("zapatillas", "Zapatillas", ["zapatillas-running", "Zapatillas para correr", "zapatillas-training", "Zapatillas de entrenamiento"]),
    ("accesorios", "Accesorios", ["mochilas", "Mochilas", "gorras", "Gorras"]),
]

colors = [
    ("Negro", "#202020", 18.0, 0.0, 0.0),
    ("Blanco", "#F3F0E9", 95.0, 0.0, 0.0),
    ("Azul", "#285A91", 38.0, 3.0, -36.0),
    ("Rojo", "#C4433E", 49.0, 50.0, 30.0),
    ("Verde", "#526D4D", 43.0, -18.0, 12.0),
    ("Gris", "#898A86", 57.0, 0.0, 0.0),
    ("Amarillo", "#DAB84B", 76.0, 2.0, 60.0),
    ("Morado", "#755E83", 44.0, 21.0, -19.0),
]

groups = [
    {
        "sub": "polos-manga-corta", "brand": "Nike", "tags": ["running", "dry-fit", "entrenamiento", "ligero"],
        "names": ["Polo Nike Dri-FIT para running", "Camiseta Nike ligera para correr", "Polo Nike de entrenamiento running", "Camiseta Nike transpirable de carrera", "Polo Nike deportivo para trotar"],
        "description": "Polo de segunda mano para correr y entrenar. Tejido ligero de secado rápido, cómodo para rutas urbanas.",
        "metadata": {"sport": "running", "material": "poliéster técnico"}, "price": 42,
    },
    {
        "sub": "polos-manga-corta", "brand": "Adidas", "tags": ["futbol", "seleccion", "vintage", "camiseta"],
        "names": ["Polo Adidas fútbol edición 2024", "Camiseta Adidas fútbol visitante", "Polo Adidas de partido clásico", "Camiseta Adidas fútbol retro", "Polo Adidas deportivo edición local"],
        "description": "Camiseta deportiva de segunda mano para fútbol. Corte cómodo y detalles clásicos de partido.",
        "metadata": {"sport": "fútbol", "team": "Selección Perú", "season": "2024"}, "price": 64,
    },
    {
        "sub": "poleras-gym", "brand": "Gymshark", "tags": ["gym", "fitness", "streetwear", "entrenamiento"],
        "names": ["Polera Gymshark para gimnasio", "Hoodie Gymshark de entrenamiento", "Polera Gymshark fitness oversize", "Sudadera Gymshark deportiva", "Hoodie Gymshark para gym"],
        "description": "Polera de segunda mano para gimnasio y entrenamiento de fuerza. Tela suave con corte cómodo.",
        "metadata": {"sport": "gym", "style": "streetwear"}, "price": 78,
    },
    {
        "sub": "casacas-lluvia", "brand": "Columbia", "tags": ["outdoor", "lluvia", "impermeable", "senderismo"],
        "names": ["Casaca Columbia para lluvia", "Chaqueta Columbia outdoor de lluvia", "Casaca Columbia ligera de montaña", "Chaqueta Columbia para senderismo", "Casaca Columbia de aventura"],
        "description": "Casaca de segunda mano para salir cuando cambia el clima. Capa exterior ligera para rutas bajo la lluvia.",
        "metadata": {"sport": "senderismo", "feature": "protección contra lluvia"}, "price": 112,
    },
    {
        "sub": "shorts-running", "brand": "Puma", "tags": ["running", "shorts", "ligero", "dry-fit"],
        "names": ["Short Puma para running", "Short Puma ligero para correr", "Short deportivo Puma de carrera", "Short Puma transpirable running", "Short Puma para trotar"],
        "description": "Short de segunda mano para running. Ligero, flexible y fresco para correr distancias cortas o largas.",
        "metadata": {"sport": "running", "material": "poliéster"}, "price": 36,
    },
    {
        "sub": "joggers", "brand": "Under Armour", "tags": ["jogger", "entrenamiento", "gym", "streetwear"],
        "names": ["Jogger Under Armour de entrenamiento", "Pantalón jogger Under Armour gym", "Jogger deportivo Under Armour", "Pantalón Under Armour para entrenar", "Jogger Under Armour cómodo"],
        "description": "Pantalón jogger de segunda mano para gimnasio o uso diario. Cintura cómoda y corte deportivo.",
        "metadata": {"sport": "fitness", "style": "jogger"}, "price": 68,
    },
    {
        "sub": "zapatillas-running", "brand": "New Balance", "tags": ["running", "zapatillas", "amortiguacion", "entrenamiento"],
        "names": ["Zapatillas New Balance para running", "Tenis New Balance para correr", "Zapatillas New Balance de carrera", "Tenis deportivos New Balance running", "Zapatillas New Balance amortiguadas"],
        "description": "Zapatillas de segunda mano para correr con amortiguación cómoda. Suela apta para entrenamiento urbano.",
        "metadata": {"sport": "running", "feature": "amortiguación"}, "price": 145,
    },
    {
        "sub": "mochilas", "brand": "The North Face", "tags": ["outdoor", "mochila", "senderismo", "viaje"],
        "names": ["Mochila The North Face outdoor", "Mochila The North Face para senderismo", "Bolso The North Face de montaña", "Mochila The North Face de aventura", "Mochila The North Face para trekking"],
        "description": "Mochila de segunda mano para senderismo y salidas outdoor. Espacio práctico para ropa y accesorios.",
        "metadata": {"sport": "trekking", "feature": "compartimentos"}, "price": 89,
    },
]

images = [
    "photo-1521572163474-6864f9cf17ab",
    "photo-1586790170083-2f9ceadc732d",
    "photo-1556821840-3a63f95609a7",
    "photo-1591047139829-d91aecb6caea",
    "photo-1591195853828-11db59a44f6b",
    "photo-1542272604-787c3835535d",
    "photo-1542291026-7eec264c27ff",
    "photo-1553062407-98eeb64c6a62",
]

parts = [
    "-- Deterministic local demo catalog for hybrid search.",
    "-- No private users, remote snapshot data, or embeddings are included.",
    "-- Regenerate with: python scripts/generate-search-seed.py",
    "begin;",
]

for slug, name, children in categories:
    parts.append(
        f"insert into public.product_categories (id, name, slug) values ({sql(uid('category', slug))}, {sql(name)}, {sql(slug)}) on conflict do nothing;"
    )
    for child_slug, child_name in zip(children[::2], children[1::2]):
        parts.append(
            f"insert into public.product_categories (id, name, slug, parent_id) "
            f"select {sql(uid('category', child_slug))}, {sql(child_name)}, {sql(child_slug)}, p.id "
            f"from public.product_categories p where p.slug = {sql(slug)} on conflict do nothing;"
        )

for name in ["Asics", "Umbro", "Salomon", "Fila"]:
    parts.append(f"insert into public.brands (id, name) values ({sql(uid('brand', name))}, {sql(name)}) on conflict do nothing;")

all_tags = sorted({tag for group in groups for tag in group["tags"]} | {"casual", "vintage", "fútbol", "streetwear", "impermeable", "outdoor", "unisex", "oferta"})
for tag in all_tags:
    parts.append(f"insert into public.tags (id, name, slug) values ({sql(uid('tag', tag))}, {sql(tag.replace('-', ' ').title())}, {sql(tag)}) on conflict do nothing;")

for name, hex_code, light, a, b in colors:
    parts.append(
        f"insert into public.variant_color_categories "
        f"(id, label, representative_hex, centroid_l, centroid_a, centroid_b, is_locked) "
        f"values ({sql(uid('color', name))}, {sql(name)}, {sql(hex_code)}, {light}, {a}, {b}, true) on conflict do nothing;"
    )

item_count = 0
variant_count = 0
for group_index, group in enumerate(groups):
    for offset, name in enumerate(group["names"]):
        product_no = group_index * 5 + offset + 1
        product_id = uid("product", product_no)
        sub = group["sub"]
        description = group["description"]
        if product_no == 19:  # The rain jacket hard case has no keyword "impermeable".
            description = "Capa ligera de segunda mano para caminatas cuando el cielo cambia. Fácil de llevar en una mochila."
        parts.append(
            f"insert into public.products (id, name, description, brand, subcategory_id, is_active) "
            f"select {sql(product_id)}, {sql(name)}, {sql(description)}, {sql(group['brand'])}, c.id, true "
            f"from public.product_categories c where c.slug = {sql(sub)} on conflict do nothing;"
        )
        variants_for_product = 2 if product_no <= 15 else 1
        for variant_no in range(1, variants_for_product + 1):
            variant_count += 1
            variant_id = uid("variant", f"{product_no}-{variant_no}")
            color = colors[(product_no + variant_no) % len(colors)]
            size = "L" if variant_no == 2 else ("42" if group_index == 6 else "M")
            metadata = dict(group["metadata"])
            metadata["condition_hint"] = "segunda mano"
            parts.append(
                f"insert into public.product_variants "
                f"(id, product_id, size, metadata, main_color_hex, main_color_category_id, main_img_url, gender, fit) "
                f"values ({sql(variant_id)}, {sql(product_id)}, {sql(size)}, {sql(metadata)}::jsonb, "
                f"{sql(color[1])}, {sql(uid('color', color[0]))}, "
                f"{sql('https://images.unsplash.com/' + images[group_index] + '?w=900&q=80')}, "
                f"'unisex', 'regular') on conflict do nothing;"
            )
            tags = [tag for tag in group["tags"] if not (product_no == 19 and tag == "impermeable")]
            for tag in tags:
                parts.append(
                    f"insert into public.variant_tags (variant_id, tag_id) "
                    f"select {sql(variant_id)}, t.id from public.tags t where t.slug = {sql(tag)} on conflict do nothing;"
                )
            items_for_variant = 2 if variant_count <= 5 else 1
            for item_no in range(1, items_for_variant + 1):
                item_count += 1
                item_id = uid("item", f"{product_no}-{variant_no}-{item_no}")
                price = group["price"] + offset * 3 + (variant_no - 1) * 4 + (item_no - 1) * 2
                condition = ["like-new", "semi-used", "used", "new", "worn"][product_no % 5]
                status = "reserved" if item_no == 2 else "available"
                parts.append(
                    f"insert into public.product_items "
                    f"(id, variant_id, condition, price, compare_at_price, sku, stock, status) "
                    f"values ({sql(item_id)}, {sql(variant_id)}, {sql(condition)}, {price}, {price + 25}, "
                    f"{sql(f'SEED-{product_no:02d}-{variant_no}-{item_no}')}, 1, {sql(status)}) on conflict do nothing;"
                )

parts.extend(["commit;", f"-- {len(groups) * 5} products, {variant_count} variants, {item_count} items."])
assert (variant_count, item_count) == (55, 60)
(ROOT / "supabase" / "seed.sql").write_text("\n".join(parts) + "\n", encoding="utf-8")
print(f"Wrote {len(groups) * 5} products, {variant_count} variants, {item_count} items.")
