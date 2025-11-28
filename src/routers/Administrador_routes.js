import {Router} from 'express'
import {recuperarPassword, comprobarTokenPassword, crearNuevaPassword, login, perfil, actualizarPerfil, actualizarPassword, actualizarImagenPerfil, eliminarCuentaAdministrador, baneoEstudiante, baneoPasante} from '../controllers/Administrador_controller.js'
import { verificarTokenJWT } from '../middlewares/JWT.js'

const router = Router()
router.post('/recuperarpasswordAdmin',recuperarPassword)
router.get('/recuperarpasswordAdmin/:token',comprobarTokenPassword)
router.post('/nuevopasswordAdmin/:token',crearNuevaPassword)
router.post('/login/administrador',login)
router.get('/perfil/administrador',verificarTokenJWT,perfil)
router.put('/administrador/:id',verificarTokenJWT,actualizarPerfil)
router.put('/administrador/actualizarpassword/:id',verificarTokenJWT,actualizarPassword)
router.put('/administrador/imagen/:id',verificarTokenJWT, actualizarImagenPerfil);
router.delete('/estudiante/banear/:id',verificarTokenJWT,baneoEstudiante)
router.delete('/pasante/banear/:id',verificarTokenJWT,baneoPasante)
router.put('/administrador/:id',verificarTokenJWT,actualizarPerfil)
router.delete('/administrador/eliminar/:id', verificarTokenJWT, eliminarCuentaAdministrador)

export default router