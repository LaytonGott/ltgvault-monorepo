// Unified Resume Builder Pro checkout function
// Use this everywhere an "Upgrade to Pro" button appears

export async function redirectToResumeProCheckout(): Promise<void> {
  try {
    // Get API key if user is logged in
    const apiKey = typeof window !== 'undefined' ? localStorage.getItem('ltgv_api_key') : null;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    // Don't pass email - Stripe will collect it during checkout
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers,
      body: JSON.stringify({ tool: 'resumebuilder' }),
    });

    const data = await response.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      throw new Error(data.error || 'Failed to create checkout session');
    }
  } catch (error) {
    console.error('Checkout error:', error);
    window.location.href = '/pricing.html';
  }
}
