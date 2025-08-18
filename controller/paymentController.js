const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Cart = require('../models/Cart'); 
const User = require('../models/User');
const Product = require('../models/Product'); 
const nodemailer = require('nodemailer');
const pdf = require('html-pdf');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const { ApiError } = require('../utils/apiError');
const { sendErrorResponse } = require('../utils/errorMiddleware');

const SHIPPING_CHARGE = 100;

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_API_KEY,
  key_secret: process.env.RAZORPAY_API_SECRET,
});

const checkout = async (req, res) => {
  try {
    const { userId, productDetails, userDetails } = req.body; 
    console.log("Checkout initiated for user:", userId);

    if (!userId || !productDetails || !userDetails) {
        throw new ApiError(400, "Missing crucial data for checkout: userId, productDetails, userDetails.");
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID format.");
    }

    const parsedProductDetails = JSON.parse(productDetails);
    const parsedUserDetails = JSON.parse(userDetails);
    
    const subTotal = parsedProductDetails.reduce((acc, curr) => {
        const price = curr.productId?.price || curr.price || 0;
        const quantity = curr.quantity || 0;
        return acc + (price * quantity);
    }, 0);

    if (isNaN(subTotal) || subTotal <= 0) {
        throw new ApiError(400, "Invalid subtotal amount. Please ensure your cart has items with valid prices.");
    }
    if (!Array.isArray(parsedProductDetails) || parsedProductDetails.length === 0) {
        throw new ApiError(400, "Product details must be a non-empty array.");
    }
    
    if (typeof parsedUserDetails !== 'object' || parsedUserDetails === null || !parsedUserDetails.userEmail) {
        throw new ApiError(400, "Invalid user details provided (missing email or not an object).");
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found for checkout.");
    }

    let finalAmount = subTotal + SHIPPING_CHARGE;
    let shippingStatus = 'Regular';

    if (user.isFreeShippingEligible) {
        finalAmount = subTotal;
        shippingStatus = 'Free Shipping';
        console.log(`User ${userId} is eligible for free shipping. Final amount is ${finalAmount}`);
    }

    const options = {
      amount: finalAmount * 100,
      currency: "INR",
    };
    const order = await instance.orders.create(options);
    console.log("Razorpay order created:", order.id);

    const newPaymentRecord = await Payment.create({
        razorpay_order_id: order.id, 
        user: userId,
        productData: parsedProductDetails,
        userData: parsedUserDetails,
        totalAmount: finalAmount,
        shippingStatus: shippingStatus,
        status: 'pending'
    });
    console.log("Payment record created in DB with status 'pending':", newPaymentRecord._id);

    res.status(200).json({
      success: true,
      order,
    });

  } catch (error) {
    console.error("Error during checkout process:", error);
    sendErrorResponse(res, error, "Internal Server Error during checkout.");
  }
};

const paymentVerification = async (req, res) => {
  console.log("--> Razorpay webhook received.");
  
  const razorpaySignatureHeader = req.headers['x-razorpay-signature'];
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!razorpaySignatureHeader || !webhookSecret) {
      console.error("Missing webhook signature or secret. Aborting verification.");
      return res.status(400).send('Webhook signature verification failed.');
  }

  const rawBody = req.body.toString();
  
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  if (expectedSignature !== razorpaySignatureHeader) {
      console.error("Webhook signature verification failed!");
      return res.status(400).send('Webhook signature verification failed.');
  }

  console.log("Webhook signature verified successfully.");
  let webhookPayload;
  try {
      webhookPayload = JSON.parse(rawBody);
      console.log("Webhook Payload (parsed):", webhookPayload.event);
  } catch (e) {
      console.error("Error parsing raw webhook body to JSON:", e);
      return res.status(400).send('Invalid webhook payload format.');
  }

  switch (webhookPayload.event) {
    
    case 'payment.failed':
      console.log("Received payment.failed webhook. Updating payment status.");
      const failedOrderId = webhookPayload.payload.payment.entity.order_id;
      const failedPaymentId = webhookPayload.payload.payment.entity.id;
      const failedReason = webhookPayload.payload.payment.entity.error_description || "Payment failed for unknown reason.";

      try {
        const paymentRecord = await Payment.findOne({ razorpay_order_id: failedOrderId });
        if (paymentRecord) {
          paymentRecord.status = 'failed';
          paymentRecord.razorpay_payment_id = failedPaymentId;
          paymentRecord.failedReason = failedReason;
          await paymentRecord.save();
          console.log(`Payment record for order ${failedOrderId} updated to 'failed' via webhook.`);
        } else {
          console.warn(`Payment record not found for failed order ID ${failedOrderId} from webhook.`);
        }
      } catch (error) {
        console.error("Error processing payment.failed webhook:", error);
      }
      break;

    case 'payment.captured':
      console.log("Received payment.captured webhook. Updating payment status and processing order.");
      const capturedOrderId = webhookPayload.payload.payment.entity.order_id;
      const capturedPaymentId = webhookPayload.payload.payment.entity.id;
      
      try {
        const paymentRecord = await Payment.findOne({ razorpay_order_id: capturedOrderId })
            .populate({
                path: 'productData.productId',
                select: 'name price'
            });

        if (paymentRecord) {
          paymentRecord.status = 'completed';
          paymentRecord.razorpay_payment_id = capturedPaymentId;
          paymentRecord.failedReason = null;
          await paymentRecord.save();
          console.log(`Payment record for order ${capturedOrderId} updated to 'completed' via webhook.`);

          const userInfo = paymentRecord.user;
          const productInfo = paymentRecord.productData;
          const userData = paymentRecord.userData;
          const totalAmount = paymentRecord.totalAmount;
          
          const subtotal = productInfo.reduce((acc, curr) => {
              const price = curr.productId?.price || 0;
              const quantity = curr.quantity || 0;
              return acc + (price * quantity);
          }, 0);
          
          const displayedShippingCost = totalAmount - subtotal;
          
          const receiptHtml = `<!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <title>Order Confirmation - ARISTAYA</title>
                <style>
                  body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333; background-color: #ffffff; margin: 0; padding: 20px; }
                  .container { max-width: 700px; margin: 20px auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 0 15px rgba(0, 0, 0, 0.6); border: 1px solid #ddd; }
                  h1 { font-size: 28px; margin-bottom: 20px; color: #1a1a1a; text-align: center; border-bottom: 2px solid #FFD700; padding-bottom: 10px; }
                  h2 { font-size: 20px; margin-top: 25px; margin-bottom: 10px; color: #444; }
                  p { margin: 5px 0; color: #555; }
                  table { width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px; }
                  th, td { text-align: left; padding: 12px; border-bottom: 1px solid #eee; }
                  th { background-color: #f2f2f2; font-weight: bold; color: #333; }
                  .total-row td { background-color: #f0f0f0; font-weight: bold; color: #1a1a1a; }
                  .thanks { font-size: 16px; margin-top: 30px; text-align: center; color: #555; }
                  .signature { margin-top: 40px; text-align: center; color: #555; }
                  .signature a { color: #FFD700; text-decoration: none; font-weight: bold; }
                  .header-logo { text-align: center; margin-bottom: 20px; }
                  .header-logo span { font-family: Arial, sans-serif; font-size: 36px; color: #1a1a1a; }
                  .order-details-summary { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header-logo"><span>ARISTAYA</span></div>
                  <h1>Order Confirmation</h1>
                  <div class="order-details-summary">
                    <p><strong>Order ID:</strong> ${capturedOrderId}</p>
                    <p><strong>Payment ID:</strong> ${capturedPaymentId}</p>
                    <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <p>Dear <strong>${userData.firstName} ${userData.lastName}</strong>,</p>
                  <p>Thank you for your recent purchase on our website. We have received your payment and have processed your order.</p>
                  <h2>Order Details</h2>
                  <table>
                    <thead>
                      <tr>
                        <th>Product Name</th>
                        <th style="text-align: right;">Quantity</th>
                        <th style="text-align: right;">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${productInfo.map((product) => `
                        <tr>
                          <td>${product.productId?.name || 'N/A'} (₹${product.productId?.price || 'N/A'})</td>
                          <td style="text-align: right;">${product.quantity}</td>
                          <td style="text-align: right;">₹${product.productId?.price * product.quantity || 'N/A'}</td>
                        </tr>
                      `).join('')}
                       <tr>
                        <td>Subtotal</td>
                        <td style="text-align: right;"></td>
                        <td style="text-align: right;">₹${subtotal}</td>
                      </tr>
                      <tr>
                        <td>Shipping Charge</td>
                        <td style="text-align: right;"></td>
                        <td style="text-align: right;">₹${displayedShippingCost}</td>
                      </tr>
                      <tr class="total-row">
                        <td>Total</td>
                        <td style="text-align: right;"></td>
                        <td style="text-align: right;">₹${totalAmount}</td>
                      </tr>
                    </tbody>
                  </table>
                  <h2>Shipping Address</h2>
                  <p>${userData.firstName} ${userData.lastName}</p>
                  <p>${userData.address}</p>
                  <p>${userData.city}-${userData.zipCode}</p>
                  <p>${userData.userState}</p>
                  <p>Phone: ${userData.phoneNumber || 'N/A'}</p>
                  <p>Email: ${userData.userEmail || 'N/A'}</p>
                  <p class="thanks">Thank you for choosing ARISTAYA. If you have any questions or concerns, please don't hesitate to contact us.</p>
                  <div class="signature">
                    <p>Best regards,</p>
                    <p><a href="${process.env.FRONTEND_URL_1}" target="_blank">https://aristaya.vercel.app</a></p>
                  </div>
                </div>
              </body>
            </html>`;

          const pdfOptions = { format: 'A4', orientation: 'portrait', border: '10mm' };
          let pdfBuffer;
          try {
            pdfBuffer = await new Promise((resolve, reject) => {
              pdf.create(receiptHtml, pdfOptions).toBuffer((err, buffer) => {
                if (err) return reject(err);
                resolve(buffer);
              });
            });
          } catch (pdfError) {
            console.error("Failed to generate PDF for email attachment (continuing without attachment):", pdfError);
            pdfBuffer = null;
          }

          const transport = nodemailer.createTransport({
            service: "gmail", host: "smtp.gmail.email", port: 465,
            auth: { user: process.env.EMAIL, pass: process.env.EMAIL_PASSWORD },
          })

          const mailOptions = {
            from: process.env.EMAIL,
            to: userData.userEmail,
            subject: `ARISTAYA Order Confirmation - Order ID: ${capturedOrderId}`,
            html: receiptHtml,
            attachments: pdfBuffer ? [ { filename: `ARISTAYA_Receipt_${capturedPaymentId}.pdf`, content: pdfBuffer, contentType: 'application/pdf' } ] : []
          };

          transport.sendMail(mailOptions, (error, info) => {
            if (error) { console.error("Error sending email:", error); } else { console.log("Email sent: " + info.response); }
          });

          const deleteCart = await Cart.deleteMany({ user: userInfo });
          console.log("User cart cleared.");

        } else {
          console.warn(`Payment record not found for captured order ID ${capturedOrderId} from webhook.`);
        }
      } catch (error) {
        console.error("Error processing payment.captured webhook:", error);
      }
      break;

    case 'order.paid':
        console.log("Received order.paid webhook. Ignoring as we handle payment.captured.");
        break;

    default:
        console.log(`Received unhandled webhook event: ${webhookPayload.event}`);
        break;
  }
  
  return res.status(200).send('Webhook received and processed.');
};

const getPaymentDetails = async (req, res) => {
    const { paymentId } = req.params;
    try {
        if (!paymentId) {
            throw new ApiError(400, "Payment ID is required.");
        }

        const paymentRecord = await Payment.findOne({ razorpay_payment_id: paymentId })
            .populate({
                path: 'productData.productId',
                select: 'name price images'
            });

        if (!paymentRecord) {
            console.error(`Payment details not found for payment ID: ${paymentId}`);
            throw new ApiError(404, 'Payment details not found.');
        }

        const subtotal = paymentRecord.productData.reduce((acc, curr) => {
            const price = curr.productId?.price || 0;
            const quantity = curr.quantity || 0;
            return acc + (price * quantity);
        }, 0);

        const displayedShippingCost = (paymentRecord.totalAmount || 0) - subtotal;

        res.status(200).json({
            success: true,
            paymentDetails: {
                productData: paymentRecord.productData,
                totalAmount: paymentRecord.totalAmount,
                shippingCoast: displayedShippingCost, 
                userData: paymentRecord.userData,
                razorpay_order_id: paymentRecord.razorpay_order_id,
                razorpay_payment_id: paymentRecord.razorpay_payment_id,
                status: paymentRecord.status,
                failedReason: paymentRecord.failedReason || null
            }
        });

    } catch (error) {
        console.error("Internal Server Error fetching payment details:", error);
        sendErrorResponse(res, error, "Internal Server Error fetching payment details.");
    }
};

// NEW: Controller function for reordering a previous order
const reorderController = async (req, res) => {
    try {
        const { orderId } = req.body;
        const userId = req.user.id;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            throw new ApiError(400, "Invalid order ID format.");
        }

        const order = await Payment.findOne({ _id: orderId, user: userId })
            .populate({
                path: 'productData.productId',
                select: 'name price stock'
            });

        if (!order) {
            throw new ApiError(404, "Order not found or not owned by user.");
        }

        // --- CORRECTED LOGIC START ---
        // Find all existing cart documents for the user
        const existingCartItems = await Cart.find({ user: userId });

        const itemsAdded = [];
        const outOfStockItems = [];

        for (const item of order.productData) {
            const product = item.productId;
            if (!product || product.stock < item.quantity) {
                outOfStockItems.push(product?.name || 'Unknown Product');
                continue; // Skip if product is out of stock or doesn't exist
            }

            // Find if the product already exists as a document in the user's cart collection
            const existingCartItem = existingCartItems.find(
                cartItem => cartItem.productId.toString() === product._id.toString()
            );

            if (existingCartItem) {
                // Product exists, update quantity on that specific document
                existingCartItem.quantity += item.quantity;
                await existingCartItem.save();
            } else {
                // Product doesn't exist, create a new cart document
                const newCartItem = new Cart({
                    user: userId,
                    productId: product._id,
                    quantity: item.quantity,
                });
                await newCartItem.save();
            }
            itemsAdded.push(product.name);
        }
        // --- CORRECTED LOGIC END ---

        let message = `Ordered items have been added to your cart.`;
        if (outOfStockItems.length > 0) {
            message += ` Note: The following items could not be added as they are out of stock: ${outOfStockItems.join(', ')}.`;
        }

        res.status(200).json({ success: true, message });

    } catch (error) {
        console.error("Error during reorder process:", error);
        sendErrorResponse(res, error, "Internal Server Error during reorder process.");
    }
};


module.exports = { checkout, paymentVerification, getPaymentDetails, reorderController };