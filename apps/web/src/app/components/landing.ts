import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PricingService } from '../services/pricing.service';
import { CheckoutComponent } from './checkout';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, CheckoutComponent],
  template: `
    <div class="min-h-screen bg-page flex flex-col font-body">
      <!-- Branded Header -->
      <header class="sticky top-0 z-50 bg-page/80 backdrop-blur-md border-b border-accent/10 px-6 py-4 flex justify-between items-center">
        <div class="flex items-center gap-3">
          <img src="/logo.jpeg" alt="Llaqta Producciones" class="h-12 w-12 rounded-lg shadow-sm">
          <span class="font-display font-bold text-accent text-xl tracking-tight">LLAQTA PRODUCCIONES</span>
        </div>
        <button (click)="scrollTo('pricing')" class="btn-primary !py-2 !px-6 text-sm">
          Comprar Entradas
        </button>
      </header>

      <main class="flex-grow">
        <!-- Hero Section -->
        <section class="relative h-[80vh] flex items-center justify-center overflow-hidden">
          <div class="absolute inset-0">
            <img src="/fondo.jpeg" alt="Background" class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-black/55"></div>
          </div>
          
          <div class="relative z-10 text-center px-6 max-w-4xl mx-auto">
            <div class="inline-block px-4 py-1 bg-secondary text-dark font-bold text-xs rounded-full mb-6 tracking-widest uppercase">
              16 MAYO | PUQUIO | 2026
            </div>
            <h1 class="font-display text-6xl md:text-8xl font-extrabold text-white mb-6 leading-none">
              LLAQTA <span class="text-secondary italic">FEST</span>
            </h1>
            <p class="text-white/80 text-lg md:text-xl max-w-2xl mx-auto mb-10 font-light leading-relaxed">
              Vive la experiencia más grande del folclore andino con Max Castro, Diosdado Gaitán Castro y más. 
              Un encuentro inolvidable en el Salón Centenario.
            </p>
            <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button (click)="scrollTo('pricing')" class="btn-primary text-lg px-10">
                Obtener mis entradas
              </button>
              <div class="flex items-center gap-2 text-white/60 text-sm">
                <span class="w-2 h-2 bg-secondary rounded-full animate-pulse"></span>
                Quedan pocas entradas en Pre-venta
              </div>
            </div>
          </div>
        </section>

        <!-- Flyer Detail Section -->
        <section class="py-20 px-6 bg-white">
          <div class="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div class="rounded-3xl overflow-hidden shadow-2xl shadow-accent/20 border-8 border-page">
              <img src="/flyer.jpeg" alt="Llaqta Fest Flyer" class="w-full">
            </div>
            <div>
              <h2 class="font-display text-4xl font-bold text-accent mb-6">El evento más esperado del año</h2>
              <div class="text-accent/70 text-lg mb-8 leading-relaxed space-y-4">
                <p>Existe un lugar donde mayo se convierte en fiesta…<br>donde siempre queremos volver.</p>
                <p>Donde Tayta Achico abraza a sus hijos,<br>y las calles se llenan de reencuentros,<br>de familia, de amigos, de historia.</p>
                <p>Es nuestro Llaqta,<br>donde el sol renace,<br>donde la fe vive,<br>y donde nuestras raíces nos guían.</p>
                <p>Hoy, nuestra tierra celebra…<br>late…<br>y nos llama.</p>
                <p class="font-bold text-accent">LLAQTA FEST 2026 – Tikuy Tusun Puquio<br>
                  <span class="font-normal">No es solo un festival…<br>es volver a lo nuestro.</span>
                </p>
                <p class="font-semibold">No te lo pierdas.</p>
              </div>
              <ul class="space-y-4">
                <li *ngFor="let feat of features" class="flex items-center gap-3 text-dark/80">
                  <div class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">✓</div>
                  {{feat}}
                </li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Pricing Section -->
        <section id="pricing" class="py-24 px-6 bg-page relative overflow-hidden">
          <div class="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div class="absolute bottom-0 left-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl -ml-20 -mb-20"></div>

          <div class="max-w-5xl mx-auto relative z-10 text-center">
            <h2 class="font-display text-5xl font-bold text-accent mb-4">Adquiere tu entrada</h2>
            
            <!-- Countdown Banner -->
            <div *ngIf="pricing.timeToNextChange() as time" class="inline-flex items-center gap-4 bg-accent text-white px-6 py-3 rounded-2xl mb-12 shadow-lg">
              <span class="text-xs uppercase tracking-widest text-secondary font-bold">Próximo cambio de precio en:</span>
              <div class="flex gap-3 font-display font-medium text-xl">
                <div>{{time.days}}d</div>
                <div class="text-white/30">:</div>
                <div>{{time.hours}}h</div>
                <div class="text-white/30">:</div>
                <div>{{time.minutes}}m</div>
              </div>
            </div>

            <div class="grid md:grid-cols-2 gap-8 items-stretch">
              <!-- General Card -->
              <div class="glass-card !bg-white p-10 flex flex-col border-2 border-transparent transition-all hover:border-primary/20 hover:shadow-2xl">
                <div class="mb-6">
                  <span class="text-xs font-bold uppercase tracking-widest text-primary mb-2 block">Acceso Preferencial</span>
                  <h3 class="font-display text-3xl font-bold">ZONA LLAMICHU</h3>
                </div>
                <div class="mb-8">
                  <div class="flex items-center justify-center gap-2 mb-1">
                    <span class="text-gray-400 line-through text-lg">S/ {{pricing.prices().general.original}}</span>
                    <span class="bg-secondary/20 text-accent text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {{pricing.prices().discountPercentage}}% DSCTO
                    </span>
                  </div>
                  <div class="flex items-center justify-center">
                    <span class="text-2xl font-bold text-gray-500 mr-1">S/</span>
                    <span class="text-7xl font-display font-extrabold text-accent leading-none">
                      {{pricing.prices().general.current}}
                    </span>
                  </div>
                </div>
                <ul class="text-left space-y-4 mb-10 flex-grow">
                  <li class="flex items-start gap-2 text-sm text-gray-600">
                    <span class="text-primary mt-0.5">●</span>
                    Acceso a zona Llamichu del Salón Centenario.
                  </li>
                  <li class="flex items-start gap-2 text-sm text-gray-600">
                    <span class="text-primary mt-0.5">●</span>
                    Participación en sorteos de auspiciadores.
                  </li>
                </ul>
                <button (click)="openCheckout('LLAMICHU')" class="btn-primary w-full">Comprar Llamichu</button>
              </div>

              <!-- VIP Card -->
              <div class="glass-card !bg-accent p-10 flex flex-col border-4 border-secondary transition-all hover:shadow-2xl relative overflow-hidden">
                <div class="absolute top-0 right-0 bg-secondary text-dark font-bold text-[10px] py-1 px-4 rotate-45 translate-x-3 translate-y-3 uppercase tracking-tighter">
                  Más Popular
                </div>
                <div class="mb-6">
                  <span class="text-xs font-bold uppercase tracking-widest text-secondary mb-2 block">Experiencia Exclusiva</span>
                  <h3 class="font-display text-3xl font-bold text-white uppercase italic">ZONA NACACHO</h3>
                </div>
                <div class="mb-8">
                  <div class="flex items-center justify-center gap-2 mb-1">
                    <span class="text-white/40 line-through text-lg">S/ {{pricing.prices().vip.original}}</span>
                    <span class="bg-secondary text-dark text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {{pricing.prices().discountPercentage}}% DSCTO
                    </span>
                  </div>
                  <div class="flex items-center justify-center">
                    <span class="text-2xl font-bold text-secondary mr-1">S/</span>
                    <span class="text-7xl font-display font-extrabold text-white leading-none">
                      {{pricing.prices().vip.current}}
                    </span>
                  </div>
                </div>
                <ul class="text-left space-y-4 mb-10 flex-grow">
                  <li class="flex items-start gap-2 text-sm text-white/80">
                    <span class="text-secondary mt-0.5">●</span>
                    Ubicación privilegiada Nacacho (Frente al escenario).
                  </li>
                  <li class="flex items-start gap-2 text-sm text-white/80">
                    <span class="text-secondary mt-0.5">●</span>
                    Ingreso preferencial sin colas.
                  </li>
                  <li class="flex items-start gap-2 text-sm text-white/80">
                    <span class="text-secondary mt-0.5">●</span>
                    Póster oficial del evento de regalo.
                  </li>
                </ul>
                <button (click)="openCheckout('NACACHO')" class="btn-primary !bg-secondary !text-dark w-full">Comprar Nacacho</button>
              </div>
            </div>
          </div>
        </section>

        <!-- Dynamic Checkout Modal -->
        <app-checkout *ngIf="showCheckout()" 
                     [ticketType]="selectedType()" 
                     [price]="selectedPrice()" 
                     (close)="showCheckout.set(false)">
        </app-checkout>
      </main>

      <!-- Minimal Footer -->
      <footer class="bg-dark py-12 px-6 text-center text-white/40 border-t border-white/5">
        <img src="/logo.jpeg" alt="Logo" class="h-10 w-10 mx-auto rounded-md opacity-50 mb-4 grayscale">
        <p class="text-xs uppercase tracking-widest mb-2 font-display">Llaqta Producciones © 2026</p>
        <p class="text-[10px]">Puquio, Perú | Salón y Eventos Centenario</p>
      </footer>
    </div>
  `,
  styles: [`
    :host { display: block; }
    #pricing { scroll-margin-top: 80px; }
  `]
})
export class LandingComponent {
  pricing = inject(PricingService);

  showCheckout = signal(false);
  selectedType = signal<'NACACHO' | 'LLAMICHU'>('LLAMICHU');
  selectedPrice = signal(0);

  features = [
    "Sonido lineal de alta fidelidad",
    "Seguridad privada garantizada",
    "Venta de comida y bebidas tradicionales",
    "Estacionamiento disponible"
  ];

  openCheckout(type: 'NACACHO' | 'LLAMICHU') {
    this.selectedType.set(type);
    this.selectedPrice.set(type === 'NACACHO' ? this.pricing.prices().vip.current : this.pricing.prices().general.current);
    this.showCheckout.set(true);
  }

  scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }
}
