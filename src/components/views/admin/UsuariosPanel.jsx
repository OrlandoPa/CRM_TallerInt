import { useCallback, useEffect, useState } from 'react';
import * as api from '../../../services/api';
import { ETIQUETAS_ROL, ROLES } from '../../../services/authService';

const DESCRIPCION_ROL = {
  doctor: 'Todo: agenda, pacientes, tratamientos y Administración.',
  recepcion: 'Agenda, pacientes (sin tratamientos), asistencia y chats.'
};

function UsuariosPanel({ usuarioActual, showToast }) {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [nuevo, setNuevo] = useState({ email: '', nombre: '', rol: ROLES.RECEPCION });
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setUsuarios(await api.getUsuarios());
    } catch (err) {
      showToast(err.message, false);
    }
  }, [showToast]);

  // Carga inicial (se ignora la respuesta si el panel ya se cerró)
  useEffect(() => {
    let vigente = true;
    api.getUsuarios()
      .then(lista => { if (vigente) setUsuarios(lista); })
      .catch(err => { if (vigente) showToast(err.message, false); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [showToast]);

  const crear = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      await api.crearUsuario(nuevo);
      showToast(`Acceso creado para ${nuevo.email.trim().toLowerCase()}. Ya puede entrar con su cuenta de Google.`);
      setNuevo({ email: '', nombre: '', rol: ROLES.RECEPCION });
      await cargar();
    } catch (err) {
      showToast(err.message.includes('duplicate') ? 'Ese correo ya tiene una cuenta.' : err.message, false);
    } finally {
      setEnviando(false);
    }
  };

  const actualizar = async (u, cambios, mensaje) => {
    try {
      await api.actualizarUsuario(u.email, cambios);
      showToast(mensaje);
      await cargar();
    } catch (err) {
      showToast(err.message, false);
    }
  };

  return (
    <div className="stack-col">
      <section className="panel" aria-labelledby="nuevo-usuario-titulo">
        <header className="panel-head">
          <h3 className="panel-title" id="nuevo-usuario-titulo">Dar acceso a una persona</h3>
          <span className="panel-meta">Entra con su cuenta de Google; no se crean contraseñas</span>
        </header>
        <form className="panel-body inline-form" onSubmit={crear}>
          <div className="form-group">
            <label htmlFor="nuevo-email">Correo de Google</label>
            <input
              id="nuevo-email"
              data-testid="input-nuevo-usuario-email"
              type="email"
              className="form-control"
              value={nuevo.email}
              onChange={(e) => setNuevo(p => ({ ...p, email: e.target.value }))}
              placeholder="persona@gmail.com"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="nuevo-nombre">Nombre</label>
            <input
              id="nuevo-nombre"
              className="form-control"
              value={nuevo.nombre}
              onChange={(e) => setNuevo(p => ({ ...p, nombre: e.target.value }))}
              maxLength={100}
            />
          </div>
          <div className="form-group">
            <label htmlFor="nuevo-rol">Rol</label>
            <select
              id="nuevo-rol"
              data-testid="select-nuevo-usuario-rol"
              className="form-control"
              value={nuevo.rol}
              onChange={(e) => setNuevo(p => ({ ...p, rol: e.target.value }))}
              aria-describedby="nuevo-rol-ayuda"
            >
              {Object.values(ROLES).map(r => <option key={r} value={r}>{ETIQUETAS_ROL[r]}</option>)}
            </select>
          </div>
          <div>
            <button type="submit" className="btn btn-primary" disabled={enviando} data-testid="btn-crear-usuario">
              {enviando ? 'Guardando…' : 'Dar acceso'}
            </button>
          </div>
          <p id="nuevo-rol-ayuda" className="help-text span-all">
            {ETIQUETAS_ROL[nuevo.rol]}: {DESCRIPCION_ROL[nuevo.rol]}
          </p>
        </form>
      </section>

      <section className="panel" aria-labelledby="usuarios-titulo">
        <header className="panel-head">
          <h3 className="panel-title" id="usuarios-titulo">Personal con acceso</h3>
          <span className="panel-meta">Desactivar quita el acceso sin borrar el historial</span>
        </header>
        {cargando ? (
          <p className="empty-state">Cargando…</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table" data-testid="tabla-usuarios">
              <thead>
                <tr>
                  <th scope="col">Correo</th>
                  <th scope="col">Nombre</th>
                  <th scope="col">Rol</th>
                  <th scope="col">Estado</th>
                  <th scope="col"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => {
                  const esYo = u.email === usuarioActual?.email;
                  return (
                    <tr key={u.email} className={u.activo ? '' : 'is-inactive'}>
                      <td className="mono">{u.email}{esYo && <span className="badge badge--info badge-gap">Tú</span>}</td>
                      <td>{u.nombre || '—'}</td>
                      <td>
                        <label className="sr-only" htmlFor={`rol-${u.email}`}>Rol de {u.email}</label>
                        <select
                          id={`rol-${u.email}`}
                          className="form-control"
                          value={u.rol}
                          disabled={esYo}
                          title={esYo ? 'No puedes cambiar tu propio rol' : undefined}
                          onChange={(e) => actualizar(u, { rol: e.target.value }, `Rol de ${u.email} actualizado.`)}
                        >
                          {Object.values(ROLES).map(r => <option key={r} value={r}>{ETIQUETAS_ROL[r]}</option>)}
                        </select>
                      </td>
                      <td>
                        <span className={`badge ${u.activo ? 'badge--ok' : 'badge--bad'}`}>{u.activo ? 'Activo' : 'Sin acceso'}</span>
                      </td>
                      <td className="cell-actions">
                        {!esYo && (
                          <button
                            type="button"
                            className={`btn btn-sm ${u.activo ? 'btn-secondary' : 'btn-primary'}`}
                            onClick={() => {
                              if (u.activo && !window.confirm(`¿Quitar el acceso de ${u.email}? Se cerrará en su próximo uso.`)) return;
                              actualizar(u, { activo: !u.activo }, u.activo ? `Acceso de ${u.email} desactivado.` : `Acceso de ${u.email} reactivado.`);
                            }}
                          >
                            {u.activo ? 'Quitar acceso' : 'Reactivar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default UsuariosPanel;
