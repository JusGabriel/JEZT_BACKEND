import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
    studentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Estudiante'
    },
    
    studentName: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    category: {
        type: String,
        enum: ['Queja', 'Sugerencia'],
        required: true
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Pendiente', 'Respondido'],
        default: 'Pendiente'
    },
    response: {
        text: String,
        respondedBy: String,
        responseDate: Date
    }
}, {
  timestamps: true
});

export default mongoose.model('FeedBack', feedbackSchema);