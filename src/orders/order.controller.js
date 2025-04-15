const Order = require('./order.model');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ✅ Create Order (COD)
const createAOrder = async (req, res) => {
  try {
    const { name, email, address, phone, productIds, totalPrice, paymentMethod } = req.body;

    const newOrder = new Order({
      name,
      email,
      address,
      phone,
      productIds,
      totalPrice,
      paymentMethod,
    });

    await newOrder.save();
    res.status(201).json({ message: 'Order created successfully', order: newOrder });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Failed to create order' });
  }
};

// ✅ Get Orders by Email
const getOrderByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const orders = await Order.find({ email }).populate('productIds');
    res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching orders by email:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
};

const createCheckoutSession = async (req, res) => {
  try {
    const { items, userEmail, name, phone, address, productIds, totalPrice, paymentMethod } = req.body;

    console.log("🔥 Incoming Stripe session request");
    console.log("📦 Items:", items);
    console.log("📧 Email:", userEmail);

    if (!items || items.length === 0) {
      console.log("❌ No items provided");
      return res.status(400).json({ message: "No items provided" });
    }

    const lineItems = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(Number(item.newPrice) * 100), // Multiply price by 100 to get cents
      },
      quantity: item.quantity,
    }));

    console.log("✅ Stripe line items:", lineItems);

    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${CLIENT_URL}/checkout?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_URL}/checkout`,
      customer_email: userEmail,
      metadata: {
        name,
        phone,
        address: JSON.stringify(address),
        productIds: JSON.stringify(productIds),
        totalPrice,
        paymentMethod,
      },
    });

    // Respond with session ID
    res.status(200).json({ id: session.id });
  } catch (err) {
    console.error("Error creating Stripe checkout session", err);
    res.status(500).json({ message: "Failed to create checkout session" });
  }
};

module.exports = {
  createAOrder,
  getOrderByEmail,
  createCheckoutSession,

};
