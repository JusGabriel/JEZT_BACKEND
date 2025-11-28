import jwt from "jsonwebtoken"
import Administrador from "../models/Administrador.js"
import Estudiante from "../models/Estudiante.js"
import Pasante from "../models/Pasante.js"

const crearTokenJWT = (id, rol) => {

    return jwt.sign({ id, rol }, process.env.JWT_SECRET, { expiresIn: "1d" })
}

const verificarTokenJWT = async (req, res, next) => {

	const { authorization } = req.headers
    if (!authorization) return res.status(401).json({ msg: "Acceso denegado: token no proporcionado" })
    try {
        const token = authorization.split(" ")[1]
        const { id, rol } = jwt.verify(token,process.env.JWT_SECRET)
        if (rol === "pasante") {
            req.pasanteBDD = await Pasante.findById(id).lean().select("-password")
            next()
        }else  if (rol === "estudiante") {
            req.estudianteBDD = await Estudiante.findById(id).lean().select("-password")
            next()
        }
        else if(rol === "administrador"){
            req.administradorBDD = await Administrador.findById(id).lean().select("-password")
            next()
        }
    } catch (error) {
        console.log(error)
        return res.status(401).json({ msg: `❌ Token inválido o expirado - ${error}` })
    }
}


export { 
    crearTokenJWT,
    verificarTokenJWT 
}

