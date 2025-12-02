import { sendMailToRegister, sendMailToRecoveryPassword, sendMailToRecoveryPasswordAdmin, sendMailToRecoveryPasswordPasante } from "../config/nodemailer.js"
import { crearTokenJWT } from "../middlewares/JWT.js"
import mongoose from "mongoose"
import { v2 as cloudinary } from 'cloudinary'
import fs from "fs-extra"
import { Stripe } from "stripe"
import Estudiantes from "../models/Estudiante.js"
import Administrador from "../models/Administrador.js"
import Pasante from "../models/Pasante.js"
const stripe = new Stripe(`${process.env.STRIPE_PRIVATE_KEY}`)

const registro = async (req, res) => {
    try {
        const { email, password, username } = req.body;

        if (Object.values(req.body).includes(""))
            return res.status(400).json({ msg: "Lo sentimos, debes llenar todos los campos" });

        // Validar longitud mínima de la contraseña
        if (!password || password.length < 14) {
            return res.status(400).json({ msg: "La contraseña debe tener al menos 14 caracteres" });
        }

        // Validar formato de email y dominio
        const emailLower = (email || '').toString().toLowerCase();
        if (!emailLower.endsWith('@epn.edu.ec')) {
            return res.status(400).json({ msg: 'El correo debe pertenecer al dominio @epn.edu.ec' });
        }

        // Buscar email en la BD (case-insensitive)
        const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const verificarEmailBDD = await Estudiantes.findOne({ email: new RegExp(`^${escapeRegex(emailLower)}$`, 'i') });
        if (verificarEmailBDD) {
            return res.status(400).json({ msg: "Lo sentimos, el email ya se encuentra registrado" });
        }

        // Validar username (evita error de duplicate key al insertar)
        if (username) {
            const verificarUsername = await Estudiantes.findOne({ username });
            if (verificarUsername) {
                return res.status(400).json({ msg: "Lo sentimos, el nombre de usuario ya está en uso" });
            }
        }

        const nuevoEstudiante = new Estudiantes(req.body);

        if (req.files?.imagen) {
            const { secure_url, public_id } = await cloudinary.uploader.upload(req.files.imagen.tempFilePath, { folder: 'Estudiantes' });
            nuevoEstudiante.avatarUsuario = secure_url;
            nuevoEstudiante.avatarUsuarioID = public_id;
            await fs.unlink(req.files.imagen.tempFilePath);
        }

        nuevoEstudiante.password = await nuevoEstudiante.encrypPassword(password);

        const token = nuevoEstudiante.crearToken();
        await sendMailToRegister(email, token);

        await nuevoEstudiante.save();
        return res.status(200).json({ msg: "Revisa tu correo electrónico para confirmar tu cuenta" });
    } catch (err) {
        // Manejar errores de clave duplicada en MongoDB
        const dupCode = err?.code || err?.errorResponse?.code;
        if (dupCode === 11000) {
            const key = err.keyValue ? Object.keys(err.keyValue)[0] : 'campo';
            return res.status(400).json({ msg: `Lo sentimos, el ${key} ya está registrado` });
        }

        console.error('Error en registro de estudiante:', err);
        return res.status(500).json({ msg: 'Ocurrió un error en el servidor' });
    }
};

const confirmarEmail = async (req,res)=>{
    if(!(req.params.token)) 
        return res.status(400).json({msg:"Lo sentimos, no se puede validar la cuenta"
    })

    const estudianteBDD = await Estudiantes.findOne({token:req.params.token});

    if(!estudianteBDD?.token) 
        return res.status(404).json({msg:"La cuenta ya ha sido confirmada"
    })

    estudianteBDD.token = null
    estudianteBDD.confirmEmail=true

    await estudianteBDD.save()
    res.status(200).json({msg:"Token confirmado, ya puedes iniciar sesión"}) 
}

const recuperarPassword = async (req,res)=>{
    const { email, rol } = req.body

    if (!email || email.trim() === "") {
        return res.status(400).json({ msg:"Lo sentimos, debes llenar todos los campos" })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const emailFilter = { email: new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i") }

    const collections = [
        {
            rol: "estudiante",
            model: Estudiantes,
            sendMail: sendMailToRecoveryPassword,
        },
        {
            rol: "administrador",
            model: Administrador,
            sendMail: sendMailToRecoveryPasswordAdmin,
        },
        {
            rol: "pasante",
            model: Pasante,
            sendMail: sendMailToRecoveryPasswordPasante,
        },
    ]

    const orderedCollections = rol
        ? [
            ...collections.filter((item) => item.rol === rol.toLowerCase()),
            ...collections.filter((item) => item.rol !== rol.toLowerCase()),
        ]
        : collections

    for (const entry of orderedCollections) {
        const usuario = await entry.model.findOne(emailFilter)
        if (usuario) {
            const token = typeof usuario.crearToken === "function"
                ? usuario.crearToken()
                : Math.random().toString(36).slice(2)

            usuario.token = token
            await entry.sendMail(usuario.email, token)
            await usuario.save()

            return res.status(200).json({
                msg: "Revisa tu correo electrónico para reestablecer tu cuenta",
                rol: entry.rol,
            })
        }
    }

    return res.status(404).json({ msg:"Lo sentimos, el usuario no se encuentra registrado" })
}
const comprobarTokenPassword = async (req,res)=>{ 
    const {token} = req.params
    const estudianteBDD = await Estudiantes.findOne({token})
    if(estudianteBDD?.token !== token) return res.status(404).json(
        {msg:"Lo sentimos, no se puede validar la cuenta"}
    )

    await estudianteBDD.save()
    res.status(200).json(
        {msg:"Token confirmado, ya puedes crear tu nuevo password"}
    ) 
}
const crearNuevaPassword = async (req,res)=>{
    const{password,confirmpassword} = req.body
    if (Object.values(req.body).includes("")) return res.status(404).json(
        {msg:"Lo sentimos, debes llenar todos los campos"}
    )
    if(password !== confirmpassword) return res.status(404).json(
        {msg:"Lo sentimos, los passwords no coinciden"}
    )
    const estudianteBDD = await Estudiantes.findOne({token:req.params.token})
    if(estudianteBDD?.token !== req.params.token) return res.status(404).json(
        {msg:"Lo sentimos, no se puede validar la cuenta"}
    )
    estudianteBDD.token = null
    estudianteBDD.password = await estudianteBDD.encrypPassword(password)
    await estudianteBDD.save()
    res.status(200).json({msg:"Felicitaciones, ya puedes iniciar sesión con tu nuevo password"}) 
}

const login = async(req,res)=>{

    const {email,password} = req.body
    if (Object.values(req.body).includes("")) return res.status(400).json(
        {msg:"Lo sentimos, debes llenar todos los campos"}
    )
    const estudianteBDD = await Estudiantes.findOne({email}).select("-__v -token -updatedAt -createdAt")

    if(estudianteBDD?.confirmEmail === false) return res.status(401).json(
        {msg:"Lo sentimos tu cuenta aun no ha sido verificada"}
    )

    if(estudianteBDD?.status === false){
        return res.status(403).json(
            { msg: "Tu cuenta ha sido suspendida por mal comportamiento" }
        )
    }

    if(!estudianteBDD) return res.status(404).json(
        {msg:"Usuario no registrado"}
    )
    const verificarPassword = await estudianteBDD.matchPassword(password)

    if(!verificarPassword)res.status(401).json(
        {msg:"Usuario o contraseña incorrecto"}
    )
    const {nombre,apellido,username,_id, rol} = estudianteBDD
    const token = crearTokenJWT(estudianteBDD._id,estudianteBDD.rol)

    res.status(200).json({
        token,
        rol,
        nombre,
        apellido,
        username,
        _id,
        email:estudianteBDD.email
    })

}

const perfil = (req, res) => {
    const { confirmEmail, createdAt, updatedAt, __v, ...datosPerfil } = req.estudianteBDD;
    if (!datosPerfil) return res.status(401).json({ msg: "Acceso denegado" });

    res.status(200).json(datosPerfil);
};


const actualizarPerfil = async (req,res)=>{
    const {id} = req.params
    const {nombre,apellido,username,email} = req.body
    if( !mongoose.Types.ObjectId.isValid(id) ) return res.status(404).json(
        {msg:`Lo sentimos, debe ser un id válido`}
    )
    if (Object.values(req.body).includes("")) return res.status(400).json(
        {msg:"Lo sentimos, debes llenar todos los campos"}
    )

    const estudianteBDD = await Estudiantes.findById(id)
    if(!estudianteBDD) return res.status(404).json(
        {msg:`Lo sentimos, no existe el Estudiante ${id}`}
    )
    if (estudianteBDD.email != email)
    {
        const estudianteBDDMail = await Estudiantes.findOne({email})
        if (estudianteBDDMail)
        {
            return res.status(404).json(
                {msg:`Lo sentimos, el email existe ya se encuentra registrado`}
            )  
        }
    }
    estudianteBDD.nombre = nombre ?? estudianteBDD.nombre
    estudianteBDD.apellido = apellido ?? estudianteBDD.apellido
    estudianteBDD.username = username ?? estudianteBDD.username
    estudianteBDD.email = email ?? estudianteBDD.email

    if (req.files?.imagen) {
        if (estudianteBDD.avatarUsuarioID) {
            await cloudinary.uploader.destroy(estudianteBDD.avatarUsuarioID);
        }

        const { secure_url, public_id } = await cloudinary.uploader.upload(
            req.files.imagen.tempFilePath,
            { folder: 'Estudiantes' }
        );

        estudianteBDD.avatarUsuario = secure_url;
        estudianteBDD.avatarUsuarioID = public_id;

        await fs.unlink(req.files.imagen.tempFilePath);
    }

    await estudianteBDD.save()
    res.status(200).json(estudianteBDD)
}

const actualizarPassword = async (req,res)=>{
    const {id} = req.params
    const estudianteBDD = await Estudiantes.findById(id)
    if(!estudianteBDD) return res.status(404).json(
        {msg:`Lo sentimos, no existe el estudiante`}
    )
    const{presentpassword,newpassword} = req.body
    if (Object.values(req.body).includes("")) {
        return res.status(400).json(
            { msg: "Lo sentimos, debes llenar todos los campos" }
        );
    }
    const verificarPassword = await estudianteBDD.matchPassword(presentpassword)
    if(!verificarPassword) return res.status(404).json(
        {msg:"Lo sentimos, La contraseña actual no es correcta"}
    )
    estudianteBDD.password = await estudianteBDD.encrypPassword(newpassword)
    await estudianteBDD.save()
    res.status(200).json(
        {msg:"Contraseña actualizada correctamente"}
    )
}
const listarEstudiantes = async (req, res) => {
  try {
    const { carrera } = req.query;
const filtro = carrera && carrera !== "Todos" ? { carrera } : {};


    const estudiantes = await Estudiantes.find(filtro)
      .select("nombre apellido username email numero carrera status _id")
      .sort({ carrera: 1, nombre: 1 });

    res.status(200).json(estudiantes);
  } catch (error) {
    console.error("Error al listar estudiantes:", error);
    res.status(500).json({ msg: "Error al listar estudiantes" });
  }
};



const eliminarCuentaEstudiante = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json(
            { msg: `ID inválido` }
        )
    }

    if (req.estudianteBDD?._id.toString() !== id) {
        return res.status(403).json(
            { msg: "No tienes permisos para eliminar esta cuenta" }
        )
    }

    if (req.estudianteBDD.avatarUsuarioID) {
        await cloudinary.uploader.destroy(req.estudianteBDD.avatarUsuarioID);
    }

    await Estudiantes.findByIdAndDelete(id);
    res.status(200).json(
        { msg: "Tu cuenta ha sido eliminada correctamente" }
    )
}

const donarEstudiante = async (req, res) => {
    const { paymentMethodId, cantidad, motivo } = req.body;

    if (!paymentMethodId || !cantidad || cantidad <= 1) {
        return res.status(400).json(
            { msg: "Datos incompletos o inválidos" }
        )
    }

    try {
        const estudiante = req.estudianteBDD;
        if (!estudiante) return res.status(401).json(
            { msg: "No autorizado" }
        )

        let [cliente] = (
        await stripe.customers.list({ email: estudiante.email, limit: 1 })
        ).data || []

        if (!cliente) {
        cliente = await stripe.customers.create({
            name: `${estudiante.nombre} ${estudiante.apellido}`,
            email: estudiante.email,
        });
        }

        const pago = await stripe.paymentIntents.create({
            amount: cantidad, 
            currency: "usd",
            description: motivo || "Donación al sistema",
            payment_method: paymentMethodId,
            confirm: true,
            customer: cliente.id,
            automatic_payment_methods: {
                enabled: true,
                allow_redirects: "never",
            }
        })

        if (pago.status === "succeeded") {
            return res.status(200).json(
                { msg: "¡Gracias por tu donación!" }
            )
        } else {
            return res.status(400).json(
                { msg: "No se pudo procesar el pago" }
            )
        }
    } catch (error) {
        console.error("Error de Stripe:", error.message)
        return res.status(500).json(
            { msg: "Error al procesar la donación" }
        )
    }
}

const actualizarImagenPerfil = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ msg: "ID inválido" });
    }

    const estudiante = await Estudiantes.findById(id);
    if (!estudiante) {
        return res.status(404).json({ msg: "Estudiante no encontrado" });
    }

    try {
        // Si ya tiene imagen previa en Cloudinary, eliminarla
        if (estudiante.avatarJugadorID) {
            await cloudinary.uploader.destroy(estudiante.avatarJugadorID);
        }

        let secure_url, public_id;

        // Caso 1: Imagen subida como archivo
        if (req.files?.imagen) {
            const { tempFilePath } = req.files.imagen;
            ({ secure_url, public_id } = await cloudinary.uploader.upload(tempFilePath, {
                folder: "Estudiantes",
            }));
            await fs.unlink(tempFilePath);
            estudiante.avatarUsuario = secure_url;
            estudiante.avatarUsuarioID = public_id;
        }

        // Caso 2: Imagen enviada como Base64 desde IA
        else if (req.body?.avatarUsuario) {
            const base64Data = req.body.avatarUsuario.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');

            ({ secure_url, public_id } = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: "Estudiantes", resource_type: "auto" },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                stream.end(buffer);
            }));

            estudiante.avatarUsuario = secure_url;
            estudiante.avatarUsuarioID = public_id;
        } else {
            return res.status(400).json({ msg: "No se envió ninguna imagen" });
        }

        await estudiante.save();

        res.status(200).json({
            msg: "Imagen actualizada correctamente",
            avatar: secure_url
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Error al subir imagen" });
    }
}




const detalleEstudiante = async(req,res)=>{
    const {id} = req.params
    if( !mongoose.Types.ObjectId.isValid(id) ) return res.status(404).json(
        {msg:`Lo sentimos, no existe el jugador ${id}`}
    )
    const estudiantes = await Estudiantes.findById(id).select("-createdAt -updatedAt -__v -password")
    res.status(200).json(estudiantes)
}
export {
    registro,
    confirmarEmail,
    recuperarPassword,
    comprobarTokenPassword,
    crearNuevaPassword,
    login,
    perfil,
    actualizarPerfil,
    actualizarPassword,
    eliminarCuentaEstudiante,
    donarEstudiante, 
    actualizarImagenPerfil, 
    detalleEstudiante,
    listarEstudiantes

}
