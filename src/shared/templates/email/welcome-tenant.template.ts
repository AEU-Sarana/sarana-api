export interface WelcomeTenantTemplateData {
    fullName: string;
    businessName: string;
    username: string;
    password?: string;
}

export function getWelcomeTenantEmailTemplate(data: WelcomeTenantTemplateData) {
    const { fullName, businessName, username, password } = data;

    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; padding: 20px 0; background-color: #f8f9fa; border-radius: 8px 8px 0 0;">
            <h1 style="color: #1f8f3a; margin: 0;">Chlat-POS</h1>
        </div>
        
        <div style="padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #444; margin-top: 0;">Welcome to Chlat-POS!</h2>
            <p>Hello <strong>${fullName}</strong>,</p>
            <p>Your business account for <strong>${businessName}</strong> has been successfully created.</p>
            
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #1f8f3a33;">
                <p style="margin: 0; font-size: 15px;"><strong>Username:</strong> <span style="color: #1f8f3a;">${username}</span></p>
                ${password ? `
                <p style="margin: 12px 0 0 0; font-size: 15px;"><strong>Temporary Password:</strong> <code style="background: #e9f5ec; padding: 3px 6px; border-radius: 4px; color: #1f8f3a; font-family: monospace; font-weight: bold;">${password}</code></p>
                ` : ''}
            </div>
            
            <div style="background-color: #fff9db; padding: 15px; border-radius: 6px; border: 1px solid #ffe066; margin-top: 25px;">
                <p style="margin: 0; font-size: 0.9em; color: #856404;">
                    <strong>Security Tip:</strong> For your security, we strongly recommend that you change your password immediately after your first login.
                </p>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
            
            <div style="text-align: center; font-size: 0.8em; color: #999;">
                <p style="margin-bottom: 5px;">&copy; ${new Date().getFullYear()} Chlat-POS. All rights reserved.</p>
                <p>If you didn't expect this email, please ignore it.</p>
            </div>
        </div>
    </div>
  `.trim();

    const text = `
Welcome to Chlat-POS!

Hello ${fullName},

Your account for ${businessName} has been created.

Username: ${username}
${password ? `Password: ${password}` : ''}

For security reasons, we recommend you change your password after logging in for the first time.
  `.trim();

    return { html, text };
}
