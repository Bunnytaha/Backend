const express = require("express");
const router = express.Router();
const { createAOrder, getOrderByEmail, createCheckoutSession , validateSession } = require("./order.controller");

// Create order endpoin
router.post("/", createAOrder);

// Create checkout session for Stripe
router.post("/create-checkout-session", createCheckoutSession);  // <-- Add this route

// Get orders by user email
router.get("/email/:email", getOrderByEmail);
// Add this to your `order.routes.js`
router.get("/validate-session", validateSession);


module.exports = router;
