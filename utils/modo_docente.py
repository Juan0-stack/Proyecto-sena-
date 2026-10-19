"""Determina el modo de trabajo permitido para una cuenta docente."""

from flask import session

from models.espacio_model import EspacioModel


def espacios_a_cargo():
    """Devuelve los espacios que el docente puede administrar."""
    if session.get('nombre_rol') != 'Docente':
        return []
    return EspacioModel.listar_por_encargado(session.get('id_usuario'))


def modo_actual():
    """Usa modo Encargado solo si la cuenta sigue teniendo un espacio asignado."""
    if session.get('nombre_rol') != 'Docente':
        return None
    if not espacios_a_cargo():
        session['modo'] = 'docente'
        return 'docente'
    modo = session.get('modo')
    if modo not in ('docente', 'encargado'):
        modo = 'encargado'
        session['modo'] = modo
    return modo
