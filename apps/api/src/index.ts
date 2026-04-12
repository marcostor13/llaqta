import express, { Request, Response } from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || '';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Ticket Schema
const ticketSchema = new mongoose.Schema({
  dni: { type: String, required: true },
  email: { type: String, required: true },
  fullName: { type: String, required: true },
  type: { type: String, enum: ['NACACHO', 'LLAMICHU'], required: true },
  price: { type: Number, required: true },
  phone: { type: String, required: true },
  status: { type: String, enum: ['pending', 'verification', 'paid'], default: 'pending' },
  qrToken: { type: String, unique: true, sparse: true },
  qrDataUrl: { type: String },
  isValidated: { type: Boolean, default: false },
  validatedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const Ticket = mongoose.model('Ticket', ticketSchema);

// Email Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.USER_EMAIL,
    pass: process.env.PASSWORD_EMAIL
  }
});

const router = express.Router();

// 1. Purchase Request
router.post('/tickets/purchase', async (req: Request, res: Response) => {
  try {
    const { dni, email, fullName, type, price, phone } = req.body;
    
    const ticket = new Ticket({
      dni,
      email,
      fullName,
      phone,
      type,
      price,
      status: 'pending'
    });

    await ticket.save();
    res.status(201).json(ticket);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. User notifies payment (Yape flow)
router.post('/tickets/confirm', async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.body;
    
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    ticket.status = 'verification';
    await ticket.save();

    res.json({ message: 'Solicitud de verificación enviada', ticket });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2b. Admin Approves Payment & Sends Email
router.post('/backoffice/approve-payment', async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.body;
    
    const ticket = await Ticket.findById(ticketId);
    if (!ticket || ticket.status !== 'verification') {
      return res.status(400).json({ error: 'Ticket no válido para aprobación' });
    }

    const qrToken = `LLAQTA-${ticket.dni}-${uuidv4().substring(0, 8)}`;
    const qrDataUrl = await QRCode.toDataURL(qrToken);
    
    ticket.status = 'paid';
    ticket.qrToken = qrToken;
    ticket.qrDataUrl = qrDataUrl;
    await ticket.save();

    // Send Real Email with Premium Design
    const mailOptions = {
      from: `"Llaqta Fest" <${process.env.USER_EMAIL}>`,
      to: ticket.email,
      subject: `🎪 ¡Tu entrada para LLAQTA FEST está lista! - ${ticket.type}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            .container { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.1); border: 1px solid #f0f0f0; }
            .header { background: #462211; padding: 40px; text-align: center; color: white; }
            .content { padding: 40px; color: #1a0f0a; line-height: 1.6; }
            .ticket-box { background: #fdf6e3; border: 2px dashed #607d3b; border-radius: 20px; padding: 30px; text-align: center; margin: 30px 0; }
            .qr-code { width: 220px; height: 220px; margin: 25px auto; padding: 10px; background: white; border-radius: 12px; }
            .badge { display: inline-block; padding: 6px 12px; background: #f2d25c; color: #462211; border-radius: 30px; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
            .footer { background: #f9f9f9; padding: 30px; text-align: center; color: #999; font-size: 11px; }
            .button { display: inline-block; padding: 14px 30px; background: #607d3b; color: white; text-decoration: none; border-radius: 50px; font-weight: bold; margin-top: 20px; }
            h1 { margin: 10px 0; font-size: 28px; }
            .details { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-top: 30px; text-align: left; background: #fff; padding: 20px; border-radius: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="badge">Pago Confirmado</div>
              <h1>¡Nos vemos en Llaqta Fest!</h1>
              <p style="opacity: 0.8; font-size: 14px;">Salón y Eventos Centenario - Puquio 2026</p>
            </div>
            <div class="content">
              <p>Hola <strong>${ticket.fullName}</strong>,</p>
              <p>Tu pago ha sido validado con éxito por nuestro equipo. Adjuntamos tu pase digital único para el festival más esperado del año.</p>
              
              <div class="ticket-box">
                <div class="badge">Zona ${ticket.type}</div>
                <div class="qr-code">
                  <img src="cid:qrcode" width="200" height="200" alt="Código QR">
                </div>
                <p style="font-family: monospace; font-size: 18px; font-weight: bold; color: #462211; letter-spacing: 2px; margin: 0;">${qrToken}</p>
                <p style="font-size: 11px; color: #888; margin-top: 5px;">TOKEN DE SEGURIDAD</p>
              </div>

              <div class="details">
                <div>
                  <p style="margin:0; font-size: 10px; color: #aaa; text-transform: uppercase;">Invitado</p>
                  <p style="margin:0; font-weight: bold;">${ticket.fullName}</p>
                  <p style="margin:0; font-size: 12px;">DNI: ${ticket.dni}</p>
                  <p style="margin:0; font-size: 12px;">TEL: ${ticket.phone}</p>
                </div>
                <div>
                  <p style="margin:0; font-size: 10px; color: #aaa; text-transform: uppercase;">Ubicación</p>
                  <p style="margin:0; font-weight: bold;">Puquio, Ayacucho</p>
                  <p style="margin:0; font-size: 12px;">Mayo 16, 2026 - 7:00 PM</p>
                </div>
              </div>
            </div>
            <div class="footer">
              <p>Este ticket es personal e intransferible. Debe ser presentado en formato digital o impreso al ingresar.<br>© 2026 Llaqta Fest - Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: 'ticket-qr.png',
          path: qrDataUrl,
          cid: 'qrcode'
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    console.log(`[EXITO] Pago aprobado y Email enviado a ${ticket.email}`);

    res.json({ message: 'Pago aprobado y ticket enviado', ticket });
  } catch (error: any) {
    console.error('Error en aprobación:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Validate QR (Backoffice)
router.post('/tickets/validate', async (req: Request, res: Response) => {
  try {
    const { qrToken } = req.body;
    
    const ticket = await Ticket.findOne({ qrToken });
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'QR no válido o no existe' });
    }

    if (ticket.isValidated) {
      return res.status(400).json({ 
        success: false, 
        message: 'Esta entrada ya fue validada anteriormente',
        dni: ticket.dni,
        validatedAt: ticket.validatedAt
      });
    }

    ticket.isValidated = true;
    ticket.validatedAt = new Date();
    await ticket.save();

    res.json({
      success: true,
      message: 'Entrada validada correctamente',
      dni: ticket.dni,
      fullName: ticket.fullName,
      type: ticket.type
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Backoffice Stats
router.get('/backoffice/stats', async (req: Request, res: Response) => {
  try {
    const totalSales = await Ticket.countDocuments({ status: 'paid' });
    const pendingVerification = await Ticket.countDocuments({ status: 'verification' });
    const validatedCount = await Ticket.countDocuments({ isValidated: true });
    
    const recentSales = await Ticket.find({ status: 'paid' }).sort({ createdAt: -1 }).limit(10);
    const verificationNeeded = await Ticket.find({ status: 'verification' }).sort({ createdAt: -1 });

    res.json({
      totalSales,
      validatedCount,
      pendingVerification,
      pendingValidation: totalSales - validatedCount,
      recentSales,
      verificationNeeded
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Delete Ticket (Backoffice)
router.delete('/backoffice/tickets/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Ticket.findByIdAndDelete(id);
    res.json({ message: 'Ticket eliminado correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/info', (req: Request, res: Response) => {
  res.json({ app: 'Llaqta API - Production Ready', db: 'MongoDB' });
});

app.use('/.netlify/functions/index', router);
app.use('/api', router);

export const handler = serverless(app);

if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`API running at http://localhost:${port}`));
}
