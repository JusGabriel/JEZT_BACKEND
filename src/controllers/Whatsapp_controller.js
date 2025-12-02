
import { client, lastQR, isReady } from "../config/client.js";
import pkg from "whatsapp-web.js";
const { MessageMedia } = pkg;
import { normalizeNumber } from "../utils/normalize.js";
import Mensaje from "../models/Mensaje.js";

const getQR = async (req, res) => {
  if (isReady) return res.json({ ready: true, qr: null });
  if (!lastQR) {
    return res.status(404).json({ ready: false, error: "QR aún no generado." });
  }
  res.json({ ready: false, qr: lastQR });
};

const getStatus = (req, res) => {
  res.json({ ready: isReady });
};

const sendMessage = async (req, res) => {
  try {
    if (!isReady) {
      return res
        .status(503)
        .json({ error: "WhatsApp no está listo. Escanea el QR en /qr." });
    }

    const message = req.body.message || "";
    let numbers = req.body.numbers || req.body["numbers[]"] || [];
    if (!Array.isArray(numbers)) numbers = [numbers];
    numbers = numbers.map((n) => normalizeNumber(n)).filter(Boolean);

    if (!message && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ error: "Debes enviar un mensaje o al menos un archivo." });
    }

    if (!numbers.length) {
      return res.status(400).json({ error: "No hay números válidos." });
    }

    const allowedTipos = ["Administrativas", "Académicas", "Extracurriculares"];
    const tipoFromReq = req.body.tipo;
    if (!allowedTipos.includes(tipoFromReq)) {
      return res.status(400).json({
        error: "El campo 'tipo' debe ser Administrativas, Académicas o Extracurriculares.",
      });
    }

    const files = (req.files || []).map(file => {
      const base64 = file.buffer.toString("base64");
      return {
        media: new MessageMedia(file.mimetype, base64, file.originalname),
        fileName: file.originalname,
        fileMime: file.mimetype,
      };
    });

    const results = [];
    for (const chatId of numbers) {
      try {
        if (message) {
          await client.sendMessage(chatId, message);
        }
        for (const file of files) {
          await client.sendMessage(chatId, file.media);
        }
      } catch (err) {
        console.error(`Error enviando a ${chatId}:`, err);
        results.push({ to: chatId, sent: false, error: String(err) });
      }
    }

    const nuevoMensaje = new Mensaje({
      numbers, 
      message,
      hasMedia: files.length > 0,
      files: files.map(f => ({ fileName: f.fileName, fileMime: f.fileMime })),
      tipo: tipoFromReq,
      date: new Date(),
    });

    await nuevoMensaje.save();

    numbers.forEach(n => results.push({ to: n, sent: true }));

    res.json({ ok: true, results });
  } catch (e) {
    console.error("Error /send-message:", e);
    res.status(500).json({ error: String(e) });
  }
};

// Endpoint para cerrar sesión de WhatsApp manualmente
const logoutWhatsapp = async (req, res) => {
  try {
    await client.logout();
    res.json({ ok: true, message: "Sesión de WhatsApp cerrada" });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};


const listaMensajes = async (req, res) => {
  try {
    const { tipo, fechaInicio, fechaFin } = req.query;

    const condiciones = [
      { $or: [{ status: { $exists: false } }, { status: true }] },
    ];

    if (tipo) {
      condiciones.push({ tipo });
    }

    if (fechaInicio || fechaFin) {
      const rangoFechas = {};
      if (fechaInicio) rangoFechas.$gte = new Date(fechaInicio);
      if (fechaFin) rangoFechas.$lte = new Date(fechaFin);
      condiciones.push({ date: rangoFechas });
    }

    const mensajes = await Mensaje.find({ $and: condiciones })
      .select("-__v") 
      .sort({ date: -1 });

    res.status(200).json(mensajes);
  } catch (error) {
    console.error("Error al listar mensajes:", error);
    res.status(500).json({ error: "Error al listar mensajes" });
  }
};


const sendMessageN8N = async (req, res) => {
  try {
    if (!isReady) {
      return res
        .status(503)
        .json({ error: "WhatsApp no está listo. Escanea el QR en /qr." });
    }

    const message = req.body.message || "";
    let numbers = req.body.numbers || req.body["numbers[]"] || [];
    if (!Array.isArray(numbers)) numbers = [numbers];

    // Normaliza todos los números y filtra los inválidos
    numbers = numbers.map((n) => normalizeNumber(n)).filter(Boolean);

    if (!message) {
      return res.status(400).json({ error: "Debes enviar mensaje." });
    }

    if (!numbers.length) {
      return res.status(400).json({ error: "No hay números válidos." });
    }

    const allowedTipos = ["Administrativas", "Académicas", "Extracurriculares"];
    const tipoFromReq = req.body.tipo;
    if (!allowedTipos.includes(tipoFromReq)) {
      return res.status(400).json({
        error: "El campo 'tipo' debe ser Administrativas, Académicas o Extracurriculares.",
      });
    }

    const results = [];

    // Envío concurrente a todos los números
    await Promise.all(numbers.map(async (chatId) => {
      try {
        if (message) {
          await client.sendMessage(chatId, message);
        }
        results.push({ to: chatId, sent: true });
      } catch (err) {
        console.error(`Error enviando a ${chatId}:`, err);
        results.push({ to: chatId, sent: false, error: String(err) });
      }
    }));

    const nuevoMensaje = new Mensaje({
      numbers,
      message,
      tipo: tipoFromReq,
      date: new Date(),
    });

    await nuevoMensaje.save();

    res.json({ ok: true, results });
  } catch (e) {
    console.error("Error /send-message:", e);
    res.status(500).json({ error: String(e) });
  }
};




const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Se requiere el ID del mensaje" });
    }

    const mensaje = await Mensaje.findByIdAndUpdate(
      id,
      { status: false },
      { new: true }
    );

    if (!mensaje) {
      return res.status(404).json({ error: "Mensaje no encontrado" });
    }

    res.status(200).json({ 
      ok: true, 
      message: "Mensaje eliminado correctamente",
      mensaje 
    });
  } catch (error) {
    console.error("Error al eliminar mensaje:", error);
    res.status(500).json({ error: "Error al eliminar el mensaje" });
  }
};

export { getQR, getStatus, sendMessage, listaMensajes, sendMessageN8N, deleteMessage, logoutWhatsapp };


