import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;

const base = "https://api-m.sandbox.paypal.com";
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.use(express.static('public'));

// Define routes
app.get('/', (req, res) => {
  res.render('index', { title: 'Welcome Famous Guy' });
});

app.get('/about', (req, res) => {
  res.render('about', { title: 'About Us' });
});

app.get('/contact', (req, res) => {
  res.render('contact', { title: 'Contact Us' });
});

app.get('/payment', (req, res) => {
  const service = req.query.service ? JSON.parse(req.query.service) : null;
  res.render('payment', { title: 'Payment Page', service });
});

app.post('/services', (req, res) => {
  const selectedOption = req.body.option;
  const options = {
    1: { name: 'Basic Marketing on Social Media', cost: 0.10 },
    2: { name: 'Social Media and Advertisement Assistance', cost: 0.20 },
    3: { name: 'Social Media, Managers, and Advertisement Assistance', cost: 0.30 },
    4: { name: 'Social Media, Managers, Advertisement Assistance, and PRs', cost: 0.40 },
  };

  const selectedService = options[selectedOption];

  if (!selectedService) {
    res.redirect('/');
  } else {
    res.render('services', { title: 'Selected Service', service: selectedService });
  }
});

const connectedMetamaskUsers = [];
app.post('/connect/metamask', (req, res) => {
  const { metamaskAccount } = req.body;
  console.log(metamaskAccount);
});

app.post('/payment-confirmed', (req, res) => {
  res.render('payment-confirmed', { title: 'Payment Confirmed' });
}); 

app.get('/payment-confirmed', (req, res) => {
  res.render('payment-confirmed', { title: 'Payment Confirmed' });
});

const generateAccessToken = async () => {
  try {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      throw new Error("MISSING_API_CREDENTIALS");
    }
    const auth = Buffer.from(
      PAYPAL_CLIENT_ID + ":" + PAYPAL_CLIENT_SECRET,
    ).toString("base64");
    
    const response = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      body: "grant_type=client_credentials",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Failed to generate Access Token:", error);
  }
};

app.post('/create-paypal-order', async (req, res) => {
  try {
    const { service, returnUrl } = req.body;  // Extract returnUrl from the request body
    const orderID = await createPayPalOrder(service, returnUrl);
    res.json({ orderID });
  } catch (error) {
    console.error("Failed to create PayPal order:", error);
    res.status(500).json({ error: "Failed to create PayPal order." });
  }
});

const createPayPalOrder = async (service, returnURL) => {
  try {
    const accessToken = await generateAccessToken();
    const url = `${base}/v2/checkout/orders`;
    const payload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "EUR",
            value: service.cost.toString(),
          },
        },
      ],
      application_context: {
        return_url: returnURL,
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    

    if (data.id) {
      return data.id;
    } else {
      throw new Error("Failed to create PayPal order.");
    }
  } catch (error) {
    console.error("Failed to create PayPal order:", error);
    throw error;
  }
};
app.post('/create-paypal-order', async (req, res) => {
  try {
    const { service, returnUrl } = req.body;
    const orderID = await createPayPalOrder(service, returnUrl);
    res.json({ orderID });
  } catch (error) {
    console.error("Failed to create PayPal order:", error);
    res.status(500).json({ error: "Failed to create PayPal order." });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
