import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TicketService } from '../services/ticket.service';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-backoffice',
  standalone: true,
  imports: [CommonModule, FormsModule, ZXingScannerModule],
  template: `
    <div class="min-h-screen bg-dark text-white font-body p-6">
      <!-- PIN Login Overlay -->
      <div *ngIf="!isAuthenticated()" class="fixed inset-0 z-[100] bg-dark flex items-center justify-center p-6">
        <div class="max-w-xs w-full text-center">
          <img src="/logo.jpeg" class="h-16 w-16 mx-auto rounded-xl mb-6">
          <h2 class="font-display text-2xl font-bold mb-2 uppercase tracking-tight">Acceso Staff</h2>
          <p class="text-white/40 text-xs mb-8">Ingresa el PIN de seguridad</p>
          
          <div class="flex gap-4 justify-center mb-8">
            <input [(ngModel)]="pin" type="password" maxlength="4" placeholder="••••"
                   class="w-32 bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-center text-2xl tracking-[1em] focus:border-secondary outline-none transition-all">
          </div>

          <button (click)="login()" class="btn-primary !bg-secondary !text-dark w-full">Ingresar</button>
        </div>
      </div>

      <!-- Main Admin Dashboard -->
      <div *ngIf="isAuthenticated()" class="max-w-6xl mx-auto">
        <header class="flex justify-between items-center mb-10">
          <div>
            <h1 class="font-display text-3xl font-bold italic">BACKOFFICE <span class="text-secondary text-sm not-italic ml-2 uppercase tracking-widest">Llaqta Fest</span></h1>
          </div>
          <div class="flex gap-3">
             <button (click)="view.set('stats'); loadStats()" [class.bg-secondary]="view() === 'stats'" class="px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all bg-white/5">Reportes</button>
             <button (click)="view.set('payments'); loadStats()" [class.bg-secondary]="view() === 'payments'" class="px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all bg-white/5 relative">
                Verificar Pagos
                <span *ngIf="stats()?.pendingVerification > 0" class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[8px] flex items-center justify-center animate-pulse">
                  {{stats()?.pendingVerification}}
                </span>
             </button>
             <button (click)="view.set('scanner')" [class.bg-secondary]="view() === 'scanner'" class="px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all bg-white/5">Escáner</button>
             <button (click)="logout()" class="px-3 py-2 rounded-xl text-[10px] font-bold uppercase bg-red-500/20 text-red-400">Salir</button>
          </div>
        </header>

        <!-- Stats View -->
        <div *ngIf="view() === 'stats'" class="space-y-8 animate-in fade-in duration-500">
           <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div class="bg-white/5 p-6 rounded-3xl border border-white/10 text-center">
                 <p class="text-[9px] uppercase font-bold text-white/40 mb-2">Ventas Pagadas</p>
                 <h3 class="text-4xl font-display font-bold text-secondary">{{stats()?.totalSales || 0}}</h3>
              </div>
              <div class="bg-white/5 p-6 rounded-3xl border border-white/10 text-center">
                 <p class="text-[9px] uppercase font-bold text-white/40 mb-2">Por Verificar</p>
                 <h3 class="text-4xl font-display font-bold text-orange-400">{{stats()?.pendingVerification || 0}}</h3>
              </div>
              <div class="bg-white/5 p-6 rounded-3xl border border-white/10 text-center">
                 <p class="text-[9px] uppercase font-bold text-white/40 mb-2">Validados (Puerta)</p>
                 <h3 class="text-4xl font-display font-bold text-primary">{{stats()?.validatedCount || 0}}</h3>
              </div>
              <div class="bg-white/5 p-6 rounded-3xl border border-white/10 text-center">
                 <p class="text-[9px] uppercase font-bold text-white/40 mb-2">Aforo Restante</p>
                 <h3 class="text-4xl font-display font-bold text-white">{{stats()?.pendingValidation || 0}}</h3>
              </div>
           </div>

           <div class="bg-white/5 p-8 rounded-3xl border border-white/10">
              <h4 class="font-display text-xl font-bold mb-6">Últimas Ventas</h4>
              <div class="overflow-x-auto">
                 <table class="w-full text-left text-sm">
                    <thead class="text-[10px] uppercase font-bold text-white/20 border-b border-white/5">
                       <tr>
                          <th class="pb-4">DNI</th>
                          <th class="pb-4">Comprador</th>
                          <th class="pb-4">Tipo</th>
                          <th class="pb-4 text-right">Estado</th>
                       </tr>
                    </thead>
                    <tbody class="divide-y divide-white/5">
                       <tr *ngFor="let t of stats()?.recentSales" class="hover:bg-white/5">
                          <td class="py-4">{{t.dni}}</td>
                          <td class="py-4">{{t.fullName}}</td>
                          <td class="py-4"><span class="px-2 py-1 bg-white/5 rounded text-[10px]">{{t.type}}</span></td>
                          <td class="py-4 text-right">
                             <span *ngIf="t.isValidated" class="text-primary font-bold">✓ Validado</span>
                             <span *ngIf="!t.isValidated" class="text-white/40">Pendiente</span>
                          </td>
                       </tr>
                    </tbody>
                 </table>
              </div>
           </div>
        </div>

        <!-- Payments Verification View -->
        <div *ngIf="view() === 'payments'" class="space-y-6 animate-in slide-in-from-bottom duration-500">
           <div class="bg-white/5 p-8 rounded-3xl border border-white/10">
              <h4 class="font-display text-xl font-bold mb-2">Validación de Pagos</h4>
              <p class="text-white/40 text-xs mb-8">Confirma que el dinero ha ingresado a Yape antes de aprobar.</p>
              
              <div *ngIf="stats()?.verificationNeeded?.length === 0" class="text-center py-20 text-white/20">
                 <p>No hay pagos pendientes de verificación.</p>
              </div>

              <div class="grid grid-cols-1 gap-4">
                 <div *ngFor="let t of stats()?.verificationNeeded" class="bg-white/5 p-6 rounded-2xl border border-white/10 flex justify-between items-center group hover:bg-white/10 transition-all">
                    <div class="space-y-1">
                       <div class="flex items-center gap-3">
                          <span class="text-lg font-bold">{{t.fullName}}</span>
                          <span class="px-2 py-0.5 bg-secondary/20 text-secondary text-[9px] font-bold rounded-full uppercase">{{t.type}}</span>
                       </div>
                       <div class="text-[10px] text-white/40 uppercase font-mono tracking-wider">
                          DNI: {{t.dni}} | TEL: {{t.phone}} | EMAIL: {{t.email}}
                       </div>
                    </div>
                    
                    <div class="flex items-center gap-6">
                       <div class="text-right">
                          <p class="text-[9px] text-white/30 uppercase font-bold mb-1">Monto a Validar</p>
                          <p class="text-2xl font-display font-bold text-white">S/ {{t.price}}</p>
                       </div>
                       <button (click)="approvePayment(t._id)" [disabled]="isApproving === t._id" 
                               class="bg-secondary text-dark px-6 py-3 rounded-xl font-bold text-xs uppercase hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
                          <span *ngIf="isApproving !== t._id">Validar Pago</span>
                          <span *ngIf="isApproving === t._id">Aprobando...</span>
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <!-- Scanner View -->
        <div *ngIf="view() === 'scanner'" class="flex flex-col items-center animate-in zoom-in duration-300">
           <div class="w-full max-w-md bg-black rounded-3xl overflow-hidden border-4 border-white/5 shadow-2xl mb-8 relative">
              <zxing-scanner 
                 (scanSuccess)="onScanSuccess($event)"
                 class="w-full h-auto">
              </zxing-scanner>
              
              <!-- Scan Animation -->
              <div class="absolute inset-0 pointer-events-none border-t-2 border-secondary/50 animate-[bounce_2s_infinite]"></div>
           </div>

           <!-- Scan Result -->
           <div *ngIf="scanStatus()" class="w-full max-w-md p-8 rounded-3xl text-center"
                [ngClass]="scanStatus()?.success ? 'bg-primary/20 border border-primary/30' : 'bg-red-500/20 border border-red-500/30'">
              <h4 class="font-display text-2xl font-bold mb-2">{{scanStatus()?.message}}</h4>
              <div *ngIf="scanStatus()?.dni" class="mt-4 p-4 bg-black/40 rounded-2xl flex justify-between items-center text-xs">
                 <span class="text-white/40 font-bold uppercase">DNI Escaneado</span>
                 <span class="text-secondary text-xl font-display font-bold">{{scanStatus().dni}}</span>
              </div>
              <button (click)="scanStatus.set(null)" class="mt-6 text-[10px] font-bold uppercase tracking-widest text-white/40">Reiniciar Escáner</button>
           </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class BackofficeComponent {
  http = inject(HttpClient);
  ticketService = inject(TicketService);

  isAuthenticated = signal(false);
  pin = '';
  view = signal<'stats' | 'scanner' | 'payments'>('stats');
  stats = signal<any>(null);
  scanStatus = signal<any>(null);
  isApproving: string | null = null;

  login() {
    if (this.pin === '2026') {
      this.isAuthenticated.set(true);
      this.loadStats();
    } else {
      alert('PIN Incorrecto');
      this.pin = '';
    }
  }

  logout() {
    this.isAuthenticated.set(false);
    this.pin = '';
  }

  async loadStats() {
    try {
      const data = await lastValueFrom(this.http.get('/api/backoffice/stats'));
      this.stats.set(data);
    } catch (e) {
      console.error(e);
    }
  }

  async onScanSuccess(result: string) {
    if (this.scanStatus()) return; // Avoid double scan

    try {
      const response: any = await lastValueFrom(this.http.post('/api/tickets/validate', { qrToken: result }));
      this.scanStatus.set(response);
      this.loadStats();
    } catch (e: any) {
      this.scanStatus.set(e.error || { success: false, message: 'Error de conexión' });
    }
  }

  async approvePayment(ticketId: string) {
    this.isApproving = ticketId;
    try {
      await lastValueFrom(this.http.post('/api/backoffice/approve-payment', { ticketId }));
      this.isApproving = null;
      this.loadStats();
      // Switch back to stats or show success toast in a real app
    } catch (e) {
      alert('Error aprobando pago');
      this.isApproving = null;
    }
  }
}
