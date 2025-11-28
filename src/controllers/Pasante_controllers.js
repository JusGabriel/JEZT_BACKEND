import { sendMailToOwner, sendMailToRegister, sendMailToRecoveryPasswordPasante } from "../config/nodemailer.js"
import { subirBase64Cloudinary, subirImagenCloudinary } from "../helpers/uploadCloudinary.js"
import mongoose from "mongoose"
import Pasante from "../models/Pasante.js"
import { crearTokenJWT } from "../middlewares/JWT.js"
import { v2 as cloudinary } from 'cloudinary'
import fs from "fs-extra"


const registro = async(req,res)=>{

    try {
        const {email, nombre, username, numero, apellido} = req.body

        if (Object.values(req.body).includes("")) return res.status(400).json({msg:"Debes llenar todos los campos"})

        const emailExistente = await Pasante.findOne({ email });
        if (emailExistente) return res.status(400).json({ msg: "El email ya se encuentra registrado" });

        // Evitar duplicados por username antes de insertar
        if (username) {
            const usernameExistente = await Pasante.findOne({ username });
            if (usernameExistente) return res.status(400).json({ msg: "El nombre de usuario ya se encuentra registrado" });
        }

        const password = Math.random().toString(36).toUpperCase().slice(2, 5)

        const nuevoPasante = new Pasante({
            nombre,
            apellido: apellido || '',
            username,
            email,
            numero: numero || '',
            password: await Pasante.prototype.encryptPassword("pasante"+password),
            administrador: req.administradorBDD._id 
        })

        if (req.files?.imagen) {
            const { secure_url, public_id } = await subirImagenCloudinary(req.files.imagen.tempFilePath)
            nuevoPasante.avatarUsuario = secure_url
            nuevoPasante.avatarUsuarioID = public_id
        }

        if (req.body?.avatarUsuario) {
            const secure_url = await subirBase64Cloudinary(req.body.avatarUsuario)
            nuevoPasante.avatarUsuario = secure_url
        }

        await nuevoPasante.save()
        await sendMailToOwner(email,"pasante"+password)
        res.status(201).json({ msg: "Registro exitoso del pasante" })

    } catch (error) {
        console.error(error);
        const dupCode = error?.code || error?.errorResponse?.code;
        if (dupCode === 11000) {
            const key = error.keyValue ? Object.keys(error.keyValue)[0] : 'campo';
            return res.status(400).json({ msg: `Lo sentimos, el ${key} ya se encuentra registrado` });
        }
        res.status(500).json({ msg: ` Error en el servidor - ${error.message || error}` });
    }
}

const recuperarPassword = async (req,res)=>{
    const { email } = req.body

    if (!email || email.trim() === "") {
        return res.status(400).json({ msg: "Lo sentimos, debes llenar todos los campos" })
    }

    const pasanteBDD = await Pasante.findOne({ email: new RegExp(`^${email.trim()}$`, "i") })
    if(!pasanteBDD) {
        return res.status(404).json({ msg:"Lo sentimos, el usuario no se encuentra registrado" })
    }

    const token = pasanteBDD.crearToken()
    pasanteBDD.token = token
    await sendMailToRecoveryPasswordPasante(pasanteBDD.email, token)
    await pasanteBDD.save()

    res.status(200).json({ msg:"Revisa tu correo electrónico para reestablecer tu cuenta" })
}

const comprobarTokenPassword = async (req,res)=>{
    const { token } = req.params
    const pasanteBDD = await Pasante.findOne({ token })

    if(pasanteBDD?.token !== token){
        return res.status(404).json({ msg:"Lo sentimos, no se puede validar la cuenta" })
    }

    await pasanteBDD.save()
    res.status(200).json({ msg:"Token confirmado, ya puedes crear tu nuevo password" })
}

const crearNuevaPassword = async (req,res)=>{
    const { password, confirmpassword } = req.body

    if (Object.values(req.body).includes("")) {
        return res.status(404).json({ msg:"Lo sentimos, debes llenar todos los campos" })
    }

    if(password !== confirmpassword){
        return res.status(404).json({ msg:"Lo sentimos, los passwords no coinciden" })
    }

    const pasanteBDD = await Pasante.findOne({ token: req.params.token })
    if(pasanteBDD?.token !== req.params.token){
        return res.status(404).json({ msg:"Lo sentimos, no se puede validar la cuenta" })
    }

    pasanteBDD.token = null
    pasanteBDD.password = await pasanteBDD.encryptPassword(password)
    await pasanteBDD.save()

    res.status(200).json({ msg:"Felicitaciones, ya puedes iniciar sesión con tu nuevo password" })
}

const login = async(req,res)=>{

    const {email,password} = req.body
    if (Object.values(req.body).includes("")) return res.status(400).json(
        {msg:"Lo sentimos, debes llenar todos los campos"}
    )
    const pasanteBDD = await Pasante.findOne({email}).select("-__v -token -updatedAt -createdAt")

    if(pasanteBDD?.status === false){
        return res.status(403).json(
            { msg: "Tu cuenta ha sido suspendida por mal comportamiento" }
        )
    }

    if(!pasanteBDD) return res.status(404).json(
        {msg:"Usuario no registrado"}
    )
    const verificarPassword = await pasanteBDD.matchPassword(password)

    if(!verificarPassword)res.status(401).json(
        {msg:"Contraseña incorrecta"}
    )
    const {nombre,apellido,username,_id, rol} = pasanteBDD
    const token = crearTokenJWT(pasanteBDD._id,pasanteBDD.rol)

    res.status(200).json({
        token,
        rol,
        nombre,
        apellido,
        username,
        _id,
        email:pasanteBDD.email
    })

}

const perfil =(req,res)=>{
    const {token,confirmEmail,createdAt,updatedAt,__v,...datosPerfil} = req.pasanteBDD
    res.status(200).json(datosPerfil)
}

const actualizarImagenPerfil = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ msg: "ID inválido" });
    }

    const pasante = await Pasante.findById(id);
    if (!pasante) {
        return res.status(404).json({ msg: "Pasante no encontrado" });
    }

    try {
        // Si ya tiene imagen previa en Cloudinary, eliminarla
        if (pasante.avatarUsuarioID) {
            await cloudinary.uploader.destroy(pasante.avatarUsuarioID);
        }

        let secure_url, public_id;

        // Caso 1: Imagen subida como archivo
        if (req.files?.imagen) {
            const { tempFilePath } = req.files.imagen;
            ({ secure_url, public_id } = await cloudinary.uploader.upload(tempFilePath, {
                folder: "Pasantes",
            }));
            await fs.unlink(tempFilePath);
            pasante.avatarUsuario = secure_url;
            pasante.avatarUsuarioID = public_id;
        }

        // Caso 2: Imagen enviada como Base64 desde IA
        else if (req.body?.avatarUsuario) {
            const base64Data = req.body.avatarUsuario.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');

            ({ secure_url, public_id } = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: "Pasantes", resource_type: "auto" },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                stream.end(buffer);
            }));

            pasante.avatarUsuario = secure_url;
            pasante.avatarUsuarioID = public_id;
        } else {
            return res.status(400).json({ msg: "No se envió ninguna imagen" });
        }

        await pasante.save();

        res.status(200).json({
            msg: "Imagen actualizada correctamente",
            avatar: secure_url
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Error al subir imagen" });
    }
}

const actualizarPerfil = async (req,res)=>{
    const {id} = req.params
    const {nombre,apellido,username,email} = req.body
    if( !mongoose.Types.ObjectId.isValid(id) ) return res.status(404).json(
        {msg:`Lo sentimos, debe ser un id válido`}
    )
    if (Object.values(req.body).includes("")) return res.status(400).json(
        {msg:"Lo sentimos, debes llenar todos los campos"}
    )

    const pasanteBDD = await Pasante.findById(id)
    if(!pasanteBDD) return res.status(404).json(
        {msg:`Lo sentimos, no existe el Estudiante ${id}`}
    )
    if (pasanteBDD.email != email)
    {
        const pasanteBDDMail = await Pasante.findOne({email})
        if (pasanteBDDMail)
        {
            return res.status(404).json(
                {msg:`Lo sentimos, el email existe ya se encuentra registrado`}
            )  
        }
    }
    pasanteBDD.nombre = nombre ?? pasanteBDD.nombre
    pasanteBDD.apellido = apellido ?? pasanteBDD.apellido
    pasanteBDD.username = username ?? pasanteBDD.username
    pasanteBDD.email = email ?? pasanteBDD.email

    if (req.files?.imagen) {
        if (pasanteBDD.avatarUsuarioID) {
            await cloudinary.uploader.destroy(pasanteBDD.avatarUsuarioID);
        }

        const { secure_url, public_id } = await cloudinary.uploader.upload(
            req.files.imagen.tempFilePath,
            { folder: 'Estudiantes' }
        );

        pasanteBDD.avatarUsuario = secure_url;
        pasanteBDD.avatarUsuarioID = public_id;

        await fs.unlink(req.files.imagen.tempFilePath);
    }

    await pasanteBDD.save()
    res.status(200).json(pasanteBDD)
}

const actualizarPassword = async (req,res)=>{
    const {id} = req.params
    const pasanteBDD = await Pasante.findById(id)
    if(!pasanteBDD) return res.status(404).json(
        {msg:`Lo sentimos, no existe el estudiante`}
    )
    const{presentpassword,newpassword} = req.body
    if (Object.values(req.body).includes("")) {
        return res.status(400).json(
            { msg: "Lo sentimos, debes llenar todos los campos" }
        );
    }
    const verificarPassword = await pasanteBDD.matchPassword(presentpassword)
    if(!verificarPassword) return res.status(404).json(
        {msg:"Lo sentimos, La contraseña actual no es correcta"}
    )
    pasanteBDD.password = await pasanteBDD.encrypPassword(newpassword)
    await pasanteBDD.save()
    res.status(200).json(
        {msg:"Contraseña actualizada correctamente"}
    )
}

const eliminarCuentaPasante = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json(
            { msg: `ID inválido` }
        )
    }

    if (req.pasanteBDD?._id.toString() !== id) {
        return res.status(403).json(
            { msg: "No tienes permisos para eliminar esta cuenta" }
        )
    }

    if (req.pasanteBDD.avatarUsuarioID) {
        await cloudinary.uploader.destroy(req.pasanteBDD.avatarUsuarioID);
    }

    await Pasante.findByIdAndDelete(id);
    res.status(200).json(
        { msg: "Tu cuenta ha sido eliminada correctamente" }
    )
}

const listarPasantes = async (req,res)=>{
    const pasantes = await Pasante.find({status:true}).select("-salida -createdAt -updatedAt -__v")
    res.status(200).json(pasantes)
}


const detallePasante = async(req,res)=>{
    const {id} = req.params
    if( !mongoose.Types.ObjectId.isValid(id) ) return res.status(404).json(
        {msg:`Lo sentimos, no existe el pasante ${id}`}
    )
    const pasantes = await Pasante.findById(id).select("-createdAt -updatedAt -__v -password")
    res.status(200).json(pasantes)
}

export{
    login, 
    registro, 
    perfil,
    recuperarPassword,
    comprobarTokenPassword,
    crearNuevaPassword,
    actualizarImagenPerfil, 
    actualizarPerfil, 
    actualizarPassword, 
    eliminarCuentaPasante, 
    listarPasantes,
    detallePasante
}