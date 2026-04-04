# Email (Resend) — Полная настройка

> Resend — современный сервис для транзакционных email. Простой API, React Email поддержка.

---

## 📋 СОДЕРЖАНИЕ

1. [Создание аккаунта](#создание-аккаунта)
2. [Настройка домена](#настройка-домена)
3. [Интеграция с Next.js](#nextjs-интеграция)
4. [React Email шаблоны](#react-email)
5. [Типичные письма](#типичные-письма)
6. [Очередь отправки](#очередь)
7. [Checklist](#checklist)

---

## 1. Создание аккаунта {#создание-аккаунта}

### Шаги:

1. Перейти на [resend.com](https://resend.com)
2. "Get Started" → GitHub / Google / Email
3. Создать API Key

### Pricing:

| План       | Стоимость | Emails/month |
| ---------- | --------- | ------------ |
| Free       | $0        | 3,000        |
| Pro        | $20/month | 50,000       |
| Enterprise | Custom    | Unlimited    |

### Free tier:

- 3,000 emails/month
- 100 emails/day
- 1 custom domain

### После регистрации:

1. API Keys → "Create API Key"
2. Скопировать `RESEND_API_KEY`

---

## 2. Настройка домена {#настройка-домена}

> Без своего домена письма будут от `onboarding@resend.dev`

### Добавление домена:

1. Domains → "Add Domain"
2. Ввести: `mail.example.com` (рекомендуется subdomain)
3. Получить DNS записи

### DNS записи:

```
# SPF
Type: TXT
Name: mail
Value: v=spf1 include:_spf.resend.com ~all

# DKIM (несколько записей)
Type: TXT
Name: resend._domainkey.mail
Value: [значение из Resend]

# Optional: DMARC
Type: TXT
Name: _dmarc.mail
Value: v=DMARC1; p=none;
```

### Верификация:

1. После добавления DNS записей
2. Domains → "Verify"
3. Статус: Verified ✓

---

## 3. Интеграция с Next.js {#nextjs-интеграция}

### Установка:

```bash
npm install resend
```

### Базовая настройка:

```typescript
// lib/resend.ts
import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);
```

### Environment Variables:

```bash
RESEND_API_KEY=re_xxx
EMAIL_FROM=noreply@mail.example.com
```

### Отправка письма:

```typescript
// lib/email.ts
import { resend } from './resend';

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error('Email error:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}
```

### API Route:

```typescript
// app/api/email/route.ts
import { resend } from '@/lib/resend';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { to, subject, html } = await request.json();

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to,
      subject,
      html,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
```

---

## 4. React Email шаблоны {#react-email}

### Установка:

```bash
npm install @react-email/components react-email
```

### Структура:

```
emails/
├── welcome.tsx
├── reset-password.tsx
├── order-confirmation.tsx
└── components/
    ├── header.tsx
    ├── footer.tsx
    └── button.tsx
```

### Базовый шаблон:

```tsx
// emails/components/base-layout.tsx
import { Body, Container, Head, Html, Preview, Section, Text } from '@react-email/components';

interface BaseLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function BaseLayout({ preview, children }: BaseLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>YourApp</Text>
          </Section>

          {/* Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>© 2024 YourApp. All rights reserved.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const header = {
  padding: '20px 48px',
  borderBottom: '1px solid #e6e6e6',
};

const logo = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#333',
};

const content = {
  padding: '24px 48px',
};

const footer = {
  padding: '20px 48px',
  borderTop: '1px solid #e6e6e6',
};

const footerText = {
  color: '#8898aa',
  fontSize: '12px',
};
```

### Welcome Email:

```tsx
// emails/welcome.tsx
import { Button, Heading, Text } from '@react-email/components';
import { BaseLayout } from './components/base-layout';

interface WelcomeEmailProps {
  name: string;
  loginUrl: string;
}

export function WelcomeEmail({ name, loginUrl }: WelcomeEmailProps) {
  return (
    <BaseLayout preview={`Welcome to YourApp, ${name}!`}>
      <Heading style={heading}>Welcome, {name}!</Heading>

      <Text style={text}>
        Thanks for signing up for YourApp. We're excited to have you on board.
      </Text>

      <Text style={text}>To get started, click the button below to log in to your account:</Text>

      <Button style={button} href={loginUrl}>
        Go to Dashboard
      </Button>

      <Text style={text}>
        If you have any questions, just reply to this email—we're always happy to help.
      </Text>
    </BaseLayout>
  );
}

const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  marginBottom: '24px',
};

const text = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#333',
  marginBottom: '16px',
};

const button = {
  backgroundColor: '#007bff',
  borderRadius: '4px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
  marginBottom: '24px',
};

export default WelcomeEmail;
```

### Отправка с React Email:

```typescript
// lib/email.ts
import { resend } from './resend';
import { WelcomeEmail } from '@/emails/welcome';
import { render } from '@react-email/render';

export async function sendWelcomeEmail(to: string, name: string) {
  const html = render(
    WelcomeEmail({
      name,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    }),
  );

  return resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: 'Welcome to YourApp!',
    html,
  });
}
```

### Preview во время разработки:

```bash
# package.json
{
  "scripts": {
    "email:dev": "email dev --dir emails --port 3001"
  }
}

# Запуск
npm run email:dev
# Открыть http://localhost:3001
```

---

## 5. Типичные письма {#типичные-письма}

### Reset Password:

```tsx
// emails/reset-password.tsx
import { Button, Heading, Text } from '@react-email/components';
import { BaseLayout } from './components/base-layout';

interface ResetPasswordEmailProps {
  resetUrl: string;
  expiresIn: string;
}

export function ResetPasswordEmail({ resetUrl, expiresIn }: ResetPasswordEmailProps) {
  return (
    <BaseLayout preview="Reset your password">
      <Heading style={heading}>Reset your password</Heading>

      <Text style={text}>
        We received a request to reset your password. Click the button below to choose a new
        password:
      </Text>

      <Button style={button} href={resetUrl}>
        Reset Password
      </Button>

      <Text style={smallText}>
        This link will expire in {expiresIn}. If you didn't request this, you can safely ignore this
        email.
      </Text>
    </BaseLayout>
  );
}
```

### Order Confirmation:

```tsx
// emails/order-confirmation.tsx
import { Heading, Text, Section, Row, Column } from '@react-email/components';
import { BaseLayout } from './components/base-layout';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface OrderConfirmationEmailProps {
  orderNumber: string;
  items: OrderItem[];
  total: number;
  shippingAddress: string;
}

export function OrderConfirmationEmail({
  orderNumber,
  items,
  total,
  shippingAddress,
}: OrderConfirmationEmailProps) {
  return (
    <BaseLayout preview={`Order #${orderNumber} confirmed`}>
      <Heading style={heading}>Order Confirmed!</Heading>

      <Text style={text}>
        Thank you for your order. Your order number is <strong>#{orderNumber}</strong>.
      </Text>

      <Section style={orderSection}>
        <Heading as="h2" style={subheading}>
          Order Summary
        </Heading>

        {items.map((item, index) => (
          <Row key={index} style={itemRow}>
            <Column>
              <Text style={itemName}>
                {item.name} × {item.quantity}
              </Text>
            </Column>
            <Column align="right">
              <Text style={itemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
            </Column>
          </Row>
        ))}

        <Row style={totalRow}>
          <Column>
            <Text style={totalLabel}>Total</Text>
          </Column>
          <Column align="right">
            <Text style={totalPrice}>${total.toFixed(2)}</Text>
          </Column>
        </Row>
      </Section>

      <Section>
        <Heading as="h2" style={subheading}>
          Shipping Address
        </Heading>
        <Text style={text}>{shippingAddress}</Text>
      </Section>
    </BaseLayout>
  );
}
```

### Email Functions:

```typescript
// lib/email.ts
import { resend } from './resend';
import { render } from '@react-email/render';
import { WelcomeEmail } from '@/emails/welcome';
import { ResetPasswordEmail } from '@/emails/reset-password';
import { OrderConfirmationEmail } from '@/emails/order-confirmation';

export async function sendWelcomeEmail(to: string, name: string) {
  const html = render(
    WelcomeEmail({
      name,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    }),
  );

  return resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: 'Welcome to YourApp!',
    html,
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`;
  const html = render(ResetPasswordEmail({ resetUrl, expiresIn: '1 hour' }));

  return resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: 'Reset your password',
    html,
  });
}

export async function sendOrderConfirmation(
  to: string,
  order: {
    orderNumber: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    total: number;
    shippingAddress: string;
  },
) {
  const html = render(OrderConfirmationEmail(order));

  return resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: `Order #${order.orderNumber} confirmed`,
    html,
  });
}
```

---

## 6. Очередь отправки {#очередь}

> Для надёжности отправляйте email через очередь (Upstash QStash).

### С QStash:

```typescript
// lib/email-queue.ts
import { Client } from '@upstash/qstash';

const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
});

export async function queueEmail(data: {
  template: 'welcome' | 'reset-password' | 'order-confirmation';
  to: string;
  props: Record<string, unknown>;
}) {
  await qstash.publishJSON({
    url: `${process.env.NEXT_PUBLIC_APP_URL}/api/queue/email`,
    body: data,
    retries: 3,
  });
}

// Использование
await queueEmail({
  template: 'welcome',
  to: user.email,
  props: { name: user.name },
});
```

### Обработчик очереди:

```typescript
// app/api/queue/email/route.ts
import { verifySignature } from '@upstash/qstash/nextjs';
import { sendWelcomeEmail, sendPasswordResetEmail, sendOrderConfirmation } from '@/lib/email';

async function handler(request: Request) {
  const { template, to, props } = await request.json();

  switch (template) {
    case 'welcome':
      await sendWelcomeEmail(to, props.name);
      break;
    case 'reset-password':
      await sendPasswordResetEmail(to, props.token);
      break;
    case 'order-confirmation':
      await sendOrderConfirmation(to, props);
      break;
    default:
      throw new Error(`Unknown template: ${template}`);
  }

  return new Response('OK');
}

export const POST = verifySignature(handler);
```

---

## ✅ Checklist {#checklist}

### Первоначальная настройка:

- [ ] Аккаунт Resend создан
- [ ] API Key получен
- [ ] RESEND_API_KEY в env

### Домен:

- [ ] Домен добавлен (mail.example.com)
- [ ] DNS записи настроены (SPF, DKIM)
- [ ] Домен верифицирован
- [ ] EMAIL_FROM настроен

### Интеграция:

- [ ] resend пакет установлен
- [ ] lib/resend.ts создан
- [ ] Базовая отправка работает

### Шаблоны:

- [ ] @react-email/components установлен
- [ ] Базовый layout создан
- [ ] Welcome email создан
- [ ] Reset password email создан
- [ ] Другие нужные шаблоны

### Production:

- [ ] Очередь настроена (QStash)
- [ ] Error handling
- [ ] Логирование отправок

---

**Версия:** 1.0
