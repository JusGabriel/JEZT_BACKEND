import { Schema, model } from "mongoose";

const ConversacionSchema = new Schema(
  {
    usuarioId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    usuarioTipo: {
      type: String, 
      required: true,
      enum: ["administrador", "estudiante", "pasante"],
    },
    pregunta: [{ 
      type: String, 
      default: [] 
    }],
    respuesta: [{ 
      type: String, 
      default: [] 
    }],
  },
  { timestamps: true }
);

export default model("Conversacion", ConversacionSchema);
