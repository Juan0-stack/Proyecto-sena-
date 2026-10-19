# Informe de complejidad

Este informe registra los archivos revisados y simplificados. Se irá ampliando a medida que avancemos.

| Archivo | Qué hace | Dificultad | Cómo se simplificó |
|---|---|---|---|
| `static/js/motion.js` | Maneja animaciones y desplazamiento suave de los paneles. | Alta | Separé la búsqueda, preparación y animación de entradas y cambios de sección en funciones con nombres descriptivos. Conservé los nombres que usa `static/panel.js`. |

## Nombres internos que cambiaron

| Nombre anterior | Nombre nuevo | Uso |
|---|---|---|
| `aArray` | `convertirNodosEnLista` | Convierte un elemento o una colección de elementos en una lista. |
| `miles` | `mostrarConSeparadorDeMiles` | Muestra un número con separador de miles. |
| `REDUCE` | `REDUCIR_MOVIMIENTO` | Indica que el usuario pidió menos movimiento. |
| `FMT` (función inmediata) | `FORMATO_NUMEROS` | Guarda el formato regional de números. |

No cambié los nombres públicos de `window.Motion`, porque `static/panel.js` los usa.

## Código conservado sin uso

| Archivo | Código | Motivo |
|---|---|---|
| `static/js/motion.js` | `contenedor` dentro de `moveIndicator` | Ya existía y no participa en el cálculo. Se conservó y se marcó `SIN USO:`. |
