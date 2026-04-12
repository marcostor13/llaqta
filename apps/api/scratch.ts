import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || '';

async function test() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected');

  const ticketSchema = new mongoose.Schema({}, { strict: false });
  const Ticket = mongoose.model('Ticket', ticketSchema);

  const pending = await Ticket.find({ status: 'pending' });
  const verification = await Ticket.find({ status: 'verification' });
  const paid = await Ticket.find({ status: 'paid' });

  console.log('pending:', pending.length);
  console.log('verification:', verification.length);
  console.log('paid:', paid.length);
  console.log('All tickets:', await Ticket.find());

  process.exit(0);
}

test();
