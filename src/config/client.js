import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;

import qrcode from "qrcode";

let lastQR = null;
let isReady = false;

const client = new Client({
  authStrategy: new LocalAuth({ clientId: "default" }),
  puppeteer: { headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] }
});

client.on("qr", async (qr) => {
  lastQR = await qrcode.toDataURL(qr);
  isReady = false;
  console.log("Escanea el QR en /qr");
});

client.on("ready", () => {
  isReady = true;
  console.log(" WhatsApp listo");
});

client.on("auth_failure", (m) => {
  isReady = false;
  console.error("Falló la autenticación:", m);
});

client.on("disconnected", (r) => {
  isReady = false;
  console.warn("Desconectado:", r);
  client.initialize();
});

client.initialize();

export { client, lastQR, isReady };
