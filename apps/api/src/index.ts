import express, { Request, Response } from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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
  isCourtesy: { type: Boolean, default: false },
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

// Wrap text for PDF (manual word-wrap since pdf-lib has no auto-wrap)
function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(testLine, fontSize) <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// Load flyer image bytes (try filesystem first, then fetch from deployed URL)
async function getFlyerBytes(): Promise<Buffer | null> {
  try {
    const localPaths = [
      path.resolve(process.cwd(), 'apps/web/public/flyer.jpeg'),
      path.resolve(process.cwd(), 'public/flyer.jpeg'),
      path.resolve(__dirname, '../../../apps/web/public/flyer.jpeg'),
      path.resolve(__dirname, 'flyer.jpeg'),
    ];
    for (const p of localPaths) {
      if (fs.existsSync(p)) return fs.readFileSync(p);
    }
    // Fallback: fetch from deployed site
    const res = await fetch('https://llaqtafest.netlify.app/flyer.jpeg');
    if (res.ok) {
      const ab = await res.arrayBuffer();
      return Buffer.from(ab);
    }
  } catch (e) {
    console.warn('Could not load flyer image:', e);
  }
  return null;
}

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

  const py = (y: number, h = 0) => H - y - h;

  // Header band
  page.drawRectangle({ x: 0, y: py(0, 195), width: W, height: 195, color: brown });
  page.drawRectangle({ x: 0, y: py(185, 10), width: W, height: 10, color: darkBrown });

  const label1 = ticket.isCourtesy ? 'ENTRADA DE CORTESÍA' : 'ENTRADA OFICIAL';
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

  // QR card — 245pt (up from 185), source image 600px for crisp rendering
  const qrSize = 245;
  const qrPad = 12;
  const qrX = (W - qrSize) / 2;
  const qrY = 263;
  page.drawRectangle({
    x: qrX - qrPad, y: py(qrY - qrPad, qrSize + qrPad * 2),
    width: qrSize + qrPad * 2, height: qrSize + qrPad * 2,
    color: white, borderColor: rgb(0.92, 0.92, 0.92), borderWidth: 1,
  });
  const qrBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
  const qrImage = await pdfDoc.embedPng(qrBuffer);
  page.drawImage(qrImage, { x: qrX, y: py(qrY, qrSize), width: qrSize, height: qrSize });

  // Token & security label
  page.drawText(ticket.qrToken, {
    x: (W - courierBold.widthOfTextAtSize(ticket.qrToken, 11)) / 2,
    y: py(qrY + qrSize + 18, 11), font: courierBold, size: 11, color: dark,
  });
  const secLabel = 'CODIGO DE SEGURIDAD - NO COMPARTIR';
  page.drawText(secLabel, {
    x: (W - helvetica.widthOfTextAtSize(secLabel, 7)) / 2,
    y: py(qrY + qrSize + 33, 7), font: helvetica, size: 7, color: lightText, charSpacing: 1,
  });

  // Separator line
  const sepY = qrY + qrSize + 52;
  page.drawLine({ start: { x: 50, y: py(sepY) }, end: { x: W - 50, y: py(sepY) }, thickness: 1, color: lightGray });

  // Info card — compact 3-row layout
  const infoY = sepY + 12;
  const infoH = 158;
  page.drawRectangle({ x: 40, y: py(infoY, infoH), width: W - 80, height: infoH, color: cream });

  const drawField = (x: number, y: number, label: string, value: string) => {
    page.drawText(label, { x, y: py(y, 7.5), font: helvetica, size: 7.5, color: gray, charSpacing: 0.8 });
    page.drawText(value, { x, y: py(y + 12, 11), font: helveticaBold, size: 11, color: dark });
  };

  const c1 = 70, c2 = 330;
  drawField(c1, infoY + 13, 'NOMBRE COMPLETO', ticket.fullName);
  drawField(c2, infoY + 13, 'DNI', ticket.dni);
  drawField(c1, infoY + 57, 'TELEFONO / YAPE', ticket.phone);
  drawField(c2, infoY + 57, 'CORREO ELECTRONICO', ticket.email);
  const fecha = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(ticket.createdAt));
  drawField(c1, infoY + 101, 'FECHA DE COMPRA', fecha);
  drawField(c2, infoY + 101, 'PRECIO PAGADO', ticket.isCourtesy ? 'CORTESÍA' : `S/ ${ticket.price}`);

  // Footer — fills remaining page
  const footerY = 739;
  page.drawRectangle({ x: 0, y: py(footerY, H - footerY), width: W, height: H - footerY, color: green });
  page.drawRectangle({ x: 0, y: py(footerY, 5), width: W, height: 5, color: darkGreen });

  const footer1 = 'Este ticket es personal e intransferible';
  page.drawText(footer1, {
    x: (W - helveticaBold.widthOfTextAtSize(footer1, 11)) / 2,
    y: py(footerY + 18, 11), font: helveticaBold, size: 11, color: white,
  });
  const footer2 = 'Presentalo en formato digital o impreso al ingresar al evento';
  page.drawText(footer2, {
    x: (W - helvetica.widthOfTextAtSize(footer2, 8.5)) / 2,
    y: py(footerY + 35, 8.5), font: helvetica, size: 8.5, color: rgb(0.9, 0.9, 0.9),
  });
  const footer3 = '© 2026 Llaqta Fest — Todos los derechos reservados — llaqtafest.netlify.app';
  page.drawText(footer3, {
    x: (W - helvetica.widthOfTextAtSize(footer3, 7.5)) / 2,
    y: py(footerY + 58, 7.5), font: helvetica, size: 7.5, color: rgb(0.75, 0.75, 0.75),
  });

  // Second page: terms & conditions
  const termsPage = pdfDoc.addPage([595.28, 841.89]);
  const tW = termsPage.getWidth();
  const tH = termsPage.getHeight();
  const tpy = (y: number, h = 0) => tH - y - h;

  termsPage.drawRectangle({ x: 0, y: tpy(0, 80), width: tW, height: 80, color: brown });
  termsPage.drawRectangle({ x: 0, y: tpy(70, 10), width: tW, height: 10, color: darkBrown });

  const termsTitle = 'IMPORTANTE';
  termsPage.drawText(termsTitle, {
    x: (tW - helveticaBold.widthOfTextAtSize(termsTitle, 28)) / 2,
    y: tpy(20, 28), font: helveticaBold, size: 28, color: gold, charSpacing: 3,
  });
  termsPage.drawText('TÉRMINOS Y CONDICIONES DE USO', {
    x: (tW - helvetica.widthOfTextAtSize('TÉRMINOS Y CONDICIONES DE USO', 9)) / 2,
    y: tpy(58, 9), font: helvetica, size: 9, color: rgb(0.8, 0.8, 0.8), charSpacing: 1,
  });

  const termsList = [
    'El boleto es un comprobante válido de tu compra, por lo que no será canjeado por una entrada tradicional impresa en el punto de venta o boletería.',
    'Si el evento permite el ingreso de menores de edad, es OBLIGATORIO asistir en compañía de un adulto (misma localidad), sólo será válido el ingreso de menores de 18 años con DNI.',
    'Presentar su boleto, (impreso o de manera digital), para que sea validada antes del ingreso.',
    'Se recomienda asistir con 60 minutos de anticipación al inicio del evento, para la verificación de su entrada.',
    'Al comprar un boleto digital, estas aceptando no divulgarlo, ni compartirlo con terceros, ya que esto podría afectar tu ingreso al evento.',
    'En caso de detectarse indicios de falsificación de entradas, el organizador podrá NO AUTORIZAR el ingreso al recinto.',
    'El boleto digital es un comprobante válido de tu compra, por lo que no será canjeado por una entrada tradicional impresa en el punto de venta o boletería.',
  ];

  const textMaxW = tW - 110;
  let termY = 110;
  const lineH = 13;
  const bulletGap = 22;

  termsPage.drawRectangle({ x: 40, y: tpy(termY - 12, termsList.length * 70 + 30), width: tW - 80, height: termsList.length * 70 + 30, color: cream });

  for (let i = 0; i < termsList.length; i++) {
    // Bullet number
    termsPage.drawText(`${i + 1}.`, {
      x: 56, y: tpy(termY, 10), font: helveticaBold, size: 10, color: brown,
    });
    const lines = wrapText(termsList[i], helvetica, 9.5, textMaxW);
    for (let j = 0; j < lines.length; j++) {
      termsPage.drawText(lines[j], {
        x: 74, y: tpy(termY + j * lineH, 9.5), font: helvetica, size: 9.5, color: dark,
      });
    }
    termY += lines.length * lineH + bulletGap;
  }

  // Terms footer
  const tFooterY = 760;
  termsPage.drawRectangle({ x: 0, y: tpy(tFooterY, 82), width: tW, height: 82, color: green });
  termsPage.drawRectangle({ x: 0, y: tpy(tFooterY, 5), width: tW, height: 5, color: darkGreen });
  termsPage.drawText('© 2026 Llaqta Fest — Todos los derechos reservados', {
    x: (tW - helvetica.widthOfTextAtSize('© 2026 Llaqta Fest — Todos los derechos reservados', 8)) / 2,
    y: tpy(tFooterY + 20, 8), font: helvetica, size: 8, color: rgb(0.9, 0.9, 0.9),
  });
  termsPage.drawText('llaqtafest.netlify.app', {
    x: (tW - helveticaBold.widthOfTextAtSize('llaqtafest.netlify.app', 9)) / 2,
    y: tpy(tFooterY + 38, 9), font: helveticaBold, size: 9, color: white,
  });

  // Third page: flyer image
  const flyerBytes = await getFlyerBytes();
  if (flyerBytes) {
    try {
      const flyerPage = pdfDoc.addPage([595.28, 841.89]);
      const flyerImg = await pdfDoc.embedJpg(flyerBytes);
      const dims = flyerImg.scale(1);
      const scale = Math.min(595.28 / dims.width, 841.89 / dims.height);
      const w = dims.width * scale;
      const h = dims.height * scale;
      flyerPage.drawImage(flyerImg, {
        x: (595.28 - w) / 2,
        y: (841.89 - h) / 2,
        width: w,
        height: h,
      });
    } catch (e) {
      console.warn('Could not embed flyer in PDF:', e);
    }
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

const router = express.Router();

// 1. Purchase Request
router.post('/tickets/purchase', async (req: Request, res: Response) => {
  try {
    await connectDB();
    const { dni, email, fullName, type, price, phone } = req.body;

    const ticket = new Ticket({ dni, email, fullName, phone, type, price, status: 'pending' });
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
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });

    ticket.status = 'verification';
    await ticket.save();

    const adminMailOptions = {
      from: `"Llaqta Fest" <${process.env.USER_EMAIL}>`,
      to: 'produccionesllaqta@gmail.com',
      subject: `💰 Nueva compra pendiente de verificación - ${ticket.fullName}`,
      html: `
        <!DOCTYPE html><html><head><style>
          body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px}
          .container{max-width:600px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)}
          .header{background:#462211;padding:30px;text-align:center;color:white}
          .content{padding:30px;color:#1a0f0a;line-height:1.7}
          .info-box{background:#fdf6e3;border-left:4px solid #607d3b;border-radius:8px;padding:20px;margin:20px 0}
          .info-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0e8d0}
          .info-row:last-child{border-bottom:none}
          .label{color:#888;font-size:13px}.value{font-weight:bold;color:#462211}
          .button{display:block;width:fit-content;margin:25px auto 0;padding:14px 35px;background:#607d3b;color:white;text-decoration:none;border-radius:50px;font-weight:bold;font-size:15px}
          .footer{background:#f9f9f9;padding:20px;text-align:center;color:#aaa;font-size:11px}
        </style></head><body>
          <div class="container">
            <div class="header"><h2 style="margin:0;font-size:22px">Nueva compra para validar</h2><p style="margin:8px 0 0;opacity:.8;font-size:13px">Un comprador reportó su pago y espera verificación</p></div>
            <div class="content">
              <div class="info-box">
                <div class="info-row"><span class="label">Nombre</span><span class="value">${ticket.fullName}</span></div>
                <div class="info-row"><span class="label">DNI</span><span class="value">${ticket.dni}</span></div>
                <div class="info-row"><span class="label">Email</span><span class="value">${ticket.email}</span></div>
                <div class="info-row"><span class="label">Teléfono</span><span class="value">${ticket.phone}</span></div>
                <div class="info-row"><span class="label">Tipo de entrada</span><span class="value">${ticket.type}</span></div>
                <div class="info-row"><span class="label">Precio</span><span class="value">S/ ${ticket.price}</span></div>
                <div class="info-row"><span class="label">ID del ticket</span><span class="value" style="font-size:11px;font-family:monospace">${ticket._id}</span></div>
              </div>
              <p style="text-align:center;color:#666;font-size:14px">Ingresa al panel de administración para aprobar o rechazar este pago:</p>
              <a href="https://llaqtafest.netlify.app/admin" class="button">Ir al Panel Admin</a>
            </div>
            <div class="footer">© 2026 Llaqta Fest — Este mensaje es automático, no responder.</div>
          </div>
        </body></html>
      `
    };

    try {
      await transporter.sendMail(adminMailOptions);
    } catch (emailError) {
      console.error('[ADMIN] Error al enviar notificación:', emailError);
    }

    res.json({ message: 'Solicitud de verificación enviada', ticket });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Helper: send ticket email with PDF
async function sendTicketEmail(ticket: any, qrToken: string, qrDataUrl: string, pdfBuffer: Buffer) {
  const isCourtesy = ticket.isCourtesy;
  const mailOptions = {
    from: `"Llaqta Fest" <${process.env.USER_EMAIL}>`,
    to: ticket.email,
    subject: `🎪 ¡Tu entrada para LLAQTA FEST está lista! - ${ticket.type}`,
    html: `
      <!DOCTYPE html><html><head><style>
        .container{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.1);border:1px solid #f0f0f0}
        .header{background:#462211;padding:40px;text-align:center;color:white}
        .content{padding:40px;color:#1a0f0a;line-height:1.6}
        .ticket-box{background:#fdf6e3;border:2px dashed #607d3b;border-radius:20px;padding:30px;text-align:center;margin:30px 0}
        .qr-code{width:220px;height:220px;margin:25px auto;padding:10px;background:white;border-radius:12px}
        .badge{display:inline-block;padding:6px 12px;background:#f2d25c;color:#462211;border-radius:30px;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px}
        .courtesy-badge{background:#a855f7;color:white}
        .footer{background:#f9f9f9;padding:30px;text-align:center;color:#999;font-size:11px}
        h1{margin:10px 0;font-size:28px}
      </style></head><body>
        <div class="container">
          <div class="header">
            <div class="badge ${isCourtesy ? 'courtesy-badge' : ''}">${isCourtesy ? 'Entrada de Cortesía' : 'Pago Confirmado'}</div>
            <h1>¡Nos vemos en Llaqta Fest!</h1>
            <p style="opacity:.8;font-size:14px">Salón y Eventos Centenario - Puquio 2026</p>
          </div>
          <div class="content">
            <p>Hola <strong>${ticket.fullName}</strong>,</p>
            <p>${isCourtesy ? 'Te enviamos tu entrada de cortesía para el evento. Adjuntamos tu entrada oficial en PDF.' : 'Tu pago ha sido validado con éxito por nuestro equipo. Adjuntamos tu entrada oficial en PDF — guárdala y preséntala al ingresar al evento.'}</p>
            <div class="ticket-box">
              <div class="badge">Zona ${ticket.type}</div>
              <div class="qr-code"><img src="cid:qrcode" width="200" height="200" alt="Código QR"></div>
              <p style="font-family:monospace;font-size:16px;font-weight:bold;color:#462211;letter-spacing:2px;margin:0">${qrToken}</p>
              <p style="font-size:11px;color:#888;margin-top:5px">CÓDIGO DE SEGURIDAD</p>
            </div>
            <div style="background:#fdf6e3;border-radius:12px;padding:20px;margin:20px 0">
              <table style="width:100%;border-collapse:collapse;font-size:13px">
                <tr><td style="padding:8px 0;border-bottom:1px solid #e8dfc8;color:#999;width:40%">Nombre</td><td style="padding:8px 0;border-bottom:1px solid #e8dfc8;font-weight:bold;color:#1a0f0a">${ticket.fullName}</td></tr>
                <tr><td style="padding:8px 0;border-bottom:1px solid #e8dfc8;color:#999">DNI</td><td style="padding:8px 0;border-bottom:1px solid #e8dfc8;font-weight:bold;color:#1a0f0a;font-family:monospace">${ticket.dni}</td></tr>
                <tr><td style="padding:8px 0;border-bottom:1px solid #e8dfc8;color:#999">Teléfono</td><td style="padding:8px 0;border-bottom:1px solid #e8dfc8;font-weight:bold;color:#1a0f0a">${ticket.phone}</td></tr>
                <tr><td style="padding:8px 0;border-bottom:1px solid #e8dfc8;color:#999">Zona</td><td style="padding:8px 0;border-bottom:1px solid #e8dfc8;font-weight:bold;color:#607d3b">${ticket.type}</td></tr>
                <tr><td style="padding:8px 0;color:#999">Precio</td><td style="padding:8px 0;font-weight:bold;color:#1a0f0a">${isCourtesy ? 'CORTESÍA' : `S/ ${ticket.price}`}</td></tr>
              </table>
            </div>
            <div style="background:#607d3b;border-radius:12px;padding:16px 20px;text-align:center;margin-top:20px">
              <p style="margin:0;color:white;font-size:13px;font-weight:bold">📎 Tu entrada en PDF está adjunta a este correo</p>
              <p style="margin:6px 0 0;color:rgba(255,255,255,.7);font-size:11px">Descárgala y preséntala en el ingreso al evento</p>
            </div>
          </div>
          <div class="footer"><p>Este ticket es personal e intransferible. Debe ser presentado en formato digital o impreso al ingresar.<br>© 2026 Llaqta Fest - Todos los derechos reservados.</p></div>
        </div>
      </body></html>
    `,
    attachments: [
      { filename: 'ticket-qr.png', path: qrDataUrl, cid: 'qrcode' },
      { filename: `entrada-llaqta-fest-${ticket.dni}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }
    ]
  };
  await transporter.sendMail(mailOptions);
}

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
    const qrDataUrl = await QRCode.toDataURL(qrToken, { width: 600, margin: 2 });

    ticket.status = 'paid';
    ticket.qrToken = qrToken;
    ticket.qrDataUrl = qrDataUrl;
    await ticket.save();

    const pdfBuffer = await generateTicketPDF(ticket, qrDataUrl);
    await sendTicketEmail(ticket, qrToken, qrDataUrl, pdfBuffer);

    console.log(`[EXITO] Pago aprobado y Email enviado a ${ticket.email}`);
    res.json({ message: 'Pago aprobado y ticket enviado', ticket });
  } catch (error: any) {
    console.error('Error en aprobación:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2c. Generate Courtesy Ticket (Backoffice)
router.post('/backoffice/courtesy-ticket', async (req: Request, res: Response) => {
  try {
    await connectDB();
    const { dni, email, fullName, type, phone } = req.body;

    if (!dni || !email || !fullName || !type || !phone) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const qrToken = `LLAQTA-${dni}-${uuidv4().substring(0, 8)}`;
    const qrDataUrl = await QRCode.toDataURL(qrToken, { width: 600, margin: 2 });

    const ticket = new Ticket({
      dni,
      email,
      fullName,
      phone,
      type,
      price: 0,
      status: 'paid',
      isCourtesy: true,
      qrToken,
      qrDataUrl,
    });
    await ticket.save();

    const pdfBuffer = await generateTicketPDF(ticket, qrDataUrl);
    await sendTicketEmail(ticket, qrToken, qrDataUrl, pdfBuffer);

    console.log(`[CORTESIA] Entrada de cortesía generada y enviada a ${email}`);
    res.status(201).json({ message: 'Entrada de cortesía generada y enviada', ticket });
  } catch (error: any) {
    console.error('Error generando cortesía:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Validate QR (Backoffice) — atomic findOneAndUpdate for max speed
router.post('/tickets/validate', async (req: Request, res: Response) => {
  try {
    await connectDB();
    const { qrToken } = req.body;

    if (!qrToken) {
      return res.status(400).json({ success: false, resultType: 'not_found', message: 'Código incorrecto o no existe' });
    }

    // Single atomic operation: finds a non-validated ticket and marks it validated in one DB round-trip
    const validated = await Ticket.findOneAndUpdate(
      { qrToken, isValidated: { $ne: true } },
      { $set: { isValidated: true, validatedAt: new Date() } },
      { new: true, lean: true }
    );

    if (validated) {
      return res.json({
        success: true,
        resultType: 'success',
        message: 'Código validado correctamente',
        dni: (validated as any).dni,
        fullName: (validated as any).fullName,
        ticketType: (validated as any).type
      });
    }

    // Null means: token not found OR already validated — check which
    const existing = await Ticket.findOne({ qrToken }, 'dni fullName validatedAt').lean();
    if (!existing) {
      return res.status(404).json({ success: false, resultType: 'not_found', message: 'Código incorrecto o no existe' });
    }

    return res.status(400).json({
      success: false,
      resultType: 'already_validated',
      message: 'Código validado anteriormente',
      dni: (existing as any).dni,
      fullName: (existing as any).fullName,
      validatedAt: (existing as any).validatedAt
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Backoffice Stats
router.get('/backoffice/stats', async (req: Request, res: Response) => {
  try {
    await connectDB();
    const paidCount = await Ticket.countDocuments({ status: 'paid', isCourtesy: { $ne: true } });
    const courtesyCount = await Ticket.countDocuments({ status: 'paid', isCourtesy: true });
    const totalSales = paidCount + courtesyCount;
    const pendingVerification = await Ticket.countDocuments({ status: 'verification' });
    const validatedCount = await Ticket.countDocuments({ isValidated: true });

    const allTickets = await Ticket.find({ status: 'paid' }).sort({ createdAt: -1 });
    const verificationNeeded = await Ticket.find({ status: 'verification' }).sort({ createdAt: -1 });

    res.json({
      totalSales,
      paidCount,
      courtesyCount,
      validatedCount,
      pendingVerification,
      pendingValidation: totalSales - validatedCount,
      allTickets,
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
