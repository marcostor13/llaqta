import { Injectable, signal, computed } from '@angular/core';

export interface PricingTier {
  name: string;
  discount: number;
  startDate: Date;
  endDate: Date;
}

@Injectable({
  providedIn: 'root'
})
export class PricingService {
  private readonly BASE_VIP = 75;
  private readonly BASE_GENERAL = 59;

  // Discount periods for 2026
  private readonly tiers: PricingTier[] = [
    {
      name: 'Pre-venta FASE 1',
      discount: 0.20,
      startDate: new Date('2026-04-12T00:00:00'),
      endDate: new Date('2026-04-30T23:59:59')
    },
    {
      name: 'Pre-venta FASE 2',
      discount: 0.10,
      startDate: new Date('2026-05-01T00:00:00'),
      endDate: new Date('2026-05-13T23:59:59')
    }
  ];

  // Using signals for reactivity
  currentTime = signal(new Date());

  constructor() {
    // Update time every minute
    setInterval(() => {
      this.currentTime.set(new Date());
    }, 60000);
  }

  currentTier = computed(() => {
    const now = this.currentTime();
    return this.tiers.find(t => now >= t.startDate && now <= t.endDate) || null;
  });

  nextTier = computed(() => {
    const now = this.currentTime();
    return this.tiers.find(t => now < t.startDate) || null;
  });

  prices = computed(() => {
    const tier = this.currentTier();
    const discount = tier ? tier.discount : 0;
    
    return {
      vip: {
        original: this.BASE_VIP,
        current: Math.round(this.BASE_VIP * (1 - discount))
      },
      general: {
        original: this.BASE_GENERAL,
        current: Math.round(this.BASE_GENERAL * (1 - discount))
      },
      discountPercentage: Math.round(discount * 100)
    };
  });

  timeToNextChange = computed(() => {
    const tier = this.currentTier();
    const next = this.nextTier();
    const now = this.currentTime();

    if (tier) {
      return this.getTimeRemaining(tier.endDate);
    } else if (next) {
       return this.getTimeRemaining(next.startDate);
    }
    return null;
  });

  private getTimeRemaining(target: Date) {
    const total = target.getTime() - this.currentTime().getTime();
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    return { total, days, hours, minutes };
  }
}
