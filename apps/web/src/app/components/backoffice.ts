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
    <div class="min-h-screen bg-[#0a0a0a] text-white font-body">

      <!-- PIN Login Overlay -->
      <div *ngIf="!isAuthenticated()" class="fixed inset-0 z-[100] bg-[#0a0a0a] flex items-center justify-center p-6">
        <div class="w-full max-w-sm text-center">
          <div class="w-20 h-20 mx-auto mb-6 rounded-2xl overflow-hidden ring-2 ring-white/10">
            <img src="/logo.jpeg" class="w-full h-full object-cover">
          </div>
          <h2 class="font-display text-3xl font-bold mb-1 uppercase tracking-tight">Staff Access</h2>
          <p class="text-white/30 text-sm mb-10">Ingresa el PIN de seguridad para continuar</p>

          <input [(ngModel)]="pin" (ngModelChange)="onPinChange()" type="password" maxlength="4"
                 placeholder="••••" inputmode="numeric" pattern="[0-9]*"
                 class="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-center text-3xl tracking-[1.2em] focus:border-secondary outline-none transition-all mb-6">

          <button (click)="login()" [disabled]="pin.length !== 4"
                  class="w-full py-4 bg-secondary text-dark font-bold text-sm uppercase tracking-widest rounded-2xl disabled:opacity-30 transition-all active:scale-95">
            Ingresar
          </button>
        </div>
      </div>

      <!-- Main Dashboard -->
      <div *ngIf="isAuthenticated()" class="flex flex-col min-h-screen">

        <!-- Sticky Header -->
        <header class="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/[0.06] px-4 sm:px-6 py-3">
          <div class="max-w-6xl mx-auto flex justify-between items-center">
            <div class="flex items-center gap-3">
              <img src="/logo.jpeg" class="h-9 w-9 rounded-xl ring-1 ring-white/10">
              <div>
                <h1 class="font-display text-base sm:text-lg font-bold italic leading-none">BACKOFFICE</h1>
                <p class="text-[9px] text-secondary uppercase tracking-[0.2em]">Llaqta Fest 2026</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button (click)="loadStats()" class="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/5 transition-all" title="Actualizar">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              </button>
              <button (click)="logout()" class="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl text-xs font-bold uppercase transition-all">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                <span class="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </header>

        <!-- Tab Navigation -->
        <nav class="sticky top-[57px] z-40 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/[0.06]">
          <div class="max-w-6xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto scrollbar-hide py-2">
            <button (click)="view.set('stats'); loadStats()"
                    class="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all"
                    [class.bg-secondary]="view() === 'stats'" [class.text-dark]="view() === 'stats'"
                    [class.bg-white\/5]="view() !== 'stats'" [class.text-white\/50]="view() !== 'stats'">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              Reportes
            </button>

            <button (click)="view.set('payments'); loadStats()"
                    class="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all relative"
                    [class.bg-secondary]="view() === 'payments'" [class.text-dark]="view() === 'payments'"
                    [class.bg-white\/5]="view() !== 'payments'" [class.text-white\/50]="view() !== 'payments'">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Verificar Pagos
              <span *ngIf="stats()?.pendingVerification > 0"
                    class="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center px-1 animate-pulse">
                {{stats()?.pendingVerification}}
              </span>
            </button>

            <button (click)="view.set('scanner')"
                    class="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all"
                    [class.bg-secondary]="view() === 'scanner'" [class.text-dark]="view() === 'scanner'"
                    [class.bg-white\/5]="view() !== 'scanner'" [class.text-white\/50]="view() !== 'scanner'">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
              Escáner QR
            </button>
          </div>
        </nav>

        <!-- Content Area -->
        <main class="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">

          <!-- ===== STATS VIEW ===== -->
          <div *ngIf="view() === 'stats'" class="space-y-6">

            <!-- Metric Cards -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div class="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5">
                <p class="text-[10px] uppercase font-bold text-white/30 tracking-widest mb-3">Ventas Pagadas</p>
                <h3 class="text-4xl font-display font-bold text-secondary leading-none">{{stats()?.totalSales || 0}}</h3>
                <p class="text-[10px] text-white/20 mt-2">entradas confirmadas</p>
              </div>
              <div class="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5">
                <p class="text-[10px] uppercase font-bold text-white/30 tracking-widest mb-3">Por Verificar</p>
                <h3 class="text-4xl font-display font-bold text-orange-400 leading-none">{{stats()?.pendingVerification || 0}}</h3>
                <p class="text-[10px] text-white/20 mt-2">pagos pendientes</p>
              </div>
              <div class="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5">
                <p class="text-[10px] uppercase font-bold text-white/30 tracking-widest mb-3">Validados (Puerta)</p>
                <h3 class="text-4xl font-display font-bold text-primary leading-none">{{stats()?.validatedCount || 0}}</h3>
                <p class="text-[10px] text-white/20 mt-2">ingresaron al evento</p>
              </div>
              <div class="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5">
                <p class="text-[10px] uppercase font-bold text-white/30 tracking-widest mb-3">Sin Validar</p>
                <h3 class="text-4xl font-display font-bold text-white leading-none">{{stats()?.pendingValidation || 0}}</h3>
                <p class="text-[10px] text-white/20 mt-2">aún no ingresan</p>
              </div>
            </div>

            <!-- Sales Table / Cards -->
            <div class="bg-white/[0.04] border border-white/[0.07] rounded-2xl overflow-hidden">
              <div class="px-5 py-4 border-b border-white/[0.06] flex justify-between items-center">
                <h4 class="font-display text-lg font-bold">Últimas Ventas</h4>
                <span class="text-[10px] text-white/30 uppercase font-bold">{{stats()?.recentSales?.length || 0}} registros</span>
              </div>

              <!-- Desktop Table -->
              <div class="hidden md:block overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-[10px] uppercase font-bold text-white/20 border-b border-white/[0.05]">
                      <th class="px-5 py-3 text-left">Comprador</th>
                      <th class="px-5 py-3 text-left">DNI</th>
                      <th class="px-5 py-3 text-left">Contacto</th>
                      <th class="px-5 py-3 text-left">Zona</th>
                      <th class="px-5 py-3 text-left">Precio</th>
                      <th class="px-5 py-3 text-left">Fecha</th>
                      <th class="px-5 py-3 text-left">Estado</th>
                      <th class="px-5 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-white/[0.04]">
                    <tr *ngFor="let t of stats()?.recentSales" class="hover:bg-white/[0.03] transition-colors group">
                      <td class="px-5 py-4">
                        <p class="font-semibold text-white">{{t.fullName}}</p>
                      </td>
                      <td class="px-5 py-4">
                        <span class="font-mono text-sm text-secondary">{{t.dni}}</span>
                      </td>
                      <td class="px-5 py-4">
                        <p class="text-xs text-white/60">{{t.phone}}</p>
                        <p class="text-xs text-white/30">{{t.email}}</p>
                      </td>
                      <td class="px-5 py-4">
                        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase"
                              [ngClass]="t.type === 'NACACHO' ? 'bg-secondary/15 text-secondary' : 'bg-primary/15 text-primary'">
                          {{t.type}}
                        </span>
                      </td>
                      <td class="px-5 py-4">
                        <span class="font-display font-bold text-white">S/ {{t.price}}</span>
                      </td>
                      <td class="px-5 py-4">
                        <p class="text-xs text-white/50">{{t.createdAt | date:'dd MMM yyyy'}}</p>
                        <p class="text-[10px] text-white/25">{{t.createdAt | date:'hh:mm a'}}</p>
                      </td>
                      <td class="px-5 py-4">
                        <span *ngIf="t.isValidated" class="flex items-center gap-1.5 text-primary text-xs font-bold">
                          <span class="w-1.5 h-1.5 bg-primary rounded-full"></span> Validado
                        </span>
                        <span *ngIf="!t.isValidated" class="flex items-center gap-1.5 text-white/30 text-xs">
                          <span class="w-1.5 h-1.5 bg-white/20 rounded-full"></span> Sin ingresar
                        </span>
                      </td>
                      <td class="px-5 py-4">
                        <div class="flex justify-end gap-1">
                          <button (click)="viewDetails(t)" class="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-secondary" title="Ver Detalles">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                          </button>
                          <button (click)="deleteTicket(t._id)" class="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-white/20 hover:text-red-400" title="Eliminar">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Mobile Cards -->
              <div class="md:hidden divide-y divide-white/[0.05]">
                <div *ngFor="let t of stats()?.recentSales" class="p-4 hover:bg-white/[0.02]">
                  <div class="flex justify-between items-start mb-3">
                    <div>
                      <p class="font-semibold text-white text-sm">{{t.fullName}}</p>
                      <p class="text-xs font-mono text-secondary">{{t.dni}}</p>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase"
                            [ngClass]="t.type === 'NACACHO' ? 'bg-secondary/15 text-secondary' : 'bg-primary/15 text-primary'">
                        {{t.type}}
                      </span>
                      <span class="font-display font-bold text-white text-sm">S/ {{t.price}}</span>
                    </div>
                  </div>
                  <div class="flex justify-between items-center">
                    <div class="text-xs text-white/30 space-y-0.5">
                      <p>{{t.phone}} · {{t.email}}</p>
                      <p>{{t.createdAt | date:'dd MMM yyyy, hh:mm a'}}</p>
                    </div>
                    <div class="flex items-center gap-1">
                      <span *ngIf="t.isValidated" class="text-primary text-[10px] font-bold">✓ Validado</span>
                      <span *ngIf="!t.isValidated" class="text-white/20 text-[10px]">Sin ingresar</span>
                      <button (click)="viewDetails(t)" class="p-1.5 hover:bg-white/10 rounded-lg text-white/30 hover:text-secondary">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      </button>
                      <button (click)="deleteTicket(t._id)" class="p-1.5 hover:bg-red-500/20 rounded-lg text-white/20 hover:text-red-400">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
                <div *ngIf="!stats()?.recentSales?.length" class="py-16 text-center text-white/20 text-sm">
                  No hay ventas registradas aún
                </div>
              </div>
            </div>
          </div>

          <!-- ===== PAYMENTS VIEW ===== -->
          <div *ngIf="view() === 'payments'" class="space-y-4">
            <div class="flex items-center justify-between mb-2">
              <div>
                <h4 class="font-display text-xl font-bold">Validación de Pagos</h4>
                <p class="text-white/30 text-xs mt-1">Confirma el depósito en Yape antes de aprobar cada pago</p>
              </div>
              <span *ngIf="stats()?.pendingVerification > 0"
                    class="px-3 py-1 bg-orange-500/15 text-orange-400 border border-orange-500/20 rounded-full text-xs font-bold">
                {{stats()?.pendingVerification}} pendientes
              </span>
            </div>

            <div *ngIf="stats()?.verificationNeeded?.length === 0" class="py-24 text-center">
              <div class="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <svg class="w-7 h-7 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <p class="text-white/20 text-sm font-medium">Ningún pago pendiente de verificación</p>
            </div>

            <div *ngFor="let t of stats()?.verificationNeeded"
                 class="bg-white/[0.04] border border-white/[0.07] rounded-2xl overflow-hidden hover:border-white/[0.12] transition-all">

              <!-- Card Header -->
              <div class="px-5 py-4 border-b border-white/[0.05] flex flex-wrap gap-3 justify-between items-center">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                    <svg class="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
                  <div>
                    <p class="font-bold text-white text-sm leading-tight">{{t.fullName}}</p>
                    <p class="text-[10px] text-white/30 font-mono mt-0.5">DNI: {{t.dni}}</p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase"
                        [ngClass]="t.type === 'NACACHO' ? 'bg-secondary/15 text-secondary border border-secondary/20' : 'bg-primary/15 text-primary border border-primary/20'">
                    Zona {{t.type}}
                  </span>
                  <span class="text-2xl font-display font-bold text-white">S/ {{t.price}}</span>
                </div>
              </div>

              <!-- Card Body -->
              <div class="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <p class="text-[9px] uppercase font-bold text-white/20 tracking-widest mb-1">Teléfono / Yape</p>
                  <p class="text-white font-semibold">{{t.phone}}</p>
                </div>
                <div>
                  <p class="text-[9px] uppercase font-bold text-white/20 tracking-widest mb-1">Correo Electrónico</p>
                  <p class="text-white/70">{{t.email}}</p>
                </div>
                <div>
                  <p class="text-[9px] uppercase font-bold text-white/20 tracking-widest mb-1">Registrado</p>
                  <p class="text-white/50">{{t.createdAt | date:'dd MMM yyyy, hh:mm a'}}</p>
                </div>
              </div>

              <!-- Card Actions -->
              <div class="px-5 py-4 bg-white/[0.02] border-t border-white/[0.05] flex flex-wrap gap-3 justify-end">
                <button (click)="viewDetails(t)" class="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-xl text-xs font-bold uppercase transition-all">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  Ver Detalle
                </button>
                <button (click)="deleteTicket(t._id)" class="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl text-xs font-bold uppercase transition-all">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  Rechazar
                </button>
                <button (click)="approvePayment(t._id)" [disabled]="isApproving === t._id"
                        class="flex items-center gap-2 px-5 py-2.5 bg-secondary text-dark rounded-xl text-xs font-bold uppercase hover:opacity-90 active:scale-95 transition-all disabled:opacity-50">
                  <svg *ngIf="isApproving !== t._id" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  <svg *ngIf="isApproving === t._id" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  <span>{{isApproving === t._id ? 'Aprobando...' : 'Aprobar Pago'}}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- ===== SCANNER VIEW ===== -->
          <div *ngIf="view() === 'scanner'" class="flex flex-col items-center gap-6 max-w-md mx-auto">
            <div>
              <h4 class="font-display text-xl font-bold text-center">Escáner de Entrada</h4>
              <p class="text-white/30 text-xs text-center mt-1">Apunta la cámara al código QR del ticket</p>
            </div>

            <div class="w-full rounded-3xl overflow-hidden ring-4 ring-white/5 shadow-2xl relative bg-black aspect-square">
              <zxing-scanner (scanSuccess)="onScanSuccess($event)" class="w-full h-full"></zxing-scanner>
              <!-- Scan frame overlay -->
              <div class="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div class="w-48 h-48 relative">
                  <div class="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-secondary rounded-tl-lg"></div>
                  <div class="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-secondary rounded-tr-lg"></div>
                  <div class="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-secondary rounded-bl-lg"></div>
                  <div class="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-secondary rounded-br-lg"></div>
                </div>
              </div>
            </div>

            <!-- Scan Result -->
            <div *ngIf="scanStatus()" class="w-full rounded-2xl overflow-hidden"
                 [ngClass]="scanStatus()?.success ? 'bg-primary/10 border border-primary/20' : 'bg-red-500/10 border border-red-500/20'">
              <div class="p-5">
                <div class="flex items-center gap-3 mb-4">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center"
                       [ngClass]="scanStatus()?.success ? 'bg-primary/20' : 'bg-red-500/20'">
                    <svg *ngIf="scanStatus()?.success" class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                    <svg *ngIf="!scanStatus()?.success" class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                  </div>
                  <div>
                    <p class="font-display font-bold text-base">{{scanStatus()?.message}}</p>
                    <p *ngIf="scanStatus()?.validatedAt" class="text-[10px] text-white/30 mt-0.5">
                      Validado: {{scanStatus()?.validatedAt | date:'dd MMM, hh:mm a'}}
                    </p>
                  </div>
                </div>

                <div *ngIf="scanStatus()?.success" class="grid grid-cols-3 gap-3 text-center bg-black/20 rounded-xl p-4">
                  <div>
                    <p class="text-[9px] uppercase font-bold text-white/20 mb-1">Nombre</p>
                    <p class="text-xs font-bold text-white leading-tight">{{scanStatus()?.fullName || '—'}}</p>
                  </div>
                  <div>
                    <p class="text-[9px] uppercase font-bold text-white/20 mb-1">DNI</p>
                    <p class="text-sm font-mono font-bold text-secondary">{{scanStatus()?.dni || '—'}}</p>
                  </div>
                  <div>
                    <p class="text-[9px] uppercase font-bold text-white/20 mb-1">Zona</p>
                    <p class="text-xs font-bold text-white">{{scanStatus()?.type || '—'}}</p>
                  </div>
                </div>

                <div *ngIf="!scanStatus()?.success && scanStatus()?.dni" class="mt-3 bg-black/20 rounded-xl p-4 flex justify-between items-center">
                  <span class="text-[10px] text-white/30 uppercase font-bold">DNI</span>
                  <span class="text-secondary font-display font-bold text-lg">{{scanStatus()?.dni}}</span>
                </div>
              </div>

              <div class="px-5 pb-5">
                <button (click)="scanStatus.set(null)" class="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-all">
                  Escanear otro ticket
                </button>
              </div>
            </div>
          </div>

        </main>
      </div>

      <!-- ===== TICKET DETAIL MODAL ===== -->
      <div *ngIf="selectedTicket()" class="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
           (click)="selectedTicket.set(null)">
        <div class="bg-[#111] w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
             (click)="$event.stopPropagation()">

          <!-- Modal Header -->
          <div class="bg-fest-gradient px-6 py-5 flex justify-between items-start border-b border-white/5">
            <div>
              <p class="text-[10px] font-bold uppercase text-secondary tracking-[0.2em] mb-1">Detalle de Entrada</p>
              <h3 class="font-display text-2xl font-bold uppercase italic">ZONA {{selectedTicket().type}}</h3>
            </div>
            <button (click)="selectedTicket.set(null)" class="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-xl text-white/60 hover:text-white transition-all">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

            <!-- Status + ID -->
            <div class="flex flex-wrap gap-3 justify-between items-center">
              <span class="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase border"
                    [ngClass]="{
                      'bg-orange-500/10 text-orange-400 border-orange-500/20': selectedTicket().status === 'verification',
                      'bg-primary/10 text-primary border-primary/20': selectedTicket().status === 'paid',
                      'bg-white/5 text-white/40 border-white/10': selectedTicket().status === 'pending'
                    }">
                {{ selectedTicket().status === 'paid' ? '✓ Pago Aprobado' : selectedTicket().status === 'verification' ? '⏳ En Verificación' : '○ Pendiente' }}
              </span>
              <span *ngIf="selectedTicket().isValidated" class="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-bold uppercase">
                <span class="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span> Ingresó al Evento
              </span>
            </div>

            <!-- Info Grid -->
            <div class="grid grid-cols-2 gap-px bg-white/[0.05] rounded-2xl overflow-hidden border border-white/[0.06]">
              <div class="bg-[#111] p-4">
                <p class="text-[9px] uppercase font-bold text-white/25 tracking-widest mb-1.5">Nombre Completo</p>
                <p class="text-sm font-bold text-white leading-snug">{{selectedTicket().fullName}}</p>
              </div>
              <div class="bg-[#111] p-4">
                <p class="text-[9px] uppercase font-bold text-white/25 tracking-widest mb-1.5">DNI</p>
                <p class="text-sm font-mono font-bold text-secondary tracking-widest">{{selectedTicket().dni}}</p>
              </div>
              <div class="bg-[#111] p-4">
                <p class="text-[9px] uppercase font-bold text-white/25 tracking-widest mb-1.5">Teléfono (Yape)</p>
                <p class="text-sm font-semibold text-white">{{selectedTicket().phone}}</p>
              </div>
              <div class="bg-[#111] p-4">
                <p class="text-[9px] uppercase font-bold text-white/25 tracking-widest mb-1.5">Correo</p>
                <p class="text-xs text-white/60 break-all">{{selectedTicket().email}}</p>
              </div>
              <div class="bg-[#111] p-4">
                <p class="text-[9px] uppercase font-bold text-white/25 tracking-widest mb-1.5">Precio Pagado</p>
                <p class="text-lg font-display font-bold text-secondary">S/ {{selectedTicket().price}}</p>
              </div>
              <div class="bg-[#111] p-4">
                <p class="text-[9px] uppercase font-bold text-white/25 tracking-widest mb-1.5">Zona</p>
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase inline-block"
                      [ngClass]="selectedTicket().type === 'NACACHO' ? 'bg-secondary/15 text-secondary' : 'bg-primary/15 text-primary'">
                  {{selectedTicket().type}}
                </span>
              </div>
              <div class="bg-[#111] p-4">
                <p class="text-[9px] uppercase font-bold text-white/25 tracking-widest mb-1.5">Fecha Registro</p>
                <p class="text-xs text-white/60">{{selectedTicket().createdAt | date:'dd MMM yyyy'}}</p>
                <p class="text-[10px] text-white/30">{{selectedTicket().createdAt | date:'hh:mm a'}}</p>
              </div>
              <div class="bg-[#111] p-4">
                <p class="text-[9px] uppercase font-bold text-white/25 tracking-widest mb-1.5">Validado en Puerta</p>
                <p *ngIf="selectedTicket().isValidated" class="text-xs text-primary font-semibold">
                  {{selectedTicket().validatedAt | date:'dd MMM yyyy, hh:mm a'}}
                </p>
                <p *ngIf="!selectedTicket().isValidated" class="text-xs text-white/25">No ingresó aún</p>
              </div>
            </div>

            <!-- QR Code -->
            <div *ngIf="selectedTicket().qrToken" class="border border-dashed border-white/10 rounded-2xl p-6 text-center bg-white/[0.02]">
              <p class="text-[9px] uppercase font-bold text-white/25 tracking-[0.3em] mb-4">Código QR de Entrada</p>
              <div class="inline-block bg-white p-3 rounded-2xl mb-4 shadow-xl">
                <img [src]="selectedTicket().qrDataUrl" class="w-32 h-32">
              </div>
              <p class="font-mono text-[10px] font-bold text-secondary tracking-[0.3em] uppercase">{{selectedTicket().qrToken}}</p>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="px-6 py-4 bg-white/[0.02] border-t border-white/[0.05] flex gap-3">
            <button (click)="selectedTicket.set(null)" class="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold uppercase text-white/50 hover:text-white transition-all">
              Cerrar
            </button>
            <button (click)="deleteTicket(selectedTicket()._id); selectedTicket.set(null)" class="px-6 py-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              Eliminar
            </button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; }
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
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
  selectedTicket = signal<any>(null);
  isApproving: string | null = null;
  pinErrorMessage = signal('');

  onPinChange() {
    this.pin = this.pin.replace(/\D/g, '');
    if (this.pin.length === 4) {
      this.login();
    }
  }

  login() {
    if (this.pin.length !== 4) return;
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
    if (this.scanStatus()) return;
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
    } catch (e) {
      alert('Error aprobando pago');
      this.isApproving = null;
    }
  }

  async deleteTicket(ticketId: string) {
    if (!confirm('¿Eliminar esta venta? Esta acción no se puede deshacer.')) return;
    try {
      await lastValueFrom(this.http.delete(`/api/backoffice/tickets/${ticketId}`));
      this.loadStats();
    } catch (e) {
      alert('Error eliminando ticket');
    }
  }

  viewDetails(ticket: any) {
    this.selectedTicket.set(ticket);
  }
}
