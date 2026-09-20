const nodemailer = require('nodemailer');

// Create transporter — uses Gmail. Configure EMAIL_USER and EMAIL_PASS in .env
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send blood request alert email to a donor
const sendBloodRequestAlert = async ({ donorEmail, donorName, bloodGroup, urgencyLevel, hospitalName, hospitalCity, unitsRequired, patientCondition, requestId }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email not configured — skipping email notification');
    return;
  }

  const urgencyEmoji = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' };
  const transporter = createTransporter();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8f9fa; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #c0392b, #8e1a12); padding: 32px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 1.8rem; }
        .header p { margin: 8px 0 0; opacity: 0.9; }
        .body { padding: 32px; }
        .alert-box { background: #fff5f5; border-left: 5px solid #c0392b; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .blood-group { font-size: 2.5rem; font-weight: 700; color: #c0392b; }
        .detail-row { display: flex; margin: 8px 0; }
        .detail-label { color: #888; width: 140px; font-size: 0.9rem; }
        .detail-value { color: #333; font-weight: 600; font-size: 0.9rem; }
        .btn { display: inline-block; background: #c0392b; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 1rem; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px 32px; text-align: center; color: #aaa; font-size: 0.8rem; border-top: 1px solid #eee; }
        .urgency { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: 700; font-size: 0.9rem; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div style="font-size:3rem">🩸</div>
          <h1>Emergency Blood Request</h1>
          <p>Your help is needed urgently</p>
        </div>
        <div class="body">
          <p>Dear <strong>${donorName}</strong>,</p>
          <p>A hospital near you urgently needs blood. You are a compatible donor. Please respond as soon as possible.</p>

          <div class="alert-box">
            <div class="blood-group">${bloodGroup}</div>
            <div style="margin-top:16px">
              <div class="detail-row">
                <span class="detail-label">Hospital</span>
                <span class="detail-value">${hospitalName}${hospitalCity ? `, ${hospitalCity}` : ''}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Urgency</span>
                <span class="detail-value">${urgencyEmoji[urgencyLevel] || '🔴'} ${urgencyLevel?.toUpperCase()}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Units Needed</span>
                <span class="detail-value">${unitsRequired} unit(s)</span>
              </div>
              ${patientCondition ? `
              <div class="detail-row">
                <span class="detail-label">Patient Condition</span>
                <span class="detail-value">${patientCondition}</span>
              </div>` : ''}
            </div>
          </div>

          <p>Please log in to the Blood Donation Platform and click <strong>"I Can Donate"</strong> to confirm your response.</p>

          <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/donor/dashboard" class="btn">
            Respond Now →
          </a>

          <p style="color:#888; font-size:0.85rem; margin-top:20px">
            If you are not able to donate, please ignore this email. Another donor will be contacted.
          </p>
        </div>
        <div class="footer">
          <p>Blood Donation Platform — NNM College of Engineering</p>
          <p>You received this because you are a registered donor with blood group ${bloodGroup}.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"Blood Donation Platform 🩸" <${process.env.EMAIL_USER}>`,
      to: donorEmail,
      subject: `🚨 Urgent: ${bloodGroup} Blood Needed at ${hospitalName}`,
      html
    });
    console.log(`Email sent to ${donorEmail}`);
  } catch (err) {
    console.error(`Failed to send email to ${donorEmail}:`, err.message);
  }
};

// Send confirmation to donor after they respond
const sendDonationConfirmation = async ({ donorEmail, donorName, hospitalName, bloodGroup }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const transporter = createTransporter();
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8f9fa; margin: 0; }
        .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #27ae60, #1e8449); padding: 32px; text-align: center; color: white; }
        .body { padding: 32px; }
        .footer { background: #f8f9fa; padding: 16px 32px; text-align: center; color: #aaa; font-size: 0.8rem; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div style="font-size:3rem">✅</div>
          <h1 style="margin:8px 0">Thank You, ${donorName}!</h1>
          <p style="opacity:0.9">Your response has been recorded</p>
        </div>
        <div class="body">
          <p>You have confirmed your willingness to donate <strong>${bloodGroup}</strong> blood at <strong>${hospitalName}</strong>.</p>
          <p>The hospital will contact you shortly with further instructions. Please keep your phone accessible.</p>
          <p style="color:#27ae60; font-weight:700; font-size:1.1rem">🩸 You may be saving a life today.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
          <p style="color:#888; font-size:0.85rem">Remember to stay hydrated and eat a light meal before donation.</p>
        </div>
        <div class="footer">Blood Donation Platform — NNM College of Engineering</div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"Blood Donation Platform 🩸" <${process.env.EMAIL_USER}>`,
      to: donorEmail,
      subject: `✅ Donation Confirmed — ${hospitalName}`,
      html
    });
  } catch (err) {
    console.error('Confirmation email failed:', err.message);
  }
};

module.exports = { sendBloodRequestAlert, sendDonationConfirmation };
