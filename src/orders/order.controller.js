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

// ✅ Stripe Checkout Session
const createCheckoutSession = async (req, res) => {
  try {
    const { items, userEmail } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items provided" });
    }

    // Assuming each item has a valid product _id
    const lineItems = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(Number(item.newPrice) * 100),
      },
      quantity: item.quantity,
    }));

    // Create the Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${CLIENT_URL}/orders/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_URL}/checkout`,
      customer_email: userEmail,
      metadata: {
        items: JSON.stringify(items),  // Store items in metadata
      },
      phone_number_collection: {
        enabled: true,  // Enable phone number collection
      },
    });
    

    res.status(200).json({ id: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ message: 'Failed to create checkout session' });
  }
};




// Validate session for the order creation thorugh stripe and for succes page redirection
const validateSession = async (req, res) => {
  const { session_id } = req.query;

  if (!session_id) {
    return res.status(400).json({ success: false, message: 'Session ID is required' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);

    console.log("Full Stripe session data:", session);

    if (session.payment_status === 'paid') {
      // Parse items from metadata (it should be a JSON string)
      const items = session.metadata.items ? JSON.parse(session.metadata.items) : [];

      if (items.length === 0) {
        return res.status(400).json({ success: false, message: 'No items found in session' });
      }

      const productIds = items.map(item => item._id);  // Extract product IDs from the items

      const orderData = {
        name: session.customer_details.name || 'Unknown Name',
        email: session.customer_email,
        address: {
          city: session.customer_details.address?.city || 'Unknown City',
          country: session.customer_details.address?.country || 'Unknown Country',
          state: session.customer_details.address?.state || 'Unknown State',
          zipcode: session.customer_details.address?.postal_code || 'Unknown Zipcode',
        },
        phone: session.customer_details.phone || '0000000000',
        productIds: productIds,  // Add the product IDs here
        totalPrice: session.amount_total / 100,  // Convert from cents to dollars
        paymentMethod: 'card',
      };

      // Create the order in the database
      const newOrder = new Order(orderData);
      await newOrder.save();

      return res.status(200).json({ success: true });
    } else {
      return res.status(400).json({ success: false, message: 'Payment was not successful' });
    }
  } catch (error) {
    console.error('Error validating Stripe session:', error);
    return res.status(500).json({ success: false, message: 'Failed to validate session' });
  }
};





module.exports = {
  createAOrder,
  getOrderByEmail,
  createCheckoutSession,
  validateSession,
};
