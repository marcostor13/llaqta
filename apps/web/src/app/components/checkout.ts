import { Component, inject, signal, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PricingService } from '../services/pricing.service';
import { TicketService, TicketRequest } from '../services/ticket.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-dark/90 backdrop-blur-sm">
      <div class="glass-card !bg-page w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <!-- Header -->
        <div class="p-6 bg-accent text-white flex justify-between items-center">
          <div>
            <h3 class="font-display text-xl font-bold uppercase tracking-tight">Completar Compra</h3>
            <p class="text-[10px] text-secondary font-bold uppercase tracking-widest">Llaqta Fest 2026</p>
          </div>
          <button (click)="close.emit()" class="text-white/50 hover:text-white transition-colors text-2xl">&times;</button>
        </div>

        <!-- Progress Bar -->
        <div class="h-1 bg-gray-200">
           <div class="h-full bg-primary transition-all duration-500" [style.width]="step() === 1 ? '33%' : step() === 2 ? '66%' : '100%'"></div>
        </div>

        <div class="p-8 overflow-y-auto">
          <!-- Step 1: Data Collection -->
          <div *ngIf="step() === 1" class="space-y-6">
            <div class="text-center mb-8">
              <div class="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase mb-2">
                Paso 1: Información Personal
              </div>
              <h4 class="font-display text-2xl font-bold text-accent">¿A quién va dirigida la entrada?</h4>
            </div>

            <div class="space-y-4">
              <div>
                <label class="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Nombre Completo</label>
                <input [(ngModel)]="formData.fullName" type="text" placeholder="Ej. Juan Pérez" 
                       class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all">
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="text-[10px] font-bold uppercase text-gray-400 mb-1 block">DNI</label>
                  <input [(ngModel)]="formData.dni" type="text" maxlength="8" placeholder="8 dígitos" 
                         class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all">
                </div>
                <div>
                   <label class="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Tipo de Entrada</label>
                   <div class="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-accent">
                     {{ticketType}}
                   </div>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Número de Celular</label>
                  <input [(ngModel)]="formData.phone" type="tel" placeholder="9XXXXXXXX" 
                         class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all">
                </div>
                <div>
                  <label class="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Correo Electrónico</label>
                  <input [(ngModel)]="formData.email" type="email" placeholder="ejemplo@correo.com" 
                         class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all">
                </div>
              </div>
            </div>

            <div class="bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-200 mt-8">
              <div class="flex justify-between items-center">
                <span class="text-sm font-medium text-gray-600">Total a pagar:</span>
                <span class="text-2xl font-display font-bold text-accent">S/ {{price}}</span>
              </div>
            </div>

            <button [disabled]="!isFormValid()" (click)="goToPayment()" 
                    class="btn-primary w-full disabled:opacity-50 disabled:scale-100 mt-4">
              Continuar al Pago
            </button>
          </div>

          <!-- Step 2: Yape Simulation -->
          <div *ngIf="step() === 2" class="space-y-6 text-center">
             <div class="mb-6">
                <h4 class="font-display text-2xl font-bold text-accent">Paga con Yape</h4>
                <p class="text-xs text-gray-500 mt-2">Escanea el código o ingresa tu número móvil</p>
             </div>

             <!-- Yape QR Image -->
             <div class="mb-6">
                <img src="/qr.jpeg" alt="Yape QR" class="w-80 mx-auto rounded-xl">
             </div>

             <button [disabled]="ticketService.isProcessing()" (click)="confirm()" 
                     class="btn-primary w-full !bg-[#742284] mt-6 text-lg py-4">
                <span *ngIf="!ticketService.isProcessing()">Ya pagué</span>
                <span *ngIf="ticketService.isProcessing()" class="flex items-center gap-2 justify-center">
                   <div class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                   Validando...
                </span>
             </button>
             
             <button (click)="step.set(1)" class="text-xs text-gray-400 font-bold uppercase mt-4 hover:text-accent transition-colors">
               Volver a datos
             </button>
          </div>

          <!-- Step 3: Success / Pending Verification -->
          <div *ngIf="step() === 3" class="text-center py-8">
             <div class="w-20 h-20 bg-secondary/10 text-secondary rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
               ⏳
             </div>
             <h4 class="font-display text-3xl font-bold text-accent mb-2">¡Solicitud Enviada!</h4>
             <p class="text-gray-500 mb-8 max-w-xs mx-auto">
               Hemos recibido tu confirmación de Yapeo. Nuestro equipo validará el pago en breve. 
               <strong>Recibirás tu entrada por correo una vez aprobado.</strong>
             </p>

             <div class="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 mb-8 max-w-xs mx-auto">
                <p class="text-[10px] font-bold uppercase text-secondary mb-2 tracking-widest">¿Qué sigue?</p>
                <p class="text-xs text-gray-400">Nuestro staff verificará el monto y enviará el código QR a <strong>{{formData.email}}</strong>. Esto suele tardar menos de 30 minutos.</p>
             </div>

             <button (click)="close.emit()" class="btn-primary w-full">
               Entendido
             </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class CheckoutComponent {
  @Input() ticketType: 'NACACHO' | 'LLAMICHU' = 'LLAMICHU';
  @Input() price: number = 0;
  @Output() close = new EventEmitter<void>();

  pricing = inject(PricingService);
  ticketService = inject(TicketService);

  step = signal(1);
  formData = {
    fullName: '',
    dni: '',
    email: '',
    phone: ''
  };

  isFormValid() {
    return this.formData.fullName.length > 3 && 
           this.formData.dni.length === 8 && 
           this.formData.phone.length >= 9 &&
           this.formData.email.includes('@');
  }

  async goToPayment() {
    if (!this.isFormValid()) return;
    
    try {
      await this.ticketService.purchaseTicket({
        ...this.formData,
        type: this.ticketType,
        price: this.price
      });
      this.step.set(2);
    } catch (e) {
      alert('Error al procesar la solicitud. Reintenta.');
    }
  }

  async confirm() {
    try {
      const ticketId = this.ticketService.currentTicket()._id || this.ticketService.currentTicket().id;
      await this.ticketService.confirmPayment(ticketId, { paymentMethod: 'YAPE' });
      this.step.set(3);
    } catch (e) {
      alert('Error en el pago. Reintenta.');
    }
  }
}
