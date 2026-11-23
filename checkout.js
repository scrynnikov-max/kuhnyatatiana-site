const checkoutEndpoint = 'https://functions.yandexcloud.net/d4eu3tci8ksjktueaoni';

async function bookPaymentRequest(action, data) {
  const url = new URL(checkoutEndpoint);
  url.searchParams.set('action', action);
  const response = await fetch(url, {
    ...(data ? {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    } : {}),
    cache: 'no-store',
    credentials: 'omit',
    signal: AbortSignal.timeout(15000)
  });
  return { ok: response.ok, payload: await response.json() };
}

function bookPaymentUrl(value, allowedHosts) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password &&
      allowedHosts.includes(url.host) ? url.href : null;
  } catch {
    return null;
  }
}

function initBookPurchase(form) {
  const submit = form.querySelector('button[type="submit"]');
  const error = document.getElementById('checkout-error');
  let attempt;

  bookPaymentRequest('book_ready').then(({ ok, payload }) => {
    if (ok && payload.ready === true) {
      document.getElementById('checkout-unavailable').hidden = true;
      form.hidden = false;
    }
  }).catch(() => {});

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submit.disabled) return;
    const email = form.elements.email.value.trim();
    const now = Math.floor(Date.now() / 1000);
    if (!attempt || attempt.email !== email || now - attempt.created_at > 14 * 60) {
      attempt = { email, created_at: now, order_id: crypto.randomUUID() };
    }
    submit.disabled = true;
    error.hidden = true;
    error.textContent = '';
    try {
      const { ok, payload } = await bookPaymentRequest('book_create', attempt);
      const redirect = bookPaymentUrl(payload.url, ['yookassa.ru', 'yoomoney.ru']);
      if (!ok || !redirect) throw new Error(payload.error || 'Оплата сейчас недоступна.');
      try {
        localStorage.setItem('book-payment:' + payload.order, payload.payment);
      } catch {
        // The checkout can recover the order from its signed return URL.
      }
      window.location.assign(redirect);
    } catch (e) {
      error.textContent = e.name === 'TimeoutError' || e instanceof TypeError
        ? 'Связь прервалась. Попробуй ещё раз.'
        : e.message;
      error.hidden = false;
      submit.disabled = false;
    }
  });
}

function initBookDelivery(results) {
  const status = results.querySelector('[role="status"]');
  const download = document.getElementById('download-book');
  const retry = document.getElementById('check-book-payment');
  const order = new URLSearchParams(location.search).get('order');
  let payment;
  try {
    if (order) payment = localStorage.getItem('book-payment:' + order);
  } catch {
    // A verified order can also be located through the payment provider.
  }

  if (!order) {
    status.textContent = 'Открой эту страницу по ссылке, на которую вернула ЮKassa после платежа.';
    return;
  }

  const delays = [3000, 7000, 12000, 20000];
  let timer;
  let running = false;
  async function check(attempt) {
    if (running) return;
    clearTimeout(timer);
    running = true;
    retry.hidden = true;
    status.textContent = 'Проверяем статус заказа…';
    try {
      const { ok, payload } = await bookPaymentRequest('book_check', { order, payment });
      if (ok && payload.status === 'succeeded') {
        const url = bookPaymentUrl(payload.download, ['disk.yandex.ru', 'disk.yandex.com']);
        if (!url) throw new Error('Invalid download');
        status.textContent = 'Оплата подтверждена. Твоя книга готова к скачиванию.';
        download.href = url;
        download.hidden = false;
      } else if (ok && payload.status === 'pending') {
        status.textContent = 'ЮKassa ещё обрабатывает платёж.';
        if (attempt < delays.length) {
          timer = setTimeout(() => check(attempt + 1), delays[attempt]);
        } else {
          retry.hidden = false;
        }
      } else if (ok && payload.status === 'canceled') {
        status.textContent = 'Платёж отменён. Вернись к книге, если хочешь оформить покупку заново.';
      } else if (payload.status === 'invalid' || payload.status === 'unverified') {
        status.textContent = 'Не получилось подтвердить оплату по этой ссылке. Если деньги списались, напиши в поддержку.';
      } else {
        throw new Error('Unconfirmed payment');
      }
    } catch {
      status.textContent = 'Пока не удалось проверить оплату. Попробуй ещё раз. Если деньги списались, напиши в поддержку.';
      retry.hidden = false;
    } finally {
      running = false;
    }
  }

  retry.addEventListener('click', () => check(0));
  check(0);
}

const bookPurchase = document.getElementById('checkout-form');
if (bookPurchase) initBookPurchase(bookPurchase);
const bookDelivery = document.getElementById('book-delivery');
if (bookDelivery) initBookDelivery(bookDelivery);
