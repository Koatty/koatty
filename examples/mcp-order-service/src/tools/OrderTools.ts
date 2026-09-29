import { Service } from 'koatty_core';
import { Autowired } from 'koatty_container';
import { Resource, Tool } from 'koatty_mcp';
import { Validated } from 'koatty_validation';
import { QueryOrderDto } from '../dto/QueryOrderDto';
import { RefundDto } from '../dto/RefundDto';
import { OrderService } from '../service/OrderService';

/**
 * The reference MCP surface (F-5): two read-only tools, one destructive tool
 * that needs human approval and one resource.
 *
 * Everything below is plain Koatty: `@Service` for IoC, `@Validated` for the
 * shared whitelist validation, `@Tool` / `@Resource` for the protocol metadata.
 * The host resolves this component from the container, so `@Autowired` fields
 * are injected for every call.
 */
@Service()
export class OrderTools {
  @Autowired()
  private orders!: OrderService;

  @Tool({
    name: 'order_query',
    description: '按订单号查询订单状态（只读）',
    annotations: { readOnlyHint: true },
  })
  @Validated({ async: false, types: [QueryOrderDto] })
  async query(input: QueryOrderDto) {
    const order = this.orders.findByNo(input.orderNo);
    if (!order) {
      throw new Error(`order not found: ${input.orderNo}`);
    }
    // `validatedInput` is echoed on purpose: it lets the regression suite prove
    // that undeclared fields were stripped by the shared validation path.
    return { order, validatedInput: input };
  }

  @Tool({
    name: 'order_list',
    description: '列出当前租户的订单（只读）',
    annotations: { readOnlyHint: true },
  })
  async list() {
    return { orders: this.orders.list() };
  }

  @Tool({
    name: 'order_refund',
    description: '对订单发起退款（写操作，需要人工审批）',
    annotations: { destructiveHint: true },
    requireApproval: true,
    scopes: ['order:refund'],
  })
  @Validated({ async: false, types: [RefundDto] })
  async refund(input: RefundDto) {
    // Identity comes from the request context that koatty_mcp sets up per call
    // (`this.app.getCurrentContext().principal`) — the demo service keeps the
    // caller out of the record to stay storage-agnostic.
    return this.orders.refund(input.orderNo, input.reason, 'mcp-caller');
  }

  @Resource({ uri: 'order://{orderNo}', mimeType: 'application/json' })
  async orderResource(params: { orderNo: string }) {
    const order = this.orders.findByNo(params.orderNo);
    if (!order) {
      throw new Error(`order not found: ${params.orderNo}`);
    }
    return order;
  }
}
