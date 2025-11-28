import { Router } from "express";
import upload from "../middlewares/Upload.js";
import { getQR, getStatus, sendMessage, listaMensajes, sendMessageN8N, deleteMessage } from "../controllers/Whatsapp_controller.js";

const router = Router();

router.get("/qr", getQR);
router.get("/status", getStatus);
router.post("/send-message", upload.array("files"), sendMessage);
router.get("/listarmensajes", listaMensajes)
router.post("/send-message-n8n", sendMessageN8N);
router.delete("/mensajes/:id", deleteMessage);

export default router;