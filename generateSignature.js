const crypto = require("crypto");

const razorpay_order_id = "order_RyrfR3eywmRBnF";
const razorpay_payment_id = "pay_test123456";
const secret = "oHsVwDJOOZm72wYXcM4QSE7w";

const body = razorpay_order_id + "|" + razorpay_payment_id;

const signature = crypto
  .createHmac("sha256", secret)
  .update(body)
  .digest("hex");

console.log(signature);
