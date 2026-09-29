import { Service } from 'koatty_core';

export interface Order {
  orderNo: string;
  customer: string;
  status: 'paid' | 'shipped' | 'refunded';
  amount: number;
}

export interface RefundRecord {
  orderNo: string;
  reason: string;
  refundedBy: string;
}

/**
 * Demo data store. In a real reference app this would be a `koatty_typeorm`
 * repository or a remote service — the important part for F-5 is that the tool
 * layer above it never touches storage directly.
 */
@Service()
export class OrderService {
  private readonly orders = new Map<string, Order>([
    ['A-1001', { orderNo: 'A-1001', customer: 'tenant-a', status: 'paid', amount: 199 }],
    ['A-1002', { orderNo: 'A-1002', customer: 'tenant-a', status: 'shipped', amount: 42 }],
  ]);

  private readonly refunds: RefundRecord[] = [];

  findByNo(orderNo: string): Order | undefined {
    return this.orders.get(orderNo);
  }

  list(): Order[] {
    return [...this.orders.values()];
  }

  refund(orderNo: string, reason: string, refundedBy: string): RefundRecord {
    const order = this.orders.get(orderNo);
    if (!order) {
      throw new Error(`order not found: ${orderNo}`);
    }
    if (order.status === 'refunded') {
      throw new Error(`order already refunded: ${orderNo}`);
    }
    order.status = 'refunded';
    const record: RefundRecord = { orderNo, reason, refundedBy };
    this.refunds.push(record);
    return record;
  }

  refundHistory(): RefundRecord[] {
    return [...this.refunds];
  }
}
