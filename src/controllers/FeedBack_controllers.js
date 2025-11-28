import { response } from 'express';
import Feedback from '../models/FeedBack.js';

// Crear nuevo feedback (Solo Estudiante)
const createFeedback = async (req, res) => {
  try {
    // Solo estudiantes pueden crear feedbacks
    if (!req.estudianteBDD.rol) {
      return res.status(403).json({
        status: 'error',
        message: 'Solo los estudiantes pueden crear feedbacks'
      });
    }

    const feedbackData = {
      ...req.body,
      studentId: req.estudianteBDD._id,
      studentName: req.estudianteBDD.nombre
    };

    const feedback = await Feedback.create(feedbackData);
    
    res.status(201).json({
      status: 'success',
      data:  feedback 
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtener todos los feedbacks (Admin y Pasante)
const getAllFeedbacks = async (req, res) => {


  try {
    // Solo Admin y Pasante pueden ver todos los feedbacks
    if (!req.administradorBDD && !req.pasanteBDD) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permiso para ver todos los feedbacks'
      });
    }

    const feedbacks = await Feedback.find()
      .populate('studentId', 'name email')
      .sort({ createdAt: -1 });

      
      
      
    res.status(200).json({
      status: 'success',
      results: feedbacks.length,
      data:  feedbacks 
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtener feedbacks del estudiante logueado (Solo para Estudiante)
const getMyFeedbacks = async (req, res) => {
  try {
    // Solo estudiantes pueden ver sus propios feedbacks
    if (!req.estudianteBDD) {
      return res.status(403).json({
        status: 'error',
        message: 'Solo los estudiantes pueden ver sus propios feedbacks'
      });
    }

    const feedbacks = await Feedback.find({ studentId: req.estudianteBDD._id})
      .sort({ createdAt: -1 });
      

    res.status(200).json({
      status: 'success',
      results: feedbacks.length,
      data: { feedbacks }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtener feedback por ID (con permisos según rol)
const getFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id)
      .populate('studentId', 'name email');

    if (!feedback) {
      return res.status(404).json({
        status: 'error',
        message: 'Feedback no encontrado'
      });
    }

    // Verificar permisos según rol
    if (req.estudianteBDD.rol) {
      // Estudiante solo puede ver sus propios feedbacks
      if (feedback.studentId._id.toString() !== req.estudianteBDD._id.toString()) {
        return res.status(403).json({
          status: 'error',
          message: 'No tienes permiso para ver este feedback'
        });
      }
    }
    // Admin y Pasante pueden ver cualquier feedback sin restricción

    res.status(200).json({
      status: 'success',
      data: { feedback }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Responder a un feedback (Solo Administrador)
const respondToFeedback = async (req, res) => {
  try {
    // Solo Administrador puede responder
    if (!req.administradorBDD.rol) {
      return res.status(403).json({
        status: 'error',
        message: 'Solo los administradores pueden responder a los feedbacks'
      });
    }

    const { responseText } = req.body;
    
    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          'response.text': responseText,
          'response.respondedBy': req.administradorBDD.name,
          'response.responseDate': new Date(),
          status: 'Respondido'
        }
      },
      { new: true, runValidators: true }
    ).populate('studentId', 'name email');

    if (!feedback) {
      return res.status(404).json({
        status: 'error',
        message: 'Feedback no encontrado'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { feedback }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Actualizar estado (Solo Administrador)
const updateFeedbackStatus = async (req, res) => {
  try {
    // Solo Administrador puede cambiar estados
    if (!req.administradorBDD) {
      return res.status(403).json({
        status: 'error',
        message: 'Solo los administradores pueden cambiar el estado'
      });
    }

    const { status } = req.body;
    
    if (!['Pendiente', 'Respondido'].includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Estado no válido. Solo se permiten: Pendiente, Respondido'
      });
    }
    
    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('studentId', 'name email');

    if (!feedback) {
      return res.status(404).json({
        status: 'error',
        message: 'Feedback no encontrado'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { feedback }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Eliminar feedback (Solo Administrador)
const deleteFeedback = async (req, res) => {
  try {
    // Solo Administrador puede eliminar
    if (!req.administradorBDD) {
      return res.status(403).json({
        status: 'error',
        message: 'Solo los administradores pueden eliminar feedbacks'
      });
    }

    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    
    if (!feedback) {
      return res.status(404).json({
        status: 'error',
        message: 'Feedback no encontrado'
      });
    }
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtener estadísticas (Admin y Pasante)
const getStats = async (req, res) => {
  try {
    // Solo Admin y Pasante pueden ver estadísticas
    if (!req.administradorBDD && !req.pasanteBDD) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permiso para ver las estadísticas'
      });
    }

    const [total, pendientes, respondidas, quejas, sugerencias] = await Promise.all([
      Feedback.countDocuments(),
      Feedback.countDocuments({ status: 'Pendiente' }),
      Feedback.countDocuments({ status: 'Respondido' }),
      Feedback.countDocuments({ category: 'Queja' }),
      Feedback.countDocuments({ category: 'Sugerencia' })
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        total,
        pendientes,
        respondidas,
        quejas,
        sugerencias
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Filtrar feedbacks por categoría (Quejas o Sugerencias)
const getFeedbacksByCategory = async (req, res) => {
  try {
    const { category } = req.query;
    
    // Validar que la categoría sea válida
    if (category && !['Queja', 'Sugerencia'].includes(category)) {
      return res.status(400).json({
        status: 'error',
        message: 'Categoría no válida. Solo se permiten: Queja, Sugerencia'
      });
    }

    let filter = {};
    
    // Aplicar filtro de categoría si se proporciona
    if (category) {
      filter.category = category;
    }

    // Aplicar restricciones según el rol
    if (req.estudianteBDD) {
      // Estudiante solo ve sus propios feedbacks filtrados por categoría
      filter.studentId = req.estudianteBDD._id;
    }
    // Admin y Pasante ven todos los feedbacks (con o sin filtro de categoría)

    const feedbacks = await Feedback.find(filter)
      .populate('studentId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: feedbacks.length,
      data: { feedbacks }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};
 
export {

     createFeedback,
     getAllFeedbacks,
     getMyFeedbacks,
     getFeedback,
     respondToFeedback,
     updateFeedbackStatus,
     deleteFeedback,
     getStats,
     getFeedbacksByCategory
 };