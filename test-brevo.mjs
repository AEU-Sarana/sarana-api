// Test Brevo email sending
import { sendEmail } from './src/shared/services/brevo-mail.service';

async function testBrevoEmail() {
    try {
        console.log('Testing Brevo email service...');
        console.log('BREVO_API_KEY:', process.env.BREVO_API_KEY ? 'SET' : 'NOT SET');
        console.log('BREVO_SENDER_EMAIL:', process.env.BREVO_SENDER_EMAIL);
        console.log('BREVO_SENDER_NAME:', process.env.BREVO_SENDER_NAME);

        const result = await sendEmail({
            to: 'yunmounsothearith@gmail.com',
            subject: 'Test Email from Stock POS',
            html: '<p>This is a test email to verify Brevo integration.</p>',
            text: 'This is a test email to verify Brevo integration.',
        });

        console.log('Email sent successfully!', result);
    } catch (error) {
        console.error('Failed to send email:', error);
        if (error.response) {
            console.error('Response data:', error.response.body);
        }
    }
}

testBrevoEmail();
