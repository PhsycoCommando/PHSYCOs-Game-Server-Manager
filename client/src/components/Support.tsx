import React, { useState } from 'react';
import './Support.css';
import { DONATION_LINKS, SOCIAL_LINKS } from '../config/donation-links';

const Support: React.FC = () => {
  const [feedbackData, setFeedbackData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    feedbackType: 'general'
  });

  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFeedbackData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log('Submitting feedback:', feedbackData);
      
      // Send feedback to backend
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Feedback submitted successfully');
        setSubmitted(true);
        
        // Reset form after 3 seconds
        setTimeout(() => {
          setSubmitted(false);
          setFeedbackData({
            name: '',
            email: '',
            subject: '',
            message: '',
            feedbackType: 'general'
          });
        }, 3000);
      } else {
        throw new Error(result.error || 'Failed to submit feedback');
      }
      
    } catch (error) {
      console.error('❌ Error submitting feedback:', error);
      alert(`Failed to submit feedback: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="support-container">
      <div className="support-header">
        <h2>Support & Feedback</h2>
        <p>Help us improve the Game Server Manager or show your support!</p>
      </div>

      <div className="support-sections">
        {/* Donation Section */}
        <div className="donation-section">
          <div className="donation-header">
            <h3>💝 Support Development</h3>
            <p>If you find this tool useful, consider supporting its development!</p>
          </div>
          
          <div className="donation-options">
            <div className="donation-card">
              <h4>☕ Buy me a coffee</h4>
              <p>Small contribution to keep the developer caffeinated</p>
              <button className="donate-btn coffee" onClick={() => {
                window.open(DONATION_LINKS.coffee, '_blank');
              }}>
                Donate $5
              </button>
            </div>
            
            <div className="donation-card">
              <h4>🍕 Buy me lunch</h4>
              <p>Medium contribution for continued development</p>
              <button className="donate-btn lunch" onClick={() => {
                window.open(DONATION_LINKS.lunch, '_blank');
              }}>
                Donate $15
              </button>
            </div>
            
            <div className="donation-card">
              <h4>🚀 Fuel development</h4>
              <p>Larger contribution for new features and improvements</p>
              <button className="donate-btn development" onClick={() => {
                window.open(DONATION_LINKS.development, '_blank');
              }}>
                Donate $50
              </button>
            </div>
            
            <div className="donation-card">
              <h4>💰 Custom amount</h4>
              <p>Choose your own contribution amount</p>
              <button className="donate-btn custom" onClick={() => {
                window.open(DONATION_LINKS.custom, '_blank');
              }}>
                Custom Donation
              </button>
            </div>
          </div>
          
          <div className="donation-info">
            <p><strong>All donations go towards:</strong></p>
            <ul>
              <li>🔧 Continued development and maintenance</li>
              <li>🎮 Adding support for more game servers</li>
              <li>🚀 New features and improvements</li>
              <li>🐛 Bug fixes and performance optimizations</li>
              <li>📚 Better documentation and tutorials</li>
            </ul>
          </div>
        </div>

        {/* Feedback Section */}
        <div className="feedback-section">
          <div className="feedback-header">
            <h3>💬 Send Feedback</h3>
            <p>Found a bug? Have a feature request? Let us know!</p>
          </div>

          {submitted ? (
            <div className="feedback-success">
              <div className="success-icon">✅</div>
              <h4>Thank you for your feedback!</h4>
              <p>We appreciate your input and will review it soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="feedback-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Name (Optional)</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={feedbackData.name}
                    onChange={handleInputChange}
                    placeholder="Your name"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="email">Email (Optional)</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={feedbackData.email}
                    onChange={handleInputChange}
                    placeholder="your.email@example.com"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="feedbackType">Feedback Type</label>
                <select
                  id="feedbackType"
                  name="feedbackType"
                  value={feedbackData.feedbackType}
                  onChange={handleInputChange}
                  required
                >
                  <option value="general">General Feedback</option>
                  <option value="bug">Bug Report</option>
                  <option value="feature">Feature Request</option>
                  <option value="support">Support Request</option>
                  <option value="suggestion">Suggestion</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="subject">Subject</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={feedbackData.subject}
                  onChange={handleInputChange}
                  placeholder="Brief description of your feedback"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="message">Message</label>
                <textarea
                  id="message"
                  name="message"
                  value={feedbackData.message}
                  onChange={handleInputChange}
                  placeholder="Please provide detailed information about your feedback..."
                  rows={6}
                  required
                />
              </div>

              <button type="submit" className="submit-btn">
                Send Feedback
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Additional Info */}
      <div className="support-footer">
        <div className="github-section">
          <h4>🐙 Open Source</h4>
          <p>This project is open source! Check out the code, report issues, or contribute:</p>
          <a href={SOCIAL_LINKS.github} className="github-link" target="_blank" rel="noopener noreferrer">
            View on GitHub
          </a>
        </div>
        
        <div className="social-section">
          <h4>🌐 Connect</h4>
          <p>Follow for updates and announcements:</p>
          <div className="social-links">
            <a href={SOCIAL_LINKS.discord} className="social-link discord" target="_blank" rel="noopener noreferrer">Discord</a>
            <a href={SOCIAL_LINKS.twitter} className="social-link youtube" target="_blank" rel="noopener noreferrer">YouTube</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support; 