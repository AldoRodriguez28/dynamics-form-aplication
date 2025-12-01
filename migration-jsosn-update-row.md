Objetivo: migrar el formulario dinámico para consumir el nuevo modelo que llega en `mock-business-form-update.json`, que incluye bloques con `rows` y orden de campos por `num`, y actualizar el render de grid y los mocks.

Contexto del cambio de modelo
- Antes: cada bloque solo tenía `{ code, values }` y la UI dependía de un catálogo fijo de campos.  
- Ahora: cada bloque trae metadatos (`name`, `description`, `order`, `schemaVersion`, `ui`), `optionSets`, `rows` y `values`. Cada fila define `num` (orden) y `fields` con `colSpan`, `collection`, `itemSchema`, `type`, `placeholder`, etc. El render debe inferirse 100% del JSON.

Checklist de migración
- Modelo de datos: ampliar interfaces/typos de Block/Field/Row/OptionSet para contemplar todas las props del nuevo mock (`ui`, `optionSets`, `rows`, `itemSchema`, `widget`, `collection`, `placeholder`, `required`, `schemaVersion`, `order`).
- Fuente de datos: apuntar el servicio al nuevo payload `src/assets/data/mock-business-form-update.json` (o actualizar `mock-business-form.json` con el contenido nuevo) y eliminar parseos que asumían el esquema viejo.
- Resolución de `optionSets`: soportar `mode` (`static`, `api`), `items`, `optionsRef`, y `source` (`endpoint`, `method`, `auth`, `valuePath`, `labelPath`). Normalizar para selects/checkbox-group antes del render.
- Render por filas y grid: iterar `block.rows` ordenado por `num`; dentro de cada fila, mantener el orden original de `fields`. Usar `field.colSpan` si existe; si no, repartir 12 columnas entre los campos (p.ej., 3 campos → 4 colSpan; 4 campos → 3 colSpan = 25%).
- Colecciones y tipos: manejar `collection` (`single`, `array`) y `itemSchema` para objetos repetibles; soportar `type` nuevos (`opening_hours`, `checkbox-group`, `file`, `object`, `url`, `time`, `select`, `textarea`, `checkbox`, `tel`, etc.) con validaciones de `required`.
- Valores iniciales: mapear `block.values` a controls por `field.name`, incluyendo arrays/objetos anidados (`telsNegocio`, `horarioGeneral`, `horariosPersonalizados`, `otrasRedes`). Asegurar defaults seguros (array vacío, objeto vacío, null) para tipos compuestos.
- UI/UX de bloques: aplicar `ui` (`icon`, `collapsible`, `startOpen`) en los headers/accordion; mostrar `label`, `placeholder`, y `description`.
- Backward compatibility: si alguna vista sigue usando el esquema viejo, crear un adaptador temporal que derive `rows/fields` desde la estructura anterior hasta que se elimine el consumo legacy.
- Pruebas/manual: validar carga completa del mock, render de grid con anchos esperados, selects/checkbox-group con `optionSets`, manejo de arrays/objetos, toggle de colapsables y bind de valores iniciales.

Pasos sugeridos (técnico)
1) Actualizar modelos/Interfaces: definir Row, Field, OptionSet, UIConfig y extender Block.  
2) Servicio de formulario: leer `mock-business-form-update.json`, exponer bloques con `rows` y resolver `optionSets` en memoria (mock de API si `mode: "api"`).  
3) Render: refactor a loop de `block.rows` (orden `num`), grid usando `colSpan` o 12/n, soporte de `collection`/`itemSchema` y tipos nuevos.  
4) Valores: crear util para hidratar FormGroup/FormArray desde `block.values` respetando arrays y objetos anidados.  
5) OptionSets: implementar resolver para `optionsRef`; para `mode: "api"` devolver mock de endpoint (o hook a servicio real si existe).  
6) QA: probar con `mock-business-form-update.json`, verificar orden/ancho, placeholders, collapsibles y persistencia de valores.  
7) Depuración: retirar referencias al modelo antiguo o documentar el adaptador temporal hasta removerlo.
