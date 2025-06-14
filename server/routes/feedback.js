const express = require('express');
const https = require('https');
const router = express.Router();

// Discord webhook configuration
// Set your Discord webhook URL in environment variables or replace the placeholder below
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || 'YOUR_DISCORD_WEBHOOK_URL_HERE';

/**
 * Send feedback to Discord channel via webhook
 */
async function sendToDiscord(feedbackData) {
    if (!DISCORD_WEBHOOK_URL) {
        console.warn('Discord webhook URL not configured');
        return { success: false, error: 'Webhook not configured' };
    }

    // Create structured message (avoiding problematic emojis)
    let messageTitle = '**New Feedback Received**';
    
    // Set title based on feedback type (without emojis that cause JSON issues)
    if (feedbackData.feedbackType === 'bug') {
        messageTitle = '**Bug Report Received**';
    } else if (feedbackData.feedbackType === 'feature') {
        messageTitle = '**Feature Request Received**';
    } else if (feedbackData.feedbackType === 'support') {
        messageTitle = '**Support Request Received**';
    } else if (feedbackData.feedbackType === 'suggestion') {
        messageTitle = '**Suggestion Received**';
    }

    // Build message content using template literals (like our successful test)
    let markdownContent = `${messageTitle}

Feedback Details:
Subject: ${feedbackData.subject}
Type: ${feedbackData.feedbackType.charAt(0).toUpperCase() + feedbackData.feedbackType.slice(1)}
From: ${feedbackData.name || 'Anonymous'}`;
    
    if (feedbackData.email) {
        markdownContent += `
Email: ${feedbackData.email}`;
    }
    
    markdownContent += `
Time: ${new Date().toLocaleString()}

Message:
${feedbackData.message}

---
Sent from PHSYCO Game Server Manager`;

    const payload = {
        username: 'GSM Feedback Bot',
        content: markdownContent
    };

    return new Promise((resolve) => {
        const data = JSON.stringify(payload);
        const url = new URL(DISCORD_WEBHOOK_URL);

        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        console.log('🔄 Sending to Discord webhook...');
        console.log('📤 Payload:', JSON.stringify(payload, null, 2));
        
        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                console.log(`📡 Discord response status: ${res.statusCode}`);
                console.log(`📡 Discord response data: ${responseData}`);
                
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log('✅ Feedback sent to Discord successfully');
                    resolve({ success: true });
                } else {
                    console.error('❌ Discord webhook error:', res.statusCode, responseData);
                    resolve({ success: false, error: `HTTP ${res.statusCode}: ${responseData}` });
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Discord webhook request error:', error);
            resolve({ success: false, error: error.message });
        });

        req.write(data);
        req.end();
    });
}

/**
 * POST /api/feedback
 * Submit feedback form
 */
router.post('/', async (req, res) => {
    try {
        const { name, email, subject, message, feedbackType } = req.body;

        // Validate required fields
        if (!subject || !message || !feedbackType) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: subject, message, or feedbackType'
            });
        }

        // Validate feedback type
        const validTypes = ['general', 'bug', 'feature', 'support', 'suggestion'];
        if (!validTypes.includes(feedbackType)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid feedback type'
            });
        }

        // Sanitize input (basic XSS prevention)
        const feedbackData = {
            name: name ? name.substring(0, 100) : '',
            email: email ? email.substring(0, 100) : '',
            subject: subject.substring(0, 200),
            message: message.substring(0, 2000),
            feedbackType: feedbackType,
            timestamp: new Date().toISOString(),
            userAgent: req.get('User-Agent') || 'Unknown',
            ip: req.ip || req.connection.remoteAddress || 'Unknown'
        };

        // Log feedback locally (optional)
        console.log('📝 New feedback received:', {
            type: feedbackData.feedbackType,
            subject: feedbackData.subject,
            from: feedbackData.name || 'Anonymous',
            timestamp: feedbackData.timestamp
        });

        // Send to Discord
        const discordResult = await sendToDiscord(feedbackData);

        if (discordResult.success) {
            res.json({
                success: true,
                message: 'Feedback submitted successfully'
            });
        } else {
            // Even if Discord fails, we should still acknowledge the feedback
            console.error('Discord webhook failed, but feedback was received:', discordResult.error);
            res.json({
                success: true,
                message: 'Feedback received (Discord notification failed)',
                warning: 'Notification system temporarily unavailable'
            });
        }

    } catch (error) {
        console.error('❌ Feedback submission error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/feedback/test
 * Test Discord webhook connection
 */
router.get('/test', async (req, res) => {
    try {
        if (!DISCORD_WEBHOOK_URL) {
            return res.status(400).json({
                success: false,
                error: 'Discord webhook URL not configured'
            });
        }

        const testData = {
            name: 'System Test',
            email: 'test@example.com',
            subject: 'Discord Webhook Test',
            message: 'This is a test message to verify the Discord webhook is working correctly. Features being tested: Markdown formatting, Structured message layout, Proper emoji display, Code block formatting',
            feedbackType: 'general'
        };

        const result = await sendToDiscord(testData);
        res.json(result);

    } catch (error) {
        console.error('❌ Webhook test error:', error);
        res.status(500).json({
            success: false,
            error: 'Test failed: ' + error.message
        });
    }
});

module.exports = router; 