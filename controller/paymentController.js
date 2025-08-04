const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment'); // Assuming this is your Mongoose Payment model
const Cart = require('../models/Cart');
const nodemailer = require('nodemailer');
const pdf = require('html-pdf');
const dotenv = require('dotenv');
dotenv.config();

const { ApiError } = require('../utils/apiError');
const { sendErrorResponse } = require('../utils/errorMiddleware');
const mongoose = require('mongoose'); 

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_API_KEY,
  key_secret: process.env.RAZORPAY_API_SECRET,
});

const checkout = async (req, res) => {
  try {
    const { amount, userId, productDetails, userDetails } = req.body;

    console.log("Checkout initiated for user:", userId, "Amount:", amount);

    if (!amount || !userId || !productDetails || !userDetails) {
        throw new ApiError(400, "Missing crucial data for checkout: amount, userId, productDetails, userDetails.");
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID format.");
    }

    const parsedProductDetails = JSON.parse(productDetails);
    const parsedUserDetails = JSON.parse(userDetails);
    const totalAmount = Number(amount);

    if (isNaN(totalAmount) || totalAmount <= 0) {
        throw new ApiError(400, "Invalid amount provided for checkout.");
    }
    if (!Array.isArray(parsedProductDetails) || parsedProductDetails.length === 0) {
        throw new ApiError(400, "Product details must be a non-empty array.");
    }
    
    if (typeof parsedUserDetails !== 'object' || parsedUserDetails === null || !parsedUserDetails.userEmail) {
        throw new ApiError(400, "Invalid user details provided (missing email or not an object).");
    }

    const options = {
      amount: totalAmount * 100, // amount in smallest currency unit (paise)
      currency: "INR",
    };
    const order = await instance.orders.create(options);
    console.log("Razorpay order created:", order.id);

    // Create a new payment record in the database with 'pending' status
    const newPaymentRecord = await Payment.create({
        razorpay_order_id: order.id, 
        user: userId,
        productData: parsedProductDetails,
        userData: parsedUserDetails,
        totalAmount: totalAmount,
        status: 'pending' // Initial status
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
  console.log("--> Razorpay callback received:", req.body); // Log the entire incoming body

  // --- Handle Failed Payments ---
  if (req.body.error) {
    const { order_id, description, reason } = req.body.error.metadata;
    const errorDetails = req.body.error.description || "Unknown payment error";

    console.error(`Payment failed callback detected for order ID: ${order_id}. Reason: ${reason}, Description: ${description}`);

    try {
      const paymentRecord = await Payment.findOne({ razorpay_order_id: order_id });
      if (paymentRecord) {
        paymentRecord.status = 'failed';
        // Assuming your Payment schema has a 'failedReason' field. If not, you'll need to add it.
        paymentRecord.failedReason = errorDetails; 
        await paymentRecord.save();
        console.log(`Payment record for order ${order_id} updated to 'failed'.`);
      } else {
        console.warn(`Payment record not found for failed order ID: ${order_id}.`);
      }
      // Redirect to a payment failure page on your frontend
      // Ensure process.env.PAYMENT_FAILURE is configured to your frontend's failure route
      return res.redirect(`${process.env.FRONTEND_URL_1}/paymentfailure?orderId=${order_id}&status=failed&reason=${encodeURIComponent(errorDetails)}`);

    } catch (error) {
      console.error("Error updating status for failed payment in DB:", error);
      return sendErrorResponse(res, error, "Internal Server Error during failed payment processing.");
    }
  }

  // --- Handle Successful Payments (Existing Logic) ---
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.error("Missing Razorpay verification parameters for successful payment.");
      return sendErrorResponse(res, new ApiError(400, "Missing Razorpay verification parameters."));
  }

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_API_SECRET)
    .update(body.toString())
    .digest("hex");

  const isAuthentic = expectedSignature === razorpay_signature;
  console.log(`Signature verification result: ${isAuthentic ? 'Authentic' : 'Mismatch'}`);


  try {
    const paymentRecord = await Payment.findOne({ razorpay_order_id: razorpay_order_id }).populate({
                                      path: 'productData.productId',
                                      select: 'name price'
                                  });

    if (!paymentRecord) {
        console.error(`Payment record not found for order ID: ${razorpay_order_id}`);
        throw new ApiError(404, "Payment record not found for this order ID.");
    }

    const userInfo = paymentRecord.user;
    const productInfo = paymentRecord.productData;
    const userData = paymentRecord.userData;
    const totalAmount = paymentRecord.totalAmount;

    if (isAuthentic) {
      paymentRecord.razorpay_payment_id = razorpay_payment_id;
      paymentRecord.razorpay_signature = razorpay_signature;
      paymentRecord.status = 'completed'; 
      await paymentRecord.save(); 
      console.log(`Payment record for order ${razorpay_order_id} updated to 'completed'.`);

      const receiptHtml = `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Order Confirmation - ARISTAYA</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                font-size: 14px;
                line-height: 1.6;
                color: #333; /* Dark text for print */
                background-color: #ffffff; /* White background for print */
                margin: 0;
                padding: 20px;
              }
              .container {
                max-width: 700px;
                margin: 20px auto;
                background-color: #ffffff;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
                border: 1px solid #ddd;
              }
              h1 {
                font-size: 28px;
                margin-bottom: 20px;
                color: #1a1a1a;
                text-align: center;
                border-bottom: 2px solid #FFD700; /* Gold accent */
                padding-bottom: 10px;
              }
              h2 {
                font-size: 20px;
                margin-top: 25px;
                margin-bottom: 10px;
                color: #444;
              }
              p {
                margin: 5px 0;
                color: #555;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
                margin-bottom: 20px;
              }
              th, td {
                text-align: left;
                padding: 12px;
                border-bottom: 1px solid #eee;
              }
              th {
                background-color: #f2f2f2;
                font-weight: bold;
                color: #333;
              }
              .total-row td {
                background-color: #f0f0f0;
                font-weight: bold;
                color: #1a1a1a;
              }
              .thanks {
                font-size: 16px;
                margin-top: 30px;
                text-align: center;
                color: #555;
              }
              .signature {
                margin-top: 40px;
                text-align: center;
                color: #555;
              }
              .signature a {
                color: #FFD700; /* Gold color for link */
                text-decoration: none;
                font-weight: bold;
              }
              .header-logo {
                text-align: center;
                margin-bottom: 20px;
              }
              .header-logo span {
                font-family: Arial, sans-serif; /* Fallback for Cooper Black in PDF */
                font-size: 36px;
                color: #1a1a1a;
              }
              .order-details-summary {
                background-color: #f5f5f5;
                padding: 15px;
                border-radius: 5px;
                margin-bottom: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header-logo">
                <span>ARISTAYA</span>
              </div>
              <h1>Order Confirmation</h1>
              <div class="order-details-summary">
                <p><strong>Order ID:</strong> ${razorpay_order_id}</p>
                <p><strong>Payment ID:</strong> ${razorpay_payment_id}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <p>Dear <strong>${userData.firstName} ${userData.lastName}</strong>,</p>
              <p>Thank you for your recent purchase on our website. We have received your payment and have processed your order.</p>

              <h2>Order Details</h2>
              <table>
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Quantity</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${productInfo.map((product) => `
                    <tr>
                      <td>${product.productId?.name || 'N/A'}</td>
                      <td>${product.quantity}</td>
                      <td>₹${product.productId?.price || 'N/A'}</td>
                    </tr>
                  `).join('')}
                  <tr>
                    <td>Shipping Charge</td>
                    <td></td>
                    <td>₹100</td>
                  </tr>
                  <tr class="total-row">
                    <td>Total</td>
                    <td></td>
                    <td>₹${totalAmount}</td>
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

      const pdfOptions = {
        format: 'A4',
        orientation: 'portrait',
        border: '10mm',
        header: {
          height: '15mm',
          contents: '<div style="text-align: center; font-size: 10px; color: #888;">ARISTAYA Order Receipt</div>'
        },
        footer: {
          height: '15mm',
          contents: '<div style="text-align: center; font-size: 10px; color: #888;">Page {{page}} of {{pages}}</div>'
        }
      };

      let pdfBuffer;
      try {
        pdfBuffer = await new Promise((resolve, reject) => {
          pdf.create(receiptHtml, pdfOptions).toBuffer((err, buffer) => {
            if (err) {
              console.error("Error creating PDF:", err);
              return reject(err);
            }
            resolve(buffer);
          });
        });
      } catch (pdfError) {
        console.error("Failed to generate PDF for email attachment (continuing without attachment):", pdfError);
        pdfBuffer = null;
      }


      const transport = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.email",
        port: 465,
        auth: {
          user: process.env.EMAIL,
          pass: process.env.EMAIL_PASSWORD
        },
      })


      const mailOptions = {
        from: process.env.EMAIL,
        to: userData.userEmail,
        subject: `ARISTAYA Order Confirmation - Order ID: ${razorpay_order_id}`,
        html: receiptHtml,
        attachments: pdfBuffer ?
          [
            {
              filename: `ARISTAYA_Receipt_${razorpay_payment_id}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf'
            }
          ] : []
      };


      transport.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending email:", error);
        } else {
          console.log("Email sent: " + info.response);
        }
      });

      
      const deleteCart = await Cart.deleteMany({ user: userInfo });
      console.log("User cart cleared.");

      res.redirect(`${process.env.PAYMENT_SUCCESS}?paymentId=${razorpay_payment_id}`);
    }
    else {
      // This block is for signature mismatch on a seemingly successful payment callback
      console.error("Payment verification failed: Signature mismatch for order:", razorpay_order_id);
      paymentRecord.status = 'failed';
      paymentRecord.failedReason = "Signature mismatch during verification"; // Add this detail
      await paymentRecord.save();
      // Redirect to a failure page, as this is an unexpected scenario for a "successful" callback
      return res.redirect(`${process.env.FRONTEND_URL_1}/paymentfailure?orderId=${razorpay_order_id}&status=failed&reason=${encodeURIComponent("Payment verification failed: Signature mismatch")}`);
    }
  }
  catch (error) {
    console.error("Internal Server Error during payment verification:", error);
    sendErrorResponse(res, error, "Internal Server Error during payment verification.");
  }
}

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

        res.status(200).json({
            success: true,
            paymentDetails: {
                productData: paymentRecord.productData,
                totalAmount: paymentRecord.totalAmount,
                shippingCoast: 100, // Hardcoded, ensure this is correct
                userData: paymentRecord.userData,
                razorpay_order_id: paymentRecord.razorpay_order_id,
                razorpay_payment_id: paymentRecord.razorpay_payment_id,
                status: paymentRecord.status,
                failedReason: paymentRecord.failedReason || null // Include failed reason if available
            }
        });

    } catch (error) {
        console.error("Internal Server Error fetching payment details:", error);
        sendErrorResponse(res, error, "Internal Server Error fetching payment details.");
    }
};


module.exports = { checkout, paymentVerification, getPaymentDetails }
