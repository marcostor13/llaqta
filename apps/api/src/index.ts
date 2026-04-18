import express, { Request, Response } from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Load environment variables (local dev only — production uses Netlify env vars)
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection — reuse across warm invocations
const MONGODB_URI = process.env.MONGODB_URI || '';
let isConnected = false;

async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000, socketTimeoutMS: 45000 });
  isConnected = true;
  console.log('Connected to MongoDB');
}

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

// PDF Ticket Generator
async function generateTicketPDF(ticket: any, qrDataUrl: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const W = page.getWidth();
  const H = page.getHeight();

  const helvetica     = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const courierBold   = await pdfDoc.embedFont(StandardFonts.CourierBold);

  const brown     = rgb(0.275, 0.133, 0.067);
  const darkBrown = rgb(0.227, 0.106, 0.051);
  const green     = rgb(0.376, 0.490, 0.231);
  const darkGreen = rgb(0.306, 0.408, 0.188);
  const gold      = rgb(0.949, 0.824, 0.361);
  const cream     = rgb(0.992, 0.965, 0.890);
  const dark      = rgb(0.102, 0.059, 0.039);
  const white     = rgb(1, 1, 1);
  const lightGray = rgb(0.816, 0.784, 0.722);
  const gray      = rgb(0.6, 0.6, 0.6);
  const lightText = rgb(0.733, 0.733, 0.733);

  // Convert PDFKit top-origin y to pdf-lib bottom-origin y
  const py = (y: number, h = 0) => H - y - h;

  // Header band
  page.drawRectangle({ x: 0, y: py(0, 195), width: W, height: 195, color: brown });
  page.drawRectangle({ x: 0, y: py(185, 10), width: W, height: 10, color: darkBrown });

  const label1 = 'ENTRADA OFICIAL';
  page.drawText(label1, {
    x: (W - helveticaBold.widthOfTextAtSize(label1, 9)) / 2,
    y: py(38, 9), font: helveticaBold, size: 9, color: gold, charSpacing: 3,
  });
  const title = 'LLAQTA FEST';
  page.drawText(title, {
    x: (W - helveticaBold.widthOfTextAtSize(title, 48)) / 2,
    y: py(55, 48), font: helveticaBold, size: 48, color: white, charSpacing: 1,
  });
  const subtitle = '16 de Mayo, 2026  ·  Salon y Eventos Centenario  ·  Puquio, Ayacucho';
  page.drawText(subtitle, {
    x: (W - helvetica.widthOfTextAtSize(subtitle, 11)) / 2,
    y: py(118, 11), font: helvetica, size: 11, color: rgb(0.8, 0.8, 0.8),
  });

  // Zone badge
  const badgeW = 200;
  const badgeX = (W - badgeW) / 2;
  page.drawRectangle({ x: badgeX, y: py(212, 38), width: badgeW, height: 38, color: gold });
  const zoneLabel = `ZONA ${ticket.type}`;
  page.drawText(zoneLabel, {
    x: badgeX + (badgeW - helveticaBold.widthOfTextAtSize(zoneLabel, 14)) / 2,
    y: py(224, 14), font: helveticaBold, size: 14, color: brown, charSpacing: 2,
  });

  // QR card
  const qrSize = 185;
  const qrX = (W - qrSize) / 2;
  const qrY = 270;
  page.drawRectangle({
    x: qrX - 14, y: py(qrY - 14, qrSize + 28), width: qrSize + 28, height: qrSize + 28,
    color: white, borderColor: rgb(0.933, 0.933, 0.933), borderWidth: 1,
  });
  const qrBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
  const qrImage = await pdfDoc.embedPng(qrBuffer);
  page.drawImage(qrImage, { x: qrX, y: py(qrY, qrSize), width: qrSize, height: qrSize });

  // Token & security label
  page.drawText(ticket.qrToken, {
    x: (W - courierBold.widthOfTextAtSize(ticket.qrToken, 11)) / 2,
    y: py(qrY + qrSize + 22, 11), font: courierBold, size: 11, color: dark,
  });
  const secLabel = 'CODIGO DE SEGURIDAD - NO COMPARTIR';
  page.drawText(secLabel, {
    x: (W - helvetica.widthOfTextAtSize(secLabel, 7.5)) / 2,
    y: py(qrY + qrSize + 40, 7.5), font: helvetica, size: 7.5, color: lightText, charSpacing: 1,
  });

  // Separator line
  const sepY = qrY + qrSize + 68;
  page.drawLine({ start: { x: 50, y: py(sepY) }, end: { x: W - 50, y: py(sepY) }, thickness: 1, color: lightGray });

  // Info card
  const infoY = sepY + 18;
  page.drawRectangle({ x: 40, y: py(infoY, 195), width: W - 80, height: 195, color: cream });

  const drawField = (x: number, y: number, label: string, value: string) => {
    page.drawText(label, { x, y: py(y, 7.5), font: helvetica, size: 7.5, color: gray, charSpacing: 0.8 });
    page.drawText(value, { x, y: py(y + 12, 12), font: helveticaBold, size: 12, color: dark });
  };

  const c1 = 70, c2 = 330;
  drawField(c1, infoY + 18, 'NOMBRE COMPLETO', ticket.fullName);
  drawField(c2, infoY + 18, 'DNI', ticket.dni);
  drawField(c1, infoY + 72, 'TELEFONO / YAPE', ticket.phone);
  drawField(c2, infoY + 72, 'CORREO ELECTRONICO', ticket.email);
  const fecha = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(ticket.createdAt));
  drawField(c1, infoY + 130, 'FECHA DE COMPRA', fecha);
  drawField(c2, infoY + 130, 'PRECIO PAGADO', `S/ ${ticket.price}`);

  // Footer
  const footerY = 745;
  page.drawRectangle({ x: 0, y: py(footerY, 97), width: W, height: 97, color: green });
  page.drawRectangle({ x: 0, y: py(footerY, 5), width: W, height: 5, color: darkGreen });

  const footer1 = 'Este ticket es personal e intransferible';
  page.drawText(footer1, {
    x: (W - helveticaBold.widthOfTextAtSize(footer1, 11)) / 2,
    y: py(footerY + 18, 11), font: helveticaBold, size: 11, color: white,
  });
  const footer2 = 'Presentalo en formato digital o impreso al ingresar al evento';
  page.drawText(footer2, {
    x: (W - helvetica.widthOfTextAtSize(footer2, 8.5)) / 2,
    y: py(footerY + 37, 8.5), font: helvetica, size: 8.5, color: rgb(0.9, 0.9, 0.9),
  });
  const footer3 = '© 2026 Llaqta Fest — Todos los derechos reservados — llaqtafest.netlify.app';
  page.drawText(footer3, {
    x: (W - helvetica.widthOfTextAtSize(footer3, 7.5)) / 2,
    y: py(footerY + 62, 7.5), font: helvetica, size: 7.5, color: rgb(0.75, 0.75, 0.75),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

const router = express.Router();

// 1. Purchase Request
router.post('/tickets/purchase', async (req: Request, res: Response) => {
  try {
    await connectDB();
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
    await connectDB();
    const { ticketId } = req.body;
    
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    ticket.status = 'verification';
    await ticket.save();

    // Notify admin of new payment pending verification
    const adminMailOptions = {
      from: `"Llaqta Fest" <${process.env.USER_EMAIL}>`,
      to: 'produccionesllaqta@gmail.com',
      subject: `💰 Nueva compra pendiente de verificación - ${ticket.fullName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
            .header { background: #462211; padding: 30px; text-align: center; color: white; }
            .content { padding: 30px; color: #1a0f0a; line-height: 1.7; }
            .info-box { background: #fdf6e3; border-left: 4px solid #607d3b; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0e8d0; }
            .info-row:last-child { border-bottom: none; }
            .label { color: #888; font-size: 13px; }
            .value { font-weight: bold; color: #462211; }
            .button { display: block; width: fit-content; margin: 25px auto 0; padding: 14px 35px; background: #607d3b; color: white; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 15px; }
            .footer { background: #f9f9f9; padding: 20px; text-align: center; color: #aaa; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin:0; font-size: 22px;">Nueva compra para validar</h2>
              <p style="margin: 8px 0 0; opacity: 0.8; font-size: 13px;">Un comprador reportó su pago y espera verificación</p>
            </div>
            <div class="content">
              <div class="info-box">
                <div class="info-row"><span class="label">Nombre</span><span class="value">${ticket.fullName}</span></div>
                <div class="info-row"><span class="label">DNI</span><span class="value">${ticket.dni}</span></div>
                <div class="info-row"><span class="label">Email</span><span class="value">${ticket.email}</span></div>
                <div class="info-row"><span class="label">Teléfono</span><span class="value">${ticket.phone}</span></div>
                <div class="info-row"><span class="label">Tipo de entrada</span><span class="value">${ticket.type}</span></div>
                <div class="info-row"><span class="label">Precio</span><span class="value">S/ ${ticket.price}</span></div>
                <div class="info-row"><span class="label">ID del ticket</span><span class="value" style="font-size: 11px; font-family: monospace;">${ticket._id}</span></div>
              </div>
              <p style="text-align: center; color: #666; font-size: 14px;">Ingresa al panel de administración para aprobar o rechazar este pago:</p>
              <a href="https://llaqtafest.netlify.app/admin" class="button">Ir al Panel Admin</a>
            </div>
            <div class="footer">© 2026 Llaqta Fest — Este mensaje es automático, no responder.</div>
          </div>
        </body>
        </html>
      `
    };

    try {
      await transporter.sendMail(adminMailOptions);
      console.log(`[ADMIN] Notificación enviada a administrador por compra de ${ticket.fullName}`);
    } catch (emailError) {
      console.error('[ADMIN] Error al enviar notificación al administrador:', emailError);
    }

    res.json({ message: 'Solicitud de verificación enviada', ticket });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2b. Admin Approves Payment & Sends Email
router.post('/backoffice/approve-payment', async (req: Request, res: Response) => {
  try {
    await connectDB();
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

    // Generate PDF ticket
    const pdfBuffer = await generateTicketPDF(ticket, qrDataUrl);

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
              <p>Tu pago ha sido validado con éxito por nuestro equipo. Adjuntamos tu entrada oficial en PDF — guárdala y preséntala al ingresar al evento.</p>

              <div class="ticket-box">
                <div class="badge">Zona ${ticket.type}</div>
                <div class="qr-code">
                  <img src="cid:qrcode" width="200" height="200" alt="Código QR">
                </div>
                <p style="font-family: monospace; font-size: 16px; font-weight: bold; color: #462211; letter-spacing: 2px; margin: 0;">${qrToken}</p>
                <p style="font-size: 11px; color: #888; margin-top: 5px;">CÓDIGO DE SEGURIDAD</p>
              </div>

              <div style="background: #fdf6e3; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e8dfc8; color: #999; width: 40%;">Nombre</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e8dfc8; font-weight: bold; color: #1a0f0a;">${ticket.fullName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e8dfc8; color: #999;">DNI</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e8dfc8; font-weight: bold; color: #1a0f0a; font-family: monospace;">${ticket.dni}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e8dfc8; color: #999;">Teléfono</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e8dfc8; font-weight: bold; color: #1a0f0a;">${ticket.phone}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e8dfc8; color: #999;">Zona</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e8dfc8; font-weight: bold; color: #607d3b;">${ticket.type}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #999;">Precio</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #1a0f0a;">S/ ${ticket.price}</td>
                  </tr>
                </table>
              </div>

              <div style="background: #607d3b; border-radius: 12px; padding: 16px 20px; text-align: center; margin-top: 20px;">
                <p style="margin: 0; color: white; font-size: 13px; font-weight: bold;">📎 Tu entrada en PDF está adjunta a este correo</p>
                <p style="margin: 6px 0 0; color: rgba(255,255,255,0.7); font-size: 11px;">Descárgala y preséntala en el ingreso al evento</p>
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
        },
        {
          filename: `entrada-llaqta-fest-${ticket.dni}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
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
    await connectDB();
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
    await connectDB();
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
    await connectDB();
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
