// Payment History JavaScript
let allPayments = [];
let filteredPayments = [];

document.addEventListener('DOMContentLoaded', function() {
    initializePaymentHistory();
});

function initializePaymentHistory() {
    console.log('💰 Initializing payment history...');
    
    // Check authentication
    const loggedInUser = sessionStorage.getItem('LoggedInUser');
    const userRole = sessionStorage.getItem('UserRole');
    
    if (!loggedInUser) {
        alert('Please login to view your payment history.');
        window.location.href = 'login.html';
        return;
    }

    // Load payment history
    loadPaymentHistory();
}

async function loadPaymentHistory() {
    try {
        console.log('📥 Loading payment history...');
        
        const response = await apiRequest('payments/my.php');
        console.log('💰 Payment history response:', response);
        
        if (response.success && response.data) {
            allPayments = response.data;
            filteredPayments = [...response.data];
            displayPayments(response.data);
            updateStatistics(response.statistics);
        } else {
            showNoPayments();
        }
    } catch (error) {
        console.error('❌ Error loading payment history:', error);
        
        // If API fails, show sample data for demo
        console.log('🔄 Falling back to sample data...');
        await generateSampleData();
    }
}



// Update the statistics function to use API data
function updateStatistics(stats) {
    document.getElementById('totalPayments').textContent = stats.total_payments;
    document.getElementById('totalAmount').textContent = `R${stats.total_amount.toFixed(2)}`;
    document.getElementById('pendingPayments').textContent = stats.pending_payments;
    document.getElementById('successRate').textContent = `${stats.success_rate}%`;
}

function displayPayments(payments) {
    const tableBody = document.getElementById('paymentsTableBody');
    const cardView = document.getElementById('paymentsCardView');
    const noPaymentsMessage = document.getElementById('noPaymentsMessage');

    if (payments.length === 0) {
        tableBody.innerHTML = '';
        cardView.innerHTML = '';
        noPaymentsMessage.style.display = 'block';
        return;
    }

    noPaymentsMessage.style.display = 'none';

    // Desktop table view
    tableBody.innerHTML = payments.map(payment => `
        <tr>
            <td>${formatDate(payment.date)}</td>
            <td>${escapeHtml(payment.description)}</td>
            <td>
                <span class="payment-type type-${payment.type}">
                    ${getPaymentTypeText(payment.type)}
                </span>
            </td>
            <td class="amount">R${payment.amount.toFixed(2)}</td>
            <td>
                <span class="payment-status status-${payment.status}">
                    ${getPaymentStatusText(payment.status)}
                </span>
            </td>
            <td>${payment.reference}</td>
            <td>
                <button class="action-btn" onclick="viewReceipt(${payment.id})">
                    📄 Receipt
                </button>
                ${payment.status === 'pending' ? `
                <button class="action-btn" onclick="retryPayment(${payment.id})" style="background: #ffc107; color: black; margin-left: 0.5rem;">
                    🔄 Retry
                </button>
                ` : ''}
            </td>
        </tr>
    `).join('');

    // Mobile card view
    cardView.innerHTML = payments.map(payment => `
        <div class="payment-card">
            <div class="payment-header">
                <div>
                    <h4 style="margin: 0 0 0.25rem 0;">${escapeHtml(payment.description)}</h4>
                    <small style="color: #666;">${formatDate(payment.date)}</small>
                </div>
                <span class="payment-status status-${payment.status}">
                    ${getPaymentStatusText(payment.status)}
                </span>
            </div>
            <div class="payment-details">
                <div class="payment-row">
                    <span>Type:</span>
                    <span class="payment-type type-${payment.type}">
                        ${getPaymentTypeText(payment.type)}
                    </span>
                </div>
                <div class="payment-row">
                    <span>Amount:</span>
                    <span class="amount">R${payment.amount.toFixed(2)}</span>
                </div>
                <div class="payment-row">
                    <span>Reference:</span>
                    <span>${payment.reference}</span>
                </div>
            </div>
            <div class="payment-actions">
                <button class="action-btn" onclick="viewReceipt(${payment.id})">
                    📄 View Receipt
                </button>
                ${payment.status === 'pending' ? `
                <button class="action-btn" onclick="retryPayment(${payment.id})" style="background: #ffc107; color: black; margin-left: 0.5rem;">
                    🔄 Retry Payment
                </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function filterPayments() {
    const typeFilter = document.getElementById('typeFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    const searchFilter = document.getElementById('searchFilter').value.toLowerCase();

    filteredPayments = allPayments.filter(payment => {
        // Type filter
        if (typeFilter !== 'all' && payment.type !== typeFilter) {
            return false;
        }

        // Status filter
        if (statusFilter !== 'all' && payment.status !== statusFilter) {
            return false;
        }

        // Date filter
        if (dateFilter !== 'all') {
            const paymentDate = new Date(payment.date);
            const now = new Date();
            let startDate;

            switch (dateFilter) {
                case 'month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                case 'quarter':
                    startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                    break;
                case 'year':
                    startDate = new Date(now.getFullYear(), 0, 1);
                    break;
            }

            if (paymentDate < startDate) {
                return false;
            }
        }

        // Search filter
        if (searchFilter && !payment.description.toLowerCase().includes(searchFilter) && 
            !payment.reference.toLowerCase().includes(searchFilter)) {
            return false;
        }

        return true;
    });

    displayPayments(filteredPayments);
    
    // Calculate filtered statistics
    const totalPayments = filteredPayments.length;
    const totalAmount = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const pendingPayments = filteredPayments.filter(p => p.status === 'pending').length;
    const completedPayments = filteredPayments.filter(p => p.status === 'completed').length;
    const successRate = totalPayments > 0 ? Math.round((completedPayments / totalPayments) * 100) : 100;

    document.getElementById('totalPayments').textContent = totalPayments;
    document.getElementById('totalAmount').textContent = `R${totalAmount.toFixed(2)}`;
    document.getElementById('pendingPayments').textContent = pendingPayments;
    document.getElementById('successRate').textContent = `${successRate}%`;
}

function viewReceipt(paymentId) {
    const payment = allPayments.find(p => p.id === paymentId);
    if (!payment) return;

    const receiptContent = document.getElementById('receiptContent');
    receiptContent.innerHTML = `
        <div style="text-align: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid #1a237e;">
            <h2 style="color: #1a237e; margin: 0 0 0.5rem 0;">UNISTAY</h2>
            <p style="margin: 0; color: #666;">Payment Receipt</p>
        </div>
        
        <div style="display: grid; gap: 1rem; margin-bottom: 1.5rem;">
            <div style="display: flex; justify-content: space-between;">
                <strong>Receipt Number:</strong>
                <span>${payment.reference}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <strong>Date:</strong>
                <span>${formatDate(payment.date)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <strong>Description:</strong>
                <span>${escapeHtml(payment.description)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <strong>Payment Type:</strong>
                <span class="payment-type type-${payment.type}">
                    ${getPaymentTypeText(payment.type)}
                </span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <strong>Status:</strong>
                <span class="payment-status status-${payment.status}">
                    ${getPaymentStatusText(payment.status)}
                </span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 1.2em; font-weight: bold; padding-top: 1rem; border-top: 2px solid #1a237e;">
                <strong>Amount Paid:</strong>
                <span style="color: #1a237e;">R${payment.amount.toFixed(2)}</span>
            </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 1rem; border-radius: 6px; margin-top: 1.5rem;">
            <p style="margin: 0; font-size: 0.9em; color: #666;">
                <strong>Note:</strong> This is an official receipt from UniStay. 
                Please keep this receipt for your records.
            </p>
        </div>
    `;

    document.getElementById('receiptModal').style.display = 'flex';
}

function closeReceiptModal() {
    document.getElementById('receiptModal').style.display = 'none';
}

function printReceipt() {
    const receiptContent = document.getElementById('receiptContent').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payment Receipt - UniStay</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 2rem; }
                .receipt-header { text-align: center; margin-bottom: 2rem; border-bottom: 2px solid #1a237e; padding-bottom: 1rem; }
                .receipt-details { margin-bottom: 2rem; }
                .receipt-footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ddd; font-size: 0.9em; color: #666; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            ${receiptContent}
            <div class="receipt-footer">
                Generated by UniStay on ${new Date().toLocaleDateString()}
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function retryPayment(paymentId) {
    const payment = allPayments.find(p => p.id === paymentId);
    if (!payment) return;

    if (confirm(`Retry payment of R${payment.amount.toFixed(2)} for ${payment.description}?`)) {
        // In a real application, this would redirect to payment gateway
        alert('Redirecting to payment gateway...');
        // window.location.href = `payment.html?amount=${payment.amount}&reference=${payment.reference}`;
    }
}

function exportToPDF() {
    alert('PDF export functionality would be implemented here. This would generate a detailed report of all payments.');
    // In a real application, this would generate and download a PDF
}

function exportToCSV() {
    if (filteredPayments.length === 0) {
        alert('No payments to export.');
        return;
    }

    const headers = ['Date', 'Description', 'Type', 'Amount', 'Status', 'Reference'];
    const csvData = filteredPayments.map(payment => [
        formatDate(payment.date),
        payment.description,
        getPaymentTypeText(payment.type),
        `R${payment.amount.toFixed(2)}`,
        getPaymentStatusText(payment.status),
        payment.reference
    ]);

    const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unistay-payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    alert('CSV file downloaded successfully!');
}

function showNoPayments(message = 'No payment history found.') {
    const tableBody = document.getElementById('paymentsTableBody');
    const cardView = document.getElementById('paymentsCardView');
    const noPaymentsMessage = document.getElementById('noPaymentsMessage');

    tableBody.innerHTML = '';
    cardView.innerHTML = '';
    noPaymentsMessage.style.display = 'block';
}

// Sample data generator for fallback
async function generateSampleData() {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const samplePayments = [
        {
            id: 1,
            date: '2024-01-15',
            description: 'Deposit - Sunshine Apartments',
            type: 'deposit',
            amount: 4500.00,
            status: 'completed',
            reference: 'DEP-001-2024',
            property: 'Sunshine Apartments',
            booking_id: 101
        },
        {
            id: 2,
            date: '2024-01-20',
            description: 'Monthly Rent - Sunshine Apartments',
            type: 'monthly',
            amount: 1500.00,
            status: 'completed',
            reference: 'RENT-001-2024',
            property: 'Sunshine Apartments',
            booking_id: 101
        },
        {
            id: 3,
            date: '2024-02-20',
            description: 'Monthly Rent - Sunshine Apartments',
            type: 'monthly',
            amount: 1500.00,
            status: 'completed',
            reference: 'RENT-002-2024',
            property: 'Sunshine Apartments',
            booking_id: 101
        },
        {
            id: 4,
            date: '2024-03-20',
            description: 'Monthly Rent - Sunshine Apartments',
            type: 'monthly',
            amount: 1500.00,
            status: 'pending',
            reference: 'RENT-003-2024',
            property: 'Sunshine Apartments',
            booking_id: 101
        },
        {
            id: 5,
            date: '2024-01-10',
            description: 'Service Fee - UniStay',
            type: 'service',
            amount: 225.00,
            status: 'completed',
            reference: 'SVC-001-2024',
            property: 'UniStay Platform',
            booking_id: null
        },
        {
            id: 6,
            date: '2024-02-05',
            description: 'Deposit - City View Residence',
            type: 'deposit',
            amount: 6000.00,
            status: 'completed',
            reference: 'DEP-002-2024',
            property: 'City View Residence',
            booking_id: 102
        }
    ];

    allPayments = samplePayments;
    filteredPayments = [...samplePayments];
    displayPayments(samplePayments);
    
    // Calculate statistics for sample data
    const totalPayments = samplePayments.length;
    const totalAmount = samplePayments.reduce((sum, payment) => sum + payment.amount, 0);
    const pendingPayments = samplePayments.filter(p => p.status === 'pending').length;
    const completedPayments = samplePayments.filter(p => p.status === 'completed').length;
    const successRate = totalPayments > 0 ? Math.round((completedPayments / totalPayments) * 100) : 100;

    document.getElementById('totalPayments').textContent = totalPayments;
    document.getElementById('totalAmount').textContent = `R${totalAmount.toFixed(2)}`;
    document.getElementById('pendingPayments').textContent = pendingPayments;
    document.getElementById('successRate').textContent = `${successRate}%`;
}

// Utility functions
function getPaymentTypeText(type) {
    const typeMap = {
        'deposit': 'Deposit',
        'monthly': 'Monthly Rent',
        'service': 'Service Fee'
    };
    return typeMap[type] || type;
}

function getPaymentStatusText(status) {
    const statusMap = {
        'completed': 'Completed',
        'pending': 'Pending',
        'failed': 'Failed'
    };
    return statusMap[status] || status;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.clear();
        window.location.href = 'login.html';
    }
}

// Make functions available globally
window.viewReceipt = viewReceipt;
window.closeReceiptModal = closeReceiptModal;
window.printReceipt = printReceipt;
window.retryPayment = retryPayment;
window.exportToPDF = exportToPDF;
window.exportToCSV = exportToCSV;
window.filterPayments = filterPayments;
window.logout = logout;