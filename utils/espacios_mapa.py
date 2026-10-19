"""Nombres permitidos para solicitudes desde el mapa y sus zonas visibles."""

import unicodedata


# Aquí se relaciona cada nombre de salón con la zona que ya existe en el mapa.
# Para agregar otro salón, añade su nombre en "nombres" y su zona en "zona".
# La zona debe coincidir con el atributo data-espacio del plano.
# Usa None mientras el salón todavía no tenga una zona dibujada.
ESPACIOS_MAPA = {
    'salon de informatica': {
        'nombres': ('salon de informatica', 'sala de informatica'),
        'zona': 'e3-infb'
    },
    'salon de contabilidad': {
        'nombres': ('salon de contabilidad', 'sala de contabilidad'),
        'zona': None
    },
    'salon de actos': {
        'nombres': ('salon de actos', 'sala de actos'),
        'zona': 'f2-Salon_actos'
    },
    'salon de musica': {
        'nombres': ('salon de musica', 'sala de musica'),
        'zona': 'c1-musica'
    },
    'salon de filosofia': {
        'nombres': ('salon de filosofia', 'sala de filosofia'),
        'zona': None
    },
    'salon de informatica primaria': {
        'nombres': (
            'salon de informatica primaria',
            'salon de informatica (primaria)',
            'sala de informatica primaria',
            'sala de informatica (primaria)'
        ),
        'zona': 'e3-infp'
    }
}

# Plantilla para un salón nuevo: copia este bloque y completa el nombre.
# Déjalo comentado hasta confirmar su nombre en la base de datos.
# 'nombre del salon': {
#     'nombres': ('nombre del salon',),
#     'zona': None  # luego escribe aquí el data-espacio del mapa
# }


def normalizar_nombre(nombre):
    """Compara nombres ignorando mayúsculas, tildes y espacios repetidos."""
    texto = unicodedata.normalize('NFD', str(nombre or '').strip().lower())
    texto = ''.join(letra for letra in texto if unicodedata.category(letra) != 'Mn')
    return ' '.join(texto.split())


def clave_espacio(nombre):
    """Devuelve la clave del espacio permitido que coincide con el nombre."""
    nombre_normalizado = normalizar_nombre(nombre)
    for clave, datos in ESPACIOS_MAPA.items():
        if nombre_normalizado in datos['nombres']:
            return clave
    return None
