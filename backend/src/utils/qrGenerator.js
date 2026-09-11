const QRCode = require('qrcode');
const querystring = require('querystring');

function generateUpiUri(upiId, payeeName, amount, orderId) {
  const params = {
    pa: upiId,
    pn: payeeName,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: `Order #${orderId} Grocery Payment`
  };
  return `upi://pay?${querystring.stringify(params)}`;
}

async function generateQrBase64(dataString) {
  try {
    const qrBase64 = await QRCode.toDataURL(dataString, {
      errorCorrectionLevel: 'M',
      margin: 4,
      width: 300
    });
    return qrBase64;
  } catch (err) {
    throw new Error(`QR generation failed: ${err.message}`);
  }
}

module.exports = {
  generateUpiUri,
  generateQrBase64
};
