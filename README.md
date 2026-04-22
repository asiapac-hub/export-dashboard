# Dashboard Exportaciones Ecuador, GitHub Pages

## Qué incluye
- `index.html`
- `assets/styles.css`
- `assets/app.js`
- `data/` con agregados, diccionarios y CSV optimizado

## Cómo publicarlo en GitHub Pages
1. Crea un repositorio nuevo en GitHub.
2. Sube todo el contenido de esta carpeta al repositorio.
3. En GitHub entra a **Settings > Pages**.
4. En **Build and deployment**, elige **Deploy from a branch**.
5. Selecciona la rama `main` y la carpeta `/root`.
6. Guarda.
7. GitHub te dará una URL pública.

## Cómo actualizar datos
Cuando tengas un nuevo Excel:
1. Ejecuta el script `preparar_exports_dashboard.py`.
2. Reemplaza la carpeta `data/` por la nueva.
3. Haz commit y push.

## Nota importante
Este dashboard carga `data/detalle/detalle_ids_q1_2026.csv` en el navegador. Para Q1 2026 es manejable. Si luego el archivo crece mucho, conviene dividirlo por año o trimestre.
