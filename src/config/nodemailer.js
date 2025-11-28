import { Resend } from 'resend';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicializar Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Convertir logo a base64
const logoPath = path.join(__dirname, '../config/images/logo.jpg');
const logoBase64 = fs.readFileSync(logoPath).toString('base64');

// 📌 Función base para enviar correos
async function sendEmail(to, subject, html) {
    try {
        const { data, error } = await resend.emails.send({
            from: `Jezt Studio <${process.env.SENDER_EMAIL}>`,
            to,
            subject,
            html,
            attachments: [
                {
                    filename: 'logo.jpg',
                    content: logoBase64,
                    type: 'image/jpeg',
                    disposition: 'inline',
                    cid: 'logo',
                },
            ],
        });

        if (error) {
            console.error("Error enviando correo:", error);
            return;
        }

        console.log("Correo enviado:", data.id);
    } catch (err) {
        console.error("Error Resend:", err);
    }
}

//
// ===========================================================
// 1. REGISTRO
// ===========================================================
//
export const sendMailToRegister = (userMail, token) => {
    const html = `
    <div style="font-family: Arial, sans-serif; background-color: #121212; color: #ffffff; padding: 30px; border-radius: 10px;">
        <div style="text-align: center;">
            <img src="cid:logo" style="width: 120px; margin-bottom: 20px;" />
            <h1 style="color: #a0a0a0;">Bienvenido a Jezt</h1>
            <p style="font-size: 16px;">Has sido elegido para unirte a la experiencia JEZT.</p>

            <a href="${process.env.FRONTEND_URL}confirm/${token}"
                style="display:inline-block;padding:12px 25px;margin-top:20px;font-size:16px;background-color:#4b4b4b;color:#fff;text-decoration:none;border-radius:5px;">
                Confirmar Cuenta
            </a>
        </div>
        <hr style="margin:30px 0;border:0;border-top:1px solid #333;">
        <footer style="text-align:center;font-size:14px;color:#aaa;">
            Jezt Studio © 2025 — Lo divertido comienza ahora.
        </footer>
    </div>
    `;

    return sendEmail(userMail, "Bienvenido a Jezt - Confirma tu cuenta", html);
};

//
// ===========================================================
// 2. RECUPERAR CONTRASEÑA (Usuario)
// ===========================================================
//
export const sendMailToRecoveryPassword = (userMail, token) => {
    const html = `
    <div style="font-family: Arial, sans-serif; background-color: #121212; color: #ffffff; padding: 30px; border-radius: 10px;">
        <div style="text-align: center;">
            <img src="cid:logo" style="width: 100px; margin-bottom: 20px;" />
            <h1 style="color: #a0a0a0;">Reestablecer contraseña</h1>
            <p style="font-size: 16px;">Haz clic en el botón para restablecer tu contraseña:</p>

            <a href="${process.env.FRONTEND_URL}reset/${token}"
                style="display:inline-block;padding:12px 25px;margin-top:20px;font-size:16px;background-color:#4b4b4b;color:#fff;text-decoration:none;border-radius:5px;">
                Restablecer Contraseña
            </a>
        </div>
        <hr style="margin:30px 0;border-top:1px solid #333;">
        <footer style="text-align:center;font-size:14px;color:#aaa;">El equipo de Jezt Studio.</footer>
    </div>
    `;

    return sendEmail(userMail, "Restablecer contraseña", html);
};

//
// ===========================================================
// 3. RECUPERAR CONTRASEÑA (Admin)
// ===========================================================
//
export const sendMailToRecoveryPasswordAdmin = (userMail, token) => {
    const html = `
    <div style="font-family: Arial, sans-serif; background-color: #121212; color: #ffffff; padding: 30px; border-radius: 10px;">
        <div style="text-align: center;">
            <img src="cid:logo" style="width: 100px; margin-bottom: 20px;" />
            <h1 style="color: #a0a0a0;">Reestablecer contraseña (Admin)</h1>
            <p style="font-size: 16px;">Haz clic para restablecer tu contraseña:</p>

            <a href="${process.env.FRONTEND_URL}reset-admin/${token}"
                style="display:inline-block;padding:12px 25px;margin-top:20px;font-size:16px;background-color:#4b4b4b;color:#fff;text-decoration:none;border-radius:5px;">
                Restablecer Contraseña
            </a>
        </div>
        <hr style="margin:30px 0;border-top:1px solid #333;">
        <footer style="text-align:center;font-size:14px;color:#aaa;">Jezt Studio.</footer>
    </div>
    `;

    return sendEmail(userMail, "Restablecer contraseña de administrador", html);
};

//
// ===========================================================
// 4. RECUPERAR CONTRASEÑA (Pasante)
// ===========================================================
//
export const sendMailToRecoveryPasswordPasante = (userMail, token) => {
    const html = `
    <div style="font-family: Arial, sans-serif; background-color: #121212; color: #ffffff; padding: 30px; border-radius: 10px;">
        <div style="text-align: center;">
            <img src="cid:logo" style="width: 100px; margin-bottom: 20px;" />
            <h1 style="color: #a0a0a0;">Reestablecer contraseña (Pasante)</h1>
            <p style="font-size: 16px;">Haz clic para restablecer tu contraseña:</p>

            <a href="${process.env.FRONTEND_URL}reset-pasante/${token}"
                style="display:inline-block;padding:12px 25px;margin-top:20px;font-size:16px;background-color:#4b4b4b;color:#fff;text-decoration:none;border-radius:5px;">
                Restablecer Contraseña
            </a>
        </div>
        <hr style="margin:30px 0;border-top:1px solid #333;">
        <footer style="text-align:center;font-size:14px;color:#aaa;">Jezt Studio.</footer>
    </div>
    `;

    return sendEmail(userMail, "Restablecer contraseña de pasante", html);
};

//
// ===========================================================
// 5. ENVIAR CREDENCIALES OWNER
// ===========================================================
//
export const sendMailToOwner = (userMail, password) => {
    const html = `
    <div style="font-family: Arial, sans-serif; background-color: #121212; color: #ffffff; padding: 30px; border-radius: 10px;">
        <div style="text-align: center;">
            <img src="cid:logo" style="width: 100px; margin-bottom: 20px;" />
            <h1 style="color: #a0a0a0;">Bienvenido Owner</h1>
            <p style="font-size: 16px;">Estas son tus credenciales:</p>

            <p><strong>Contraseña:</strong> ${password}</p>

            <a href="${process.env.FRONTEND_URL}login"
                style="display:inline-block;padding:12px 25px;margin-top:20px;font-size:16px;background-color:#4b4b4b;color:#fff;text-decoration:none;border-radius:5px;">
                Iniciar Sesión
            </a>
        </div>
        <hr style="margin:30px 0;border-top:1px solid #333;">
        <footer style="text-align:center;font-size:14px;color:#aaa;">Jezt Studio.</footer>
    </div>
    `;

    return sendEmail(userMail, "Credenciales de acceso", html);
};

