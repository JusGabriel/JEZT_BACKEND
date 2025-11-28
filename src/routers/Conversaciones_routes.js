import express from "express";
import {
  crearConversacion,
  enviarPregunta,
  historialUsuario,
  eliminarConversacion,
  calificarRespuesta,      
} from "../controllers/Conversaciones_controller.js";
import { verificarTokenJWT } from "../middlewares/JWT.js";

const router = express.Router();

router.post("/crear", verificarTokenJWT, crearConversacion);
router.post("/enviar/:id", verificarTokenJWT, enviarPregunta);
router.get("/historial", verificarTokenJWT, historialUsuario);
router.delete("/eliminar/:id", verificarTokenJWT, eliminarConversacion);
router.post('/calificar', verificarTokenJWT, calificarRespuesta);



export default router;
