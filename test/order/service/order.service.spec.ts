import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from '../../../src/api/order/order.service';
import { ProductRepository } from '../../../src/api/order/repository/product.repository';
import { OrderRepository } from '../../../src/api/order/repository/order.repository';
import { ProductFixture } from '../../fixture/product.fixture';
import { OrderCreateRequestDto } from '../../../src/api/order/dto/request/order-create-request.dto';
import { Order } from '../../../src/api/order/domain/order.entity';
import { ProductType } from '../../../src/api/order/domain/product-type';
import { OrderStatus } from '../../../src/api/order/domain/order-status';
import { OrderProduct } from '../../../src/api/order/domain/order-product.entity';

describe('OrderService', () => {
  let sut: OrderService;
  let productRepository: jest.Mocked<ProductRepository>;
  let orderRepository: jest.Mocked<OrderRepository>;

  beforeEach(async () => {
    // given
    const mockProductRepository = {
      findAllByProductNumberIn: jest.fn(),
    };

    const mockOrderRepository = {
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: ProductRepository,
          useValue: mockProductRepository,
        },
        {
          provide: OrderRepository,
          useValue: mockOrderRepository,
        },
      ],
    }).compile();

    sut = module.get<OrderService>(OrderService);
    productRepository = module.get(ProductRepository);
    orderRepository = module.get(OrderRepository);
  });

  describe('create', () => {
    it('상품번호 리스트로 주문을 생성하고 저장된 주문 정보를 반환한다', async () => {
      // given
      const now = new Date('2024-03-19T00:00:00Z');
      const products = [
        ProductFixture.create('001', ProductType.GENERAL, 1_000, '상품1'),
        ProductFixture.create('002', ProductType.GENERAL, 2_000, '상품2'),
      ];
      const requestDto = OrderCreateRequestDto.of(['001', '002']);

      const mockOrder = new Order();
      mockOrder.id = 1;
      mockOrder.orderStatus = OrderStatus.READY;
      mockOrder.totalPrice = 3_000;
      mockOrder.registeredDateTime = now;
      mockOrder.orderProducts = products.map((product) => {
        const orderProduct = new OrderProduct();
        orderProduct.product = product;
        return orderProduct;
      });

      productRepository.findAllByProductNumberIn.mockResolvedValue(products);
      orderRepository.save.mockResolvedValue(mockOrder);

      // when
      const result = await sut.create(requestDto, now);

      // then
      expect(productRepository.findAllByProductNumberIn).toHaveBeenCalledWith([
        '001',
        '002',
      ]);
      expect(orderRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.totalPrice).toBe(3_000); // 1_000 + 2_000
      expect(result.registeredDateTime).toEqual(now);
      expect(result.products).toHaveLength(2);
      expect(result.products[0].price).toBe(1_000);
      expect(result.products[1].price).toBe(2_000);
    });

    it('상품이 존재하지 않는 경우에도 주문을 생성한다', async () => {
      // given
      const now = new Date('2024-03-19T00:00:00Z');
      const requestDto = OrderCreateRequestDto.of(['999']);

      const mockOrder = new Order();
      mockOrder.id = 2;
      mockOrder.orderStatus = OrderStatus.READY;
      mockOrder.totalPrice = 0;
      mockOrder.registeredDateTime = now;
      mockOrder.orderProducts = [];

      productRepository.findAllByProductNumberIn.mockResolvedValue([]);
      orderRepository.save.mockResolvedValue(mockOrder);

      // when
      const result = await sut.create(requestDto, now);

      // then
      expect(productRepository.findAllByProductNumberIn).toHaveBeenCalledWith([
        '999',
      ]);
      expect(orderRepository.save).toHaveBeenCalled();
      expect(result.totalPrice).toBe(0);
      expect(result.registeredDateTime).toEqual(now);
      expect(result.products).toHaveLength(0);
    });

    it('중복된 상품번호로 주문을 생성할 수 있다', async () => {
      // given
      const now = new Date('2024-03-19T00:00:00Z');
      const products = [
        ProductFixture.create('001', ProductType.GENERAL, 1_000, '상품1'),
      ];
      const requestDto = OrderCreateRequestDto.of(['001', '001']);

      const mockOrder = new Order();
      mockOrder.id = 3;
      mockOrder.orderStatus = OrderStatus.READY;
      mockOrder.totalPrice = 1_000;
      mockOrder.registeredDateTime = now;
      mockOrder.orderProducts = products.map((product) => {
        const orderProduct = new OrderProduct();
        orderProduct.product = product;
        return orderProduct;
      });

      productRepository.findAllByProductNumberIn.mockResolvedValue(products);
      orderRepository.save.mockResolvedValue(mockOrder);

      // when
      const result = await sut.create(requestDto, now);

      // then
      expect(productRepository.findAllByProductNumberIn).toHaveBeenCalledWith([
        '001',
        '001',
      ]);
      expect(orderRepository.save).toHaveBeenCalled();
      expect(result.totalPrice).toBe(1_000);
      expect(result.registeredDateTime).toEqual(now);
      expect(result.products).toHaveLength(1);
      expect(result.products[0].price).toBe(1_000);
    });
  });
});
