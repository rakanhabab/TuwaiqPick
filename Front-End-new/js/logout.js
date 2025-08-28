// Simple logout function
function logout() {
    console.log('Logout function called');
    
    // Clear user data from localStorage
    localStorage.removeItem('current_user');
    localStorage.removeItem('twq_cart');
    
    console.log('User data cleared, redirecting to login page...');
    
    // Redirect to login page
    window.location.href = 'login.html';
}

// Export to window
window.logout = logout;
