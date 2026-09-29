import datetime


def normalizar(valor):
    if isinstance(valor, datetime.timedelta):
        total = int(valor.total_seconds())
        horas = total // 3600
        minutos = (total % 3600) // 60
        return f'{horas:02d}:{minutos:02d}'
    if isinstance(valor, datetime.datetime):
        return valor.strftime('%Y-%m-%dT%H:%M')
    if isinstance(valor, datetime.date):
        return valor.isoformat()
    if isinstance(valor, bytes):
        return valor.decode('utf-8', errors='replace')
    return valor


def fila(registro):
    if registro is None:
        return None
    return {clave: normalizar(valor) for clave, valor in dict(registro).items()}


def lista(registros):
    return [fila(r) for r in registros or []]
