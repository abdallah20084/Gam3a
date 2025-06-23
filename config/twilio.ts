// config/twilio.ts
import twilio from 'twilio';

// Load environment variables (already handled by Next.js in API routes, but good for explicit typing)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_SERVICE_SID;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken) {
  throw new Error('Twilio ACCOUNT_SID and AUTH_TOKEN must be defined in .env.local');
}

// Initialize the Twilio client
const client = twilio(accountSid, authToken);

// Export the client and other necessary Twilio configurations
export { client as twilioClient, verifyServiceSid, twilioPhoneNumber };