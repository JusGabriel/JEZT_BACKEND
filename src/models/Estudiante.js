import {Schema, model} from 'mongoose'
import bcrypt from "bcryptjs"


const estudianteSchema = new Schema({
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
        required:true,
        trim:true,
        unique:true
    },
        
    email:{
        type: String,    
        unique:true,
        trim: true,
        required:true,
    },

    numero:{
        type: String,    
        unique:true,
        trim: true,
        required:false,
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
    carrera: {
        type: String,
        enum: ['TSDS','TSEM','TSASA','TSPIM','TSPA','TSRT','NONE'],
        required: true
    },
    rol:{
        type:String,
        default:"estudiante"
    },
    
    status:{
        type:Boolean,
        default:true
    },
        
    confirmEmail:{
        type:Boolean,
        default:false

  }},{
    timestamps:true
})


// Método para cifrar el password del veterinario
estudianteSchema.methods.encrypPassword = async function(password){
    const salt = await bcrypt.genSalt(10)
    const passwordEncryp = await bcrypt.hash(password,salt)
    return passwordEncryp
}


// Método para verificar si el password ingresado es el mismo de la BDD
estudianteSchema.methods.matchPassword = async function(password){
    const response = await bcrypt.compare(password,this.password)
    return response
}


// Método para crear un token 
estudianteSchema.methods.crearToken = function(){
    const tokenGenerado = this.token = Math.random().toString(36).slice(2)
    return tokenGenerado
}


export default model('Estudiante',estudianteSchema)