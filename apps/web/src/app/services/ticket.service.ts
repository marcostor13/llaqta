import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

export interface TicketRequest {
  dni: string;
  email: string;
  fullName: string;
  type: 'NACACHO' | 'LLAMICHU';
  price: number;
  phone: string;
}

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private http = inject(HttpClient);
  private readonly API_URL = '/api/tickets';

  isProcessing = signal(false);
  currentTicket = signal<any>(null);

  async purchaseTicket(request: TicketRequest) {
    this.isProcessing.set(true);
    try {
      // Simulation of API call to create pending ticket
      const response = await lastValueFrom(this.http.post(`${this.API_URL}/purchase`, request));
      this.currentTicket.set(response);
      return response;
    } catch (error) {
      console.error('Purchase failed', error);
      throw error;
    } finally {
      this.isProcessing.set(false);
    }
  }

  async confirmPayment(ticketId: string, paymentData: any) {
    this.isProcessing.set(true);
    try {
      const response = await lastValueFrom(this.http.post(`${this.API_URL}/confirm`, { ticketId, ...paymentData }));
      return response;
    } catch (error) {
      console.error('Payment confirmation failed', error);
      throw error;
    } finally {
      this.isProcessing.set(false);
    }
  }
}
