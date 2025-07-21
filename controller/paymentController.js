const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Cart = require('../models/Cart');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const pdf = require('html-pdf'); // ADDED: Import html-pdf library
dotenv.config();


let productInfo = {};
let userData = {};
let userInfo;
let totalAmount;
const instance = new Razorpay({
  key_id: process.env.RAZORPAY_API_KEY,
  key_secret: process.env.RAZORPAY_API_SECRET,
});

const checkout = async (req, res) => {
  try {
    const { amount, userId, productDetails, userDetails } = req.body
    totalAmount = Number(amount)
    userInfo = userId
    productInfo = JSON.parse(productDetails)
    userData = JSON.parse(userDetails)

    const options = {
      amount: Number(amount * 100),
      currency: "INR",
    };
    const order = await instance.orders.create(options);

    res.status(200).json({
      success: true,
      order
    });

  } catch (error) {
    console.error("Error during checkout:", error); // Added logging
    res.status(500).send("Internal Server Error during checkout"); // More specific error response
  }
};

const paymentVerification = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_API_SECRET)
    .update(body.toString())
    .digest("hex");

  const isAuthentic = expectedSignature === razorpay_signature;

  try {
    if (isAuthentic) {
      // --- START PDF GENERATION & EMAIL ATTACHMENT LOGIC (NEW ADDITION) ---

      // Define the HTML content for the PDF receipt (can be the same as email HTML)
      // This HTML is designed to be self-contained for PDF generation
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
                      <td>${product.productId.name}</td>
                      <td>${product.quantity}</td>
                      <td>₹${product.productId.price}</td>
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
                <p><a href="https://e-ARISTAYA.vercel.app/" target="_blank">ARISTAYA.com</a></p>
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
        // Generate PDF to a buffer
        pdfBuffer = await new Promise((resolve, reject) => {
          pdf.create(receiptHtml, pdfOptions).toBuffer((err, buffer) => {
            if (err) {
              console.error("Error creating PDF:", err); // Log PDF creation error
              return reject(err);
            }
            resolve(buffer);
          });
        });
      } catch (pdfError) {
        console.error("Failed to generate PDF for email attachment (continuing without attachment):", pdfError);
        // If PDF generation fails, set buffer to null so email still sends without attachment
        pdfBuffer = null; 
      }

      // Nodemailer transport setup (your existing code)
      const transport = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.email",
        port: 465,
        auth: {
          user: process.env.EMAIL,
          pass: process.env.EMAIL_PASSWORD
        },
      })

      // Nodemailer mail options (modified to include attachment)
      const mailOptions = {
        from: process.env.EMAIL,
        to: userData.userEmail,
        subject: `ARISTAYA Order Confirmation - Order ID: ${razorpay_order_id}`, // More descriptive subject
        html: receiptHtml, // Use the same HTML for email body
        attachments: pdfBuffer ? [ // Only attach if pdfBuffer was successfully created
          {
            filename: `ARISTAYA_Receipt_${razorpay_payment_id}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ] : [] // If no PDF buffer, send no attachments
      };

      // Send the email
      transport.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending email:", error);
        } else {
          console.log("Email sent: " + info.response);
        }
      });
      // --- END PDF GENERATION & EMAIL ATTACHMENT LOGIC ---


      // Your existing database operations (UNCHANGED)
      await Payment.create({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        user: userInfo,
        productData: productInfo,
        userData,
        totalAmount
      });
      const deleteCart = await Cart.deleteMany({ user: userInfo }) // Ensure userInfo is the correct user ID

      // Your existing redirection (UNCHANGED)
      res.redirect(`${process.env.PAYMENT_SUCCESS}?paymentId=${razorpay_payment_id}`);
    }
    else {
      res.status(400).json({
        success: false,
        message: "Payment verification failed." // Added message for clarity
      });
    }
  }
  catch (error) {
    console.error("Error during payment verification:", error); // Added logging
    res.status(500).send("Internal Server Error during payment verification"); // More specific error response
  }
}

// NEW FUNCTION: To fetch payment details by paymentId (UNCHANGED from previous step)
const getPaymentDetails = async (req, res) => {
    try {
        const { paymentId } = req.params; // Get paymentId from URL parameters

        // Find the payment record using razorpay_payment_id
        // Populate product details if productData stores only IDs and you need full product objects
        const paymentRecord = await Payment.findOne({ razorpay_payment_id: paymentId })
            .populate({
                path: 'productData.productId', // Path to populate
                select: 'name price images' // Select only necessary fields to avoid sending too much data
            }); 

        if (!paymentRecord) {
            return res.status(404).json({ success: false, message: 'Payment details not found.' });
        }

        // Return the necessary data
        res.status(200).json({
            success: true,
            paymentDetails: {
                productData: paymentRecord.productData,
                totalAmount: paymentRecord.totalAmount,
                shippingCoast: 100, // Assuming fixed shipping cost, or fetch from record if stored
                userData: paymentRecord.userData, // Include user data if needed on frontend
                razorpay_order_id: paymentRecord.razorpay_order_id,
                razorpay_payment_id: paymentRecord.razorpay_payment_id
            }
        });

    } catch (error) {
        console.error("Error fetching payment details:", error);
        res.status(500).send("Internal Server Error fetching payment details");
    }
};


module.exports = { checkout, paymentVerification, getPaymentDetails } // Export the new function
