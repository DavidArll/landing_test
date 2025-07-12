require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const bodyParser = require('body-parser');
const path = require('path');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.json());

app.post('/create-checkout-session', async (req, res) => {
  const { email, product } = req.body;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'test.pdf'
        },
        unit_amount: 500
      },
      quantity: 1
    }],
    mode: 'payment',
    success_url: `${process.env.DOMAIN}/success`,
    cancel_url: `${process.env.DOMAIN}/cancel`,
    customer_email: email,
    metadata: {
      product
    }
  });

  res.json({ id: session.id });
});

app.post('/webhook', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_email;
    const product = session.metadata.product;

    await fetch("https://n8n-jr4i.onrender.com/webhook/confirmacion-pago", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, producto: product })
    });
  }

  res.status(200).json({ received: true });
});

app.listen(4242, () => {
  console.log("Servidor en puerto 4242");
});
