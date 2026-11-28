import { expect } from 'chai';
import { Router } from '../src/router.js';

function createContext(method: string, path: string) {
  return {
    req: {
      method,
      url: new URL(`http://localhost${path}`),
      params: {}
    }
  } as any;
}

describe('Router', () => {
  it('matches GET route', async () => {
    const router = new Router();

    let called = false;

    router.get('/hello', async () => {
      called = true;
    });

    const ctx = createContext('GET', '/hello');

    await router.middleware(ctx, async () => {});

    expect(called).to.equal(true);
  });

  it('does not match wrong method', async () => {
    const router = new Router();

    let called = false;

    router.get('/hello', async () => {
      called = true;
    });

    const ctx = createContext('POST', '/hello');

    await router.middleware(ctx, async () => {});

    expect(called).to.equal(false);
  });

  it('extracts params', async () => {
    const router = new Router();

    router.get('/users/:id', async () => {});

    const ctx = createContext('GET', '/users/123');

    const resolved = router.resolve(ctx);

    expect(resolved).to.not.equal(undefined);
    expect(ctx.req.params.id).to.equal('123');
  });

  it('calls next if no route', async () => {
    const router = new Router();

    let nextCalled = false;

    const ctx = createContext('GET', '/unknown');

    await router.middleware(ctx, async () => {
      nextCalled = true;
    });

    expect(nextCalled).to.equal(true);
  });

  it('uses middleware for every matched route', async () => {
    const router = new Router();
    const calls: string[] = [];

    router.use(async (_ctx, next) => {
      calls.push('before route');
      await next();
      calls.push('after route');
    });
    router.get('/first', () => {
      calls.push('first route');
    });
    router.get('/second', () => {
      calls.push('second route');
    });

    await router.middleware(createContext('GET', '/first'), async () => {});
    await router.middleware(createContext('GET', '/second'), async () => {});

    expect(calls).to.deep.equal([
      'before route',
      'first route',
      'after route',
      'before route',
      'second route',
      'after route'
    ]);
  });

  it('chains route middleware in registration order', async () => {
    const router = new Router();
    const calls: string[] = [];

    const result = router
      .use(async (_ctx, next) => {
        calls.push('first before');
        await next();
        calls.push('first after');
      })
      .use(async (_ctx, next) => {
        calls.push('second before');
        await next();
        calls.push('second after');
      });

    router.get('/hello', () => {
      calls.push('route');
    });

    await router.middleware(createContext('GET', '/hello'), async () => {});

    expect(result).to.equal(router);
    expect(calls).to.deep.equal([
      'first before',
      'second before',
      'route',
      'second after',
      'first after'
    ]);
  });

  it('does not use route middleware if no route matches', async () => {
    const router = new Router();
    let middlewareCalled = false;
    let nextCalled = false;

    router.use(() => {
      middlewareCalled = true;
    });

    await router.middleware(createContext('GET', '/unknown'), async () => {
      nextCalled = true;
    });

    expect(middlewareCalled).to.equal(false);
    expect(nextCalled).to.equal(true);
  });

  it('all() matches any method', async () => {
    const router = new Router();

    let called = false;

    router.all('/hello', async () => {
      called = true;
    });

    const ctx = createContext('PUT', '/hello');

    await router.middleware(ctx, async () => {});

    expect(called).to.equal(true);
  });
});
