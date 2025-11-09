class ReviewSystem {
    constructor() {
        this.currentPropertyId = null;
    }
    
    async loadReviews(propertyId) {
        try {
            this.currentPropertyId = propertyId;
            
            const response = await fetch(`http://localhost/UniStay---Website/backend/api/reviews/read.php?property_id=${propertyId}`);
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const result = await response.json();
            
            if (result.error) throw new Error(result.error);
            
            this.displayReviews(result.reviews, result.average_rating);
            
        } catch (err) {
            console.error('Error loading reviews:', err);
            this.showError('Error loading reviews: ' + err.message);
        }
    }
    
    displayReviews(reviews, averageRating) {
    const reviewsContainer = document.getElementById('reviewsContainer');
    if (!reviewsContainer) return;
    
    // Handle case where reviews might be in different response structure
    if (!reviews || (Array.isArray(reviews) && reviews.length === 0)) {
        reviewsContainer.innerHTML = `
            <div class="no-reviews">
                <h3>No Reviews Yet</h3>
                <p>Be the first to review this property!</p>
            </div>
        `;
        return;
    }
    
    let reviewsHTML = '';
    
    // Show average rating if available
    if (averageRating && averageRating.average) {
        reviewsHTML += `
            <div class="average-rating">
                <h3>Overall Rating</h3>
                <div class="rating-summary">
                    <span class="rating-stars">${this.generateStars(averageRating.average)}</span>
                    <span class="rating-value">${averageRating.average} out of 5</span>
                    <span class="rating-count">(${averageRating.total_reviews} reviews)</span>
                </div>
            </div>
        `;
    }
    
    reviewsHTML += '<div class="reviews-list">';
    
    // Ensure reviews is an array
    const reviewsArray = Array.isArray(reviews) ? reviews : [];
    
    reviewsArray.forEach(review => {
        reviewsHTML += `
            <div class="review-item">
                <div class="review-header">
                    <div class="reviewer-info">
                        <strong>${review.tenant_name || 'Anonymous'}</strong>
                        <span class="review-date">${review.review_date || new Date(review.created_at).toLocaleDateString()}</span>
                    </div>
                    <div class="review-rating">
                        ${this.generateStars(review.rating)}
                    </div>
                </div>
                <div class="review-content">
                    <p>${review.comment || 'No comment provided.'}</p>
                </div>
                ${review.landlord_response ? `
                    <div class="landlord-response">
                        <strong>Response from ${review.landlord_name || 'Landlord'}:</strong>
                        <p>${review.landlord_response}</p>
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    reviewsHTML += '</div>';
    
    reviewsContainer.innerHTML = reviewsHTML;
}
    
    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let stars = '';
        
        // Full stars
        for (let i = 0; i < fullStars; i++) {
            stars += '⭐';
        }
        
        // Half star
        if (hasHalfStar) {
            stars += '⭐';
        }
        
        // Empty stars
        for (let i = 0; i < emptyStars; i++) {
            stars += '☆';
        }
        
        return stars;
    }
    
    showReviewForm(bookingId, propertyTitle) {
        const formHTML = `
            <div class="review-form-overlay">
                <div class="review-form-container">
                    <h3>Review Your Stay</h3>
                    <p>How was your experience at ${propertyTitle}?</p>
                    
                    <form id="reviewForm">
                        <input type="hidden" id="bookingId" value="${bookingId}">
                        
                        <div class="form-group">
                            <label>Rating</label>
                            <div class="star-rating">
                                ${[1,2,3,4,5].map(i => `
                                    <input type="radio" id="star${i}" name="rating" value="${i}">
                                    <label for="star${i}" title="${i} star${i !== 1 ? 's' : ''}">⭐</label>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="reviewComment">Your Review</label>
                            <textarea id="reviewComment" name="comment" required minlength="10" 
                                      placeholder="Tell us about your experience..."></textarea>
                            <small>Minimum 10 characters</small>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" onclick="this.closest('.review-form-overlay').remove()">Cancel</button>
                            <button type="submit">Submit Review</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', formHTML);
        
        // Add form submission handler
        document.getElementById('reviewForm').addEventListener('submit', this.submitReview.bind(this));
        
        // Add star rating interaction
        this.setupStarRating();
    }
    
    setupStarRating() {
        const stars = document.querySelectorAll('.star-rating input');
        stars.forEach((star, index) => {
            star.addEventListener('change', function() {
                // Update visual state of stars
                stars.forEach((s, i) => {
                    s.nextElementSibling.style.opacity = i <= index ? '1' : '0.3';
                });
            });
        });
    }
    
    async submitReview(e) {
        e.preventDefault();
        
        const form = e.target;
        const button = form.querySelector('button[type="submit"]');
        const originalText = button.textContent;
        
        const reviewData = {
            booking_id: form.bookingId.value,
            rating: form.rating.value,
            comment: form.reviewComment.value
        };
        
        if (!reviewData.rating) {
            showNotification('Please select a rating', 'error');
            return;
        }
        
        // Show loading state
        button.disabled = true;
        button.textContent = 'Submitting...';
        
        try {
            const response = await fetch('http://localhost/UniStay---Website/backend/api/reviews/create.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(reviewData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showNotification('Review submitted successfully!', 'success');
                
                // Remove the form
                form.closest('.review-form-overlay').remove();
                
                // Reload reviews if we're on a property page
                if (this.currentPropertyId) {
                    this.loadReviews(this.currentPropertyId);
                }
                
            } else {
                throw new Error(result.error);
            }
            
        } catch (err) {
            console.error('Error submitting review:', err);
            showNotification('Error submitting review: ' + err.message, 'error');
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    }
    
    showError(message) {
        const container = document.getElementById('reviewsContainer');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    ${message}
                </div>
            `;
        }
    }
}

// Global instance
window.reviewSystem = new ReviewSystem();

// Star rating CSS (should be added to your CSS file)
const reviewStyles = `
.star-rating {
    display: flex;
    flex-direction: row-reverse;
    justify-content: flex-end;
}

.star-rating input {
    display: none;
}

.star-rating label {
    font-size: 2rem;
    cursor: pointer;
    transition: opacity 0.2s;
}

.star-rating label:hover,
.star-rating label:hover ~ label {
    opacity: 1 !important;
}

.review-form-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.review-form-container {
    background: white;
    padding: 2rem;
    border-radius: 10px;
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
}

.rating-stars {
    font-size: 1.2rem;
}

.review-item {
    border-bottom: 1px solid #eee;
    padding: 1rem 0;
}

.review-item:last-child {
    border-bottom: none;
}

.landlord-response {
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 5px;
    margin-top: 1rem;
    border-left: 4px solid #1a237e;
}
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = reviewStyles;
document.head.appendChild(styleSheet);