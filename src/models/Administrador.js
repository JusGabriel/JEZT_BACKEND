import {Schema,model} from 'mongoose'
import bcrypt from "bcryptjs"

const administradorSchema = new Schema({

    nombre:{
        type:String,
        required:true,
        trim:true
    },
    apellido:{
        type:String,
        required:false,
        trim:true
    },
    username:{
        type: String,
        required:false,
        trim:true
    },
        
    email:{
        type: String,    
        unique:true,
        trim: true
    },
    
    password:{
        type:String,
        required: true,
        trim: true
    },
    
    avatarUsuario:{
        type:String,
        trim:true
    },

    avatarUsuarioID:{
        type:String,
        trim:true
    },
        
    token:{
        type:String,
        default:null
    },

    rol:{
        type:String,
        default:"administrador"
    },
    
    status:{
        type:Boolean,
        default:true
    },
        
    confirmEmail:{
        type:Boolean,
        default:false
    },

},{
    timestamps:true
})


// Método para cifrar el password
administradorSchema.methods.encryptPassword = async function(password){
    const salt = await bcrypt.genSalt(10)
    return bcrypt.hash(password, salt)
}


// Método para verificar si el password es el mismo de la BDD
administradorSchema.methods.matchPassword = async function(password){
    return bcrypt.compare(password, this.password)
}


// Método para crear un token de recuperación
administradorSchema.methods.crearToken = function(){
    const tokenGenerado = Math.random().toString(36).slice(2)
    this.token = tokenGenerado
    return tokenGenerado
}


export default model('Administrador',administradorSchema)