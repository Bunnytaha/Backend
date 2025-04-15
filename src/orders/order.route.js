const express = require("express");
const router = express.Router();
const { createAOrder, getOrderByEmail, createCheckoutSession } = require("./order.controller");

// Create order endpoin
router.post("/", createAOrder);

// Create checkout session for Stripe
router.post("/create-checkout-session", createCheckoutSession);  // <-- Add this route

// Get orders by user email
router.get("/email/:email", getOrderByEmail);


module.exports = router;
