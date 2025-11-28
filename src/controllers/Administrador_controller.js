import Administrador from "../models/Administrador.js"
import { sendMailToRecoveryPasswordAdmin, sendMailToOwner } from "../config/nodemailer.js"
import { crearTokenJWT } from "../middlewares/JWT.js"
import { subirBase64Cloudinary, subirImagenCloudinary } from "../helpers/uploadCloudinary.js"
import mongoose from "mongoose"
import { v2 as cloudinary } from 'cloudinary'
import fs from "fs-extra"
import Estudiante from "../models/Estudiante.js"
import Pasante from "../models/Pasante.js"



const recuperarPassword = async (req,res)=>{
    const {email} = req.body
    if (Object.values(req.body).includes("")) return res.status(404).json(
        {msg:"Lo sentimos, debes llenar todos los campos"}
    )
    const administradorBDD = await Administrador.findOne({email});
    if(!administradorBDD) return res.status(404).json(
        {msg:"Alerta no existe ningun administrador con esas credenciales"}
    )
    const token = administradorBDD.crearToken()
    administradorBDD.token=token
    await sendMailToRecoveryPasswordAdmin(email,token)
    await administradorBDD.save()
    res.status(200).json({
        msg:"Revisa tu correo electrónico para reestablecer tu cuenta"}
    )

}
const comprobarTokenPassword = async (req,res)=>{ 
    const {token} = req.params
    const administradorBDD = await Administrador.findOne({token})
    if(administradorBDD?.token !== token) return res.status(404).json(
        {msg:"Lo sentimos, no se puede validar la cuenta"}
    )

    await administradorBDD.save()
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
    const administradorBDD = await Administrador.findOne({token:req.params.token})
    if(administradorBDD?.token !== req.params.token) return res.status(404).json(
        {msg:"Lo sentimos, error de validacion"}
    )
    administradorBDD.token = null
    administradorBDD.password = await administradorBDD.encrypPassword(password)
    await administradorBDD.save()
    res.status(200).json({msg:"Se obtuvo una nueva contraseña para el administrado con exito"}) 
}
const login = async(req,res)=>{

    const {email,password} = req.body
    if (Object.values(req.body).includes("")) return res.status(400).json(
        {msg:"Lo sentimos, debes llenar todos los campos"}
    )
    const administradorBDD = await Administrador.findOne({email}).select("-status -__v -token -updatedAt -createdAt")

    if(!administradorBDD) return res.status(404).json(
        {msg:"Este administrador no existe"}
    )
    const verificarPassword = await administradorBDD.matchPassword(password)

    if(!verificarPassword)res.status(401).json(
        {msg:"Contraseña incorrecta"}
    )
    const {nombre,apellido,username,_id,rol} = administradorBDD
    const token = crearTokenJWT(administradorBDD._id,administradorBDD.rol)

    res.status(200).json({
        token,
        nombre,
        apellido,
        username,
        _id,
        rol,
        email:administradorBDD.email
    })

}
const perfil =(req,res)=>{
    const {token,confirmEmail,createdAt,updatedAt,__v,...datosPerfil} = req.administradorBDD
    res.status(200).json(datosPerfil)
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

    const administradorBDD = await Administrador.findById(id)
    if(!administradorBDD) return res.status(404).json(
        {msg:`Lo sentimos, no existe el administrador`}
    )
    if (administradorBDD.email != email)
    {
        const administradorBDDMail = await Administrador.findOne({email})
        if (administradorBDDMail)
        {
            return res.status(404).json(
                {msg:`Lo sentimos, el email existe ya se encuentra registrado`}
            )  
        }
    }
    administradorBDD.nombre = nombre ?? administradorBDD.nombre
    administradorBDD.apellido = apellido ?? administradorBDD.apellido
    administradorBDD.username = username ?? administradorBDD.username
    administradorBDD.email = email ?? administradorBDD.email

    if (req.files?.imagen) {
            if (administradorBDD.avatarUsuarioID) {
                await cloudinary.uploader.destroy(administradorBDD.avatarUsuarioID);
            }
    
            const { secure_url, public_id } = await cloudinary.uploader.upload(
                req.files.imagen.tempFilePath,
                { folder: 'Administrador' }
            );
    
            administradorBDD.avatarUsuario = secure_url;
            administradorBDD.avatarUsuarioID = public_id;
    
            await fs.unlink(req.files.imagen.tempFilePath);
        }

    await administradorBDD.save()
    res.status(200).json(administradorBDD)
}


const actualizarPassword = async (req,res)=>{
    const {id} = req.params
    const administradorBDD = await Administrador.findById(id)
    if(!administradorBDD) return res.status(404).json(
        {msg:`Alerta este administrador no existe`}
    )
    const{presentpassword,newpassword} = req.body
    if (Object.values(req.body).includes("")) {
        return res.status(400).json(
            { msg: "Lo sentimos, debes llenar todos los campos" }
        );
    }
    const verificarPassword = await administradorBDD.matchPassword(presentpassword)
    if(!verificarPassword) return res.status(404).json(
        {msg:"Lo sentimos, La contraseña actual no es correcta"}
    )
    administradorBDD.password = await administradorBDD.encryptPassword(newpassword)
    await administradorBDD.save()
    res.status(200).json(
        {msg:"Contraseña actualizada correctamente"}
    )
}




const baneoPasante= async (req, res) => {
    const { id} = req.params
    if (!req.administradorBDD ||req.administradorBDD.rol != "administrador") {
        return res.status(403).json(
            { msg: "Acceso denegado: solo administradores pueden banear jugadores" }
        )
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json(
            { msg: "Lo sentimos, debe ser un id válido" }
        )
    }
    const pasanteBDD = await Pasante.findById(id);
    if (!pasanteBDD) {
        return res.status(404).json(
            { msg: "Jugador no encontrado" }
        )
    }

    if(pasanteBDD.status === false){
        return res.status(404).json(
            { msg: "Este Jugador ya se encuentra Baneado por comportamiento inapropiado" }
        )
    }

    pasanteBDD.status = false;
    await pasanteBDD.save();

    res.status(200).json(
        { msg: `El jugador ${pasanteBDD.username} ha sido baneado por comportamiento inapropiado` }
    )
}

const baneoEstudiante = async (req, res) => {
    const { id} = req.params
    if (!req.administradorBDD ||req.administradorBDD.rol != "administrador") {
        return res.status(403).json(
            { msg: "Acceso denegado: solo administradores pueden banear jugadores" }
        )
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json(
            { msg: "Lo sentimos, debe ser un id válido" }
        )
    }
    const estudianteBDD = await Estudiante.findById(id);
    if (!estudianteBDD) {
        return res.status(404).json(
            { msg: "Jugador no encontrado" }
        )
    }

    if(estudianteBDD.status === false){
        return res.status(404).json(
            { msg: "Este Jugador ya se encuentra Baneado por comportamiento inapropiado" }
        )
    }

    estudianteBDD.status = false;
    await estudianteBDD.save();

    res.status(200).json(
        { msg: `El jugador ${estudianteBDD.username} ha sido baneado por comportamiento inapropiado` }
    )
}

const actualizarImagenPerfil = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ msg: "ID inválido" });
    }

    const administrador = await Administrador.findById(id);
    if (!administrador) {
        return res.status(404).json({ msg: "Estudiante no encontrado" });
    }

    try {
        // Si ya tiene imagen previa en Cloudinary, eliminarla
        if (administrador.avatarJugadorID) {
            await cloudinary.uploader.destroy(administrador.avatarJugadorID);
        }

        let secure_url, public_id;

        // Caso 1: Imagen subida como archivo
        if (req.files?.imagen) {
            const { tempFilePath } = req.files.imagen;
            ({ secure_url, public_id } = await cloudinary.uploader.upload(tempFilePath, {
                folder: "Administrador",
            }));
            await fs.unlink(tempFilePath);
            administrador.avatarUsuario = secure_url;
            administrador.avatarUsuarioID = public_id;
        }

        // Caso 2: Imagen enviada como Base64 desde IA
        else if (req.body?.avatarUsuario) {
            const base64Data = req.body.avatarUsuario.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');

            ({ secure_url, public_id } = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: "Administrador", resource_type: "auto" },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                stream.end(buffer);
            }));

            administrador.avatarUsuario = secure_url;
            administrador.avatarUsuarioID = public_id;
        } else {
            return res.status(400).json({ msg: "No se envió ninguna imagen" });
        }

        await administrador.save();

        res.status(200).json({
            msg: "Imagen actualizada correctamente",
            avatar: secure_url
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Error al subir imagen" });
    }
}


const eliminarCuentaAdministrador = async (req, res) => {
    const { id } = req.params;

    console.log("ID: ",id);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json(
            { msg: `ID inválido` }
        )
    }

    if (req.administradorBDD?._id.toString() !== id) {
        return res.status(403).json(
            { msg: "No tienes permisos para eliminar esta cuenta" }
        )
    }

    if (req.administradorBDD.avatarUsuarioID) {
        await cloudinary.uploader.destroy(req.administradorBDD.avatarUsuarioID);
    }

    await Administrador.findByIdAndDelete(id);
    res.status(200).json(
        { msg: "Tu cuenta ha sido eliminada correctamente" }
    )
}

export {
    recuperarPassword,
    comprobarTokenPassword,
    crearNuevaPassword,
    login, 
    perfil,
    actualizarPerfil,
    actualizarPassword,
    baneoEstudiante,
    baneoPasante,
    actualizarImagenPerfil,
    eliminarCuentaAdministrador
}