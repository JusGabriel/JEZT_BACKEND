import express from "express"; //framework
import dotenv from "dotenv";
import cors from "cors"; //sirve para conectar el backend y frontend con codigo de area
import routerEstudiante from './routers/Estudiante_routes.js'
import routerAdministrador from './routers/Administrador_routes.js'
import routerPasante from './routers/Pasante_routes.js'
import routerWhats from './routers/Whats_routes.js'
import cloudinary from 'cloudinary'
import fileUpload from "express-fileupload"
import http from "http"
import {Server} from "socket.io"
import conversacionesRoutes from "./routers/Conversaciones_routes.js";
import feedbackRoutes from './routers/FeedBack_routes.js';
import Mensaje from './models/Mensaje.js';



//Inicializaciones
const app = express()
dotenv.config()

// Session and passport removed — backend runs without Google auth/passport


//app.set('port', process.env.CLOUDINARY || 3000) //process es paara datos sensibles
const corsOptions = {
  origin: "process.env.FRONTEND_URL",
  methods: ["GET", "POST", "PUT", "DELETE",'PATCH', "OPTIONS"],
  credentials: true,
};

//cloudinary para la base de datos
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})
app.use(cors(corsOptions));

app.use(fileUpload({
    useTempFiles : true,
    tempFileDir : './uploads'
}))

app.use(express.json()); //guarda la informacion del frontend en un archivo json para procesar el backend
app.use(express.urlencoded({ extended: true }));

//Configuraciones
app.set('port', process.env.PORT || 3000) 

// Rutas 
app.get('/',(req,res)=>{
    res.send("Server on")
})

// Rutas para mensajes
app.use(routerWhats);


//Rutas para administradores
app.use(routerAdministrador)

// Rutas para estudiantes
app.use(routerEstudiante)

// Rutas para pasantes
app.use(routerPasante)

// Rutas para conversaciones
app.use(conversacionesRoutes);

// Rutas para quejas o sugerencias
app.use(feedbackRoutes);





const server = http.createServer(app);

const io = new Server(server, {
  cors: corsOptions,
});

// Generar nombre único para la sala
function getRoomName(u1, u2) {
  return [u1, u2].sort().join("_");
}

// Socket.IO
io.on("connection", (socket) => {
  console.log("Usuario conectado:", socket.id);

  socket.on("joinRoom", (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} se unió a la sala ${room}`);
  });

  socket.on("sendMessage", async (data) => {
    const nuevoMensaje = new Mensaje({
      remitenteId: data.remitenteId,
      destinatarioId: data.destinatarioId,
      mensaje: data.mensaje,
    });

    await nuevoMensaje.save();

    const room = getRoomName(data.remitenteId, data.destinatarioId);
    io.to(room).emit("receiveMessage", nuevoMensaje);
  });

  socket.on("disconnect", () => {
    console.log("Usuario desconectado:", socket.id);
  });
});

// Manejo de una ruta que no sea encontrada
app.use((req,res)=>res.status(404).send("Endpoint no encontrado - 404"))

//Exportar la instancia
export  { app, server, io }

