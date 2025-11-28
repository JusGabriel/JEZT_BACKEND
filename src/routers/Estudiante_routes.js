import {Router} from 'express'
import {comprobarTokenPassword, confirmarEmail, recuperarPassword, registro, crearNuevaPassword, login, perfil, actualizarPerfil, actualizarPassword, listarEstudiantes,  eliminarCuentaEstudiante, donarEstudiante, actualizarImagenPerfil, detalleEstudiante } from '../controllers/Estudiante_controller.js'
import { verificarTokenJWT } from '../middlewares/JWT.js'

const router = Router()

router.post('/registro',registro)
router.get('/confirmar/:token',confirmarEmail)
router.post('/recuperarpassword',recuperarPassword)
router.get('/recuperarpassword/:token',comprobarTokenPassword)
router.post('/nuevopassword/:token',crearNuevaPassword)
router.post('/login',login)
router.get('/perfil',verificarTokenJWT,perfil)
router.put('/estudiante/:id',verificarTokenJWT,actualizarPerfil)
router.put('/estudiante/actualizarpassword/:id',verificarTokenJWT,actualizarPassword)
router.put('/estudiante/imagen/:id',verificarTokenJWT, actualizarImagenPerfil);
router.get('/estudiantes',verificarTokenJWT, listarEstudiantes)
router.delete('/estudiante/eliminar/:id', verificarTokenJWT, eliminarCuentaEstudiante)
router.post('/estudiante/donar', verificarTokenJWT, donarEstudiante)
router.get('/estudiante/detalle/:id',verificarTokenJWT, detalleEstudiante)


export default router