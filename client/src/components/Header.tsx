import React, { useState } from 'react';
import './Header.css';
import { DONATION_LINKS } from '../config/donation-links';

const Header: React.FC = () => {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackData, setFeedbackData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    feedbackType: 'general'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    setIsSubmitting(true);
    
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
        
        // Reset form after 3 seconds and close modal
        setTimeout(() => {
          setSubmitted(false);
          setShowFeedbackModal(false);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeFeedbackModal = () => {
    setShowFeedbackModal(false);
    setSubmitted(false);
    setFeedbackData({
      name: '',
      email: '',
      subject: '',
      message: '',
      feedbackType: 'general'
    });
  };

  return (
    <>
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">🎮</span>
          <h1>PHSYCO's Game Server Manager</h1>
        </div>
        <div className="header-actions">
          <button 
            className="header-btn feedback-btn"
            onClick={() => setShowFeedbackModal(true)}
          >
            💬 FEEDBACK
          </button>
          <button 
            className="header-btn donate-btn"
            onClick={() => window.open(DONATION_LINKS.custom, '_blank')}
          >
            ❤️ DONATE
          </button>
        </div>
      </header>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="feedback-modal-overlay" onClick={closeFeedbackModal}>
          <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
            <div className="feedback-modal-header">
              <h3>💬 Send Feedback</h3>
              <button className="close-btn" onClick={closeFeedbackModal}>×</button>
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
                    rows={4}
                    required
                  />
                </div>

                <div className="form-actions">
                  <button type="button" onClick={closeFeedbackModal} className="cancel-btn">
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn" disabled={isSubmitting}>
                    {isSubmitting ? 'Sending...' : 'Send Feedback'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Header; 