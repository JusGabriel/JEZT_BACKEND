import {Router} from 'express'
import { login, registro, perfil, recuperarPassword, comprobarTokenPassword, crearNuevaPassword, actualizarImagenPerfil, actualizarPerfil, actualizarPassword, eliminarCuentaPasante, listarPasantes,detallePasante} from '../controllers/Pasante_controllers.js'
import { verificarTokenJWT } from '../middlewares/JWT.js'
const router = Router()


router.post('/login/pasante',login)
router.post("/registro/pasante",verificarTokenJWT ,registro)
router.get('/perfil/pasante',verificarTokenJWT, perfil)
router.post('/recuperarpasswordPasante', recuperarPassword)
router.get('/recuperarpasswordPasante/:token', comprobarTokenPassword)
router.post('/nuevopasswordPasante/:token', crearNuevaPassword)
router.put('/pasante/:id',verificarTokenJWT,actualizarPerfil)
router.put('/pasante/actualizarpassword/:id',verificarTokenJWT,actualizarPassword)
router.put('/pasante/imagen/:id',verificarTokenJWT, actualizarImagenPerfil)
router.delete('/pasante/eliminar/:id', verificarTokenJWT, eliminarCuentaPasante)
router.get('/pasantes',verificarTokenJWT, listarPasantes)
router.get('/pasante/detalle/:id',verificarTokenJWT, detallePasante)

export default router