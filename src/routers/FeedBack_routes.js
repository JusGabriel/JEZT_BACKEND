import { Router } from 'express'
import {
  createFeedback,
  getAllFeedbacks,
  getMyFeedbacks,
  getFeedback,
  updateFeedbackStatus,
  deleteFeedback,
  respondToFeedback,
  getStats,
  getFeedbacksByCategory
} from '../controllers/FeedBack_controllers.js'
import { verificarTokenJWT } from '../middlewares/JWT.js'

const router = Router()

// Rutas para estudiantes
router.post('/feedback', verificarTokenJWT, createFeedback)
router.get('/feedback/my-feedbacks', verificarTokenJWT, getMyFeedbacks)
router.get('/feedback/:id', verificarTokenJWT, getFeedback)

// Rutas para Admin y Pasante
router.get('/admin/feedback/all', verificarTokenJWT, getAllFeedbacks)
router.get('/admin/feedback/stats', verificarTokenJWT, getStats)
router.get('/admin/feedback/filter/category', verificarTokenJWT, getFeedbacksByCategory)

// Rutas exclusivas para Administrador
router.patch('/admin/feedback/:id', verificarTokenJWT, updateFeedbackStatus)
router.delete('/admin/feedback/:id', verificarTokenJWT, deleteFeedback)
router.patch('/admin/feedback/respond/:id', verificarTokenJWT, respondToFeedback)

export default router