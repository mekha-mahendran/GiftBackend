import nodemailer from 'nodemailer';

/**
 * GIFTPocket Email Service
 * Handles customer order confirmations and admin order alert notifications.
 */

// Create transporter dynamically based on environment or fallback
const createTransporter = () => {
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT) || 587;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });
  }

  // If no SMTP configured, we return null so we can cleanly simulate & log
  return null;
};

/**
 * Build rich HTML email template for order confirmation
 */
const generateOrderConfirmationHtml = ({ order, customer, items, pricing }) => {
  const brandName = "GIFTPocket";
  const brandTagline = "Little Things. Big Smiles. ♡";
  const orderId = order.id || `#GP-${Math.floor(100000 + Math.random() * 900000)}`;
  const orderDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const subtotal = Number(pricing?.subtotal || order.subtotal || 0);
  const discount = Number(pricing?.discountAmount || order.discount || 0);
  const shipping = Number(pricing?.shippingFee || order.shippingFee || 0);
  const total = Number(pricing?.total || order.total || (subtotal - discount + shipping));

  const itemsRows = (items || []).map((item, index) => {
    const customDetails = [];
    if (item.customization?.name) customDetails.push(`Name: "${item.customization.name}"`);
    if (item.customization?.colorTheme) customDetails.push(`Color: ${item.customization.colorTheme}`);
    if (item.customization?.frameShape) customDetails.push(`Shape: ${item.customization.frameShape}`);
    if (item.customization?.notes) customDetails.push(`Note: ${item.customization.notes}`);

    return `
      <tr style="border-bottom: 1px solid #F0D9CB;">
        <td style="padding: 14px 10px; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #332822; vertical-align: top;">
          <strong>${index + 1}. ${item.name || 'Artisan Charm'}</strong>
          ${customDetails.length > 0 ? `<div style="font-size: 12px; color: #B96F58; margin-top: 4px;">✨ ${customDetails.join(' | ')}</div>` : ''}
          ${item.isWholesale ? `<span style="font-size: 11px; color: #8F5E4E; background: #FDE8E0; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px;">B2B Wholesale</span>` : ''}
        </td>
        <td style="padding: 14px 10px; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #332822; text-align: center; vertical-align: top;">
          ${item.quantity || 1}
        </td>
        <td style="padding: 14px 10px; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #332822; text-align: right; vertical-align: top; font-weight: 600;">
          ₹${((Number(item.price) || 0) * (Number(item.quantity) || 1)).toLocaleString('en-IN')}
        </td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - ${orderId}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF4EF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #332822; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FAF4EF; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; border: 1px solid #ECD4C8; box-shadow: 0 10px 25px rgba(185, 111, 88, 0.08);" cellspacing="0" cellpadding="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #F8E8D5 0%, #F5D5C2 100%); padding: 35px 30px; text-align: center; border-bottom: 2px solid #EBC6B2;">
              <div style="font-size: 28px; font-weight: 800; letter-spacing: 1px; color: #332822; margin-bottom: 4px;">
                🎁 ${brandName}
              </div>
              <div style="font-size: 13px; color: #8F5E4E; font-style: italic; letter-spacing: 0.5px;">
                "${brandTagline}"
              </div>
            </td>
          </tr>

          <!-- Confirmation Hero -->
          <tr>
            <td style="padding: 35px 30px 20px 30px; text-align: center;">
              <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; border-radius: 50%; background-color: #D1FAE5; color: #059669; font-size: 28px; margin-bottom: 16px;">
                ✓
              </div>
              <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #332822;">
                Thank You, ${customer.fullName || 'Valued Customer'}!
              </h1>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6F5145;">
                Your order has been placed and received by our artisan team. We are handcrafting your little treasures with love! ♡
              </p>
            </td>
          </tr>

          <!-- Order Summary Meta Card -->
          <tr>
            <td style="padding: 0 30px 25px 30px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FDF7F3; border-radius: 16px; border: 1px solid #F0D9CB; padding: 18px 20px;">
                <tr>
                  <td style="font-size: 12px; color: #8F5E4E; text-transform: uppercase; font-weight: 600; padding: 4px 0;">Order Reference:</td>
                  <td style="font-size: 14px; font-weight: 700; color: #332822; text-align: right; font-family: monospace; padding: 4px 0;">${orderId}</td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: #8F5E4E; text-transform: uppercase; font-weight: 600; padding: 4px 0;">Order Date:</td>
                  <td style="font-size: 13px; color: #332822; text-align: right; padding: 4px 0;">${orderDate}</td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: #8F5E4E; text-transform: uppercase; font-weight: 600; padding: 4px 0;">Payment Method:</td>
                  <td style="font-size: 13px; color: #059669; font-weight: 600; text-align: right; padding: 4px 0;">${order.paymentMethod || 'WhatsApp Order / UPI'}</td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: #8F5E4E; text-transform: uppercase; font-weight: 600; padding: 4px 0;">Status:</td>
                  <td style="font-size: 13px; color: #B96F58; font-weight: 700; text-align: right; padding: 4px 0;">Confirmed / Preparing</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Ordered Items Table -->
          <tr>
            <td style="padding: 0 30px 25px 30px;">
              <h3 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: #332822; text-transform: uppercase; letter-spacing: 0.5px;">
                🛍️ Ordered Items
              </h3>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; border: 1px solid #F0D9CB; border-radius: 12px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #F8E8D5; text-align: left;">
                    <th style="padding: 10px; font-size: 12px; font-weight: 700; color: #6F5145; text-transform: uppercase;">Product</th>
                    <th style="padding: 10px; font-size: 12px; font-weight: 700; color: #6F5145; text-transform: uppercase; text-align: center;">Qty</th>
                    <th style="padding: 10px; font-size: 12px; font-weight: 700; color: #6F5145; text-transform: uppercase; text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRows}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Price Breakdown -->
          <tr>
            <td style="padding: 0 30px 25px 30px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 13px; line-height: 1.8;">
                <tr>
                  <td style="color: #6F5145;">Subtotal:</td>
                  <td style="text-align: right; font-weight: 600; color: #332822;">₹${subtotal.toLocaleString('en-IN')}</td>
                </tr>
                ${discount > 0 ? `
                <tr>
                  <td style="color: #059669;">Promo Discount:</td>
                  <td style="text-align: right; font-weight: 600; color: #059669;">-₹${discount.toLocaleString('en-IN')}</td>
                </tr>` : ''}
                <tr>
                  <td style="color: #6F5145;">Express Delivery:</td>
                  <td style="text-align: right; font-weight: 600; color: #332822;">${shipping === 0 ? 'FREE' : `₹${shipping}`}</td>
                </tr>
                <tr style="border-top: 2px solid #F0D9CB;">
                  <td style="padding-top: 10px; font-size: 16px; font-weight: 800; color: #332822;">Grand Total:</td>
                  <td style="padding-top: 10px; text-align: right; font-size: 18px; font-weight: 800; color: #B96F58;">₹${total.toLocaleString('en-IN')}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Delivery Address -->
          <tr>
            <td style="padding: 0 30px 25px 30px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FAF4EF; border-radius: 14px; padding: 18px; border: 1px dashed #D9A99A;">
                <tr>
                  <td>
                    <div style="font-size: 12px; font-weight: 700; color: #8F5E4E; text-transform: uppercase; margin-bottom: 6px;">
                      📍 Delivery Address
                    </div>
                    <div style="font-size: 14px; font-weight: 600; color: #332822; margin-bottom: 4px;">
                      ${customer.fullName}
                    </div>
                    <div style="font-size: 13px; color: #6F5145; line-height: 1.5;">
                      ${customer.street || ''}<br/>
                      ${customer.city || ''}${customer.state ? `, ${customer.state}` : ''} - ${customer.pincode || ''}<br/>
                      📞 <strong>Phone:</strong> ${customer.phone || 'N/A'}<br/>
                      ✉️ <strong>Email:</strong> ${customer.email || 'N/A'}
                    </div>
                    ${customer.notes ? `<div style="font-size: 12px; color: #B96F58; font-style: italic; margin-top: 6px;">📝 Note: "${customer.notes}"</div>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- WhatsApp Quick Connect CTA -->
          <tr>
            <td style="padding: 0 30px 35px 30px; text-align: center;">
              <a href="https://wa.me/919842013465?text=Hi%20GIFTPocket,%20I%20have%20an%20inquiry%20regarding%20Order%20${encodeURIComponent(orderId)}" style="display: inline-block; background-color: #25D366; color: #FFFFFF; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 50px; box-shadow: 0 4px 15px rgba(37, 211, 102, 0.3);">
                💬 Contact WhatsApp Support (+91 98420 13465)
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #332822; padding: 25px 30px; text-align: center; color: #F5E8DC; font-size: 12px; line-height: 1.6;">
              <p style="margin: 0 0 6px 0; font-weight: 600; color: #FFFFFF;">
                GIFTPocket Studio & Handcrafted Desk
              </p>
              <p style="margin: 0 0 10px 0; color: #D9A99A;">
                Indiranagar Artisan Quarter, Bengaluru, KA 560038
              </p>
              <p style="margin: 0; font-size: 11px; color: #A88F85;">
                Need help with your order? Reply directly to this email or reach us at <a href="mailto:hello@giftpocket.in" style="color: #F8E8D5; text-decoration: underline;">hello@giftpocket.in</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

/**
 * Dispatch Order Confirmation Email to customer and copy to store admin
 */
export async function sendOrderNotificationEmail({ order, customer, items, pricing }) {
  if (!customer?.email) {
    console.log(`[EmailService] Notice: No recipient email provided for order ${order?.id || 'unknown'}`);
    return {
      success: false,
      message: 'No recipient email provided'
    };
  }

  const orderId = order.id || `#GP-${Math.floor(100000 + Math.random() * 900000)}`;
  const subject = `Order Confirmed! ${orderId} - GIFTPocket Handcrafted Treasures ♡`;
  const html = generateOrderConfirmationHtml({ order, customer, items, pricing });

  const fromAddress = process.env.SMTP_FROM || `"GIFTPocket Orders" <${process.env.SMTP_USER || 'orders@giftpocket.in'}>`;
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'hello@giftpocket.in';

  const transporter = createTransporter();

  if (!transporter) {
    // Simulated delivery (Local Dev / Offline mode)
    console.log(`\n======================================================`);
    console.log(`📧 [EMAIL NOTIFICATION DISPATCHED - SIMULATED MODE]`);
    console.log(`✉️  To: ${customer.email}`);
    console.log(`📋 Admin BCC: ${adminEmail}`);
    console.log(`📦 Order: ${orderId} (₹${pricing?.total || order.total || 0})`);
    console.log(`🏷️  Subject: ${subject}`);
    console.log(`======================================================\n`);

    return {
      success: true,
      simulated: true,
      recipient: customer.email,
      orderId,
      message: `Email notification generated and recorded for ${customer.email}`
    };
  }

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: customer.email,
      bcc: adminEmail,
      subject,
      html
    });

    console.log(`✅ [EmailService] Confirmation email sent successfully to ${customer.email}:`, info.messageId);

    return {
      success: true,
      simulated: false,
      messageId: info.messageId,
      recipient: customer.email,
      orderId
    };
  } catch (err) {
    console.error(`❌ [EmailService] Failed to send email via SMTP:`, err.message);
    // Return gracefully so the checkout order does not break
    return {
      success: false,
      error: err.message,
      simulatedFallback: true,
      recipient: customer.email,
      orderId
    };
  }
}

export default {
  sendOrderNotificationEmail
};
